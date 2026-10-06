import { formatInsightBasis, parseDonorInsight, parseGrantReport } from 'src/lib/ai-guardrails';
import { resolveNextStepHealth } from 'src/lib/cultivation';
import { summarizeDonorGiving, summarizeFunding } from 'src/lib/donations';
import {
  buildDonorEvidence,
  buildGrantEvidence,
  rankInsightCandidates,
  type InsightCandidate,
  type RecentGift,
} from 'src/lib/evidence';
import { findGrantDataIssues } from 'src/lib/grant';
import { toNumber } from 'src/lib/money';

import { dateOnly, DONATION_SELECTION, money, toDonationRow, unitsOf } from 'src/services/mappers';
import { type RollupDeps } from 'src/services/rollups';
import { COLLECTION, fetchAll, fetchOne, updateRecord, type RecordNode } from 'src/services/repo';

// The part of Twenty's runAgent this app uses. The real function is passed in by
// the logic functions; tests pass a stub.
export type AgentRunner = (input: {
  agentUniversalIdentifier: string;
  prompt: string;
}) => Promise<{ result: object | null; error: string | null; success: boolean }>;

export type AiDeps = RollupDeps & {
  runAgent: AgentRunner;
  donorAgentId: string;
  reportAgentId: string;
  includeFreeText: boolean;
  now: Date;
};

export type InsightOutcome =
  | { status: 'stored'; warnings: string[] }
  | { status: 'skipped' | 'rejected' | 'failed' | 'not-found'; reason: string };

const MONEY = { amountMicros: true, currencyCode: true } as const;

const DONOR_PROMPT_HEADER =
  'Analyze this donor record and reply with JSON only, in the format you were given. Use only the facts below.';
const REPORT_PROMPT_HEADER =
  'Draft the narrative for the next funder report from this grant record and reply with JSON only, in the format you were given. Use only the facts below.';

export const generateDonorInsight = async (deps: AiDeps, personId: string): Promise<InsightOutcome> => {
  const person = await fetchOne(deps.client, COLLECTION.person, personId, {
    contactTypes: true,
    outreachPermission: true,
    givingStatus: true,
    volunteerHours: true,
    lastVolunteeredOn: true,
  });
  if (!person) return { status: 'not-found', reason: 'That person could not be found.' };

  // Checked here, before any data is gathered or sent anywhere.
  if (person.outreachPermission === 'DO_NOT_CONTACT') {
    return { status: 'skipped', reason: 'This person asked not to be contacted, so no AI insight was created.' };
  }

  const [donations, plans] = await Promise.all([
    fetchAll(
      deps.client,
      COLLECTION.donation,
      { ...DONATION_SELECTION, campaign: { name: true } },
      { donorId: { eq: personId } },
    ),
    fetchAll(
      deps.client,
      COLLECTION.cultivationPlan,
      { stage: true, askAmount: MONEY, nextStep: true, nextStepDate: true, purpose: true, updatedAt: true },
      { donorId: { eq: personId } },
    ),
  ]);

  const rows = donations.records.map(toDonationRow);
  const giving = summarizeDonorGiving(rows, deps.asOf, deps.currency);

  const recentGifts: RecentGift[] = donations.records
    .map((node) => ({ node, row: toDonationRow(node) }))
    .filter(({ row }) => row.amountUnits !== null)
    .sort((a, b) => (b.row.giftDate ?? '').localeCompare(a.row.giftDate ?? ''))
    .map(({ node, row }) => ({
      date: row.giftDate,
      amount: row.amountUnits as number,
      giftType: row.giftType,
      status: row.status,
      campaign: node.campaign?.name ?? null,
    }));

  const openPlan = plans.records
    .filter((plan) => ['IDENTIFICATION', 'QUALIFICATION', 'CULTIVATION', 'SOLICITATION'].includes(plan.stage))
    .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))[0];

  const evidence = buildDonorEvidence({
    asOf: deps.asOf,
    currency: deps.currency,
    contactTypes: Array.isArray(person.contactTypes) ? person.contactTypes : [],
    outreachPermission: person.outreachPermission ?? null,
    givingStatus: giving.givingStatus,
    giving,
    recentGifts,
    plan: openPlan
      ? {
          stage: openPlan.stage,
          askAmount: unitsOf(openPlan.askAmount),
          nextStepDate: dateOnly(openPlan.nextStepDate),
          nextStepHealth: resolveNextStepHealth({
            stage: openPlan.stage,
            nextStep: openPlan.nextStep,
            nextStepDate: dateOnly(openPlan.nextStepDate),
            asOf: deps.asOf,
          }),
          purpose: openPlan.purpose,
          nextStep: openPlan.nextStep,
        }
      : null,
    volunteer: { approvedHours: toNumber(person.volunteerHours) ?? 0, lastVolunteeredOn: dateOnly(person.lastVolunteeredOn) },
    includeFreeText: deps.includeFreeText,
  });

  const run = await deps.runAgent({
    agentUniversalIdentifier: deps.donorAgentId,
    prompt: `${DONOR_PROMPT_HEADER}\n\n${evidence}`,
  });

  if (!run.success) {
    return { status: 'failed', reason: run.error ?? 'The AI could not be reached. Check that AI is enabled and has credits.' };
  }

  const parsed = parseDonorInsight(run.result, {
    outreachPermission: person.outreachPermission ?? null,
    giftCount: giving.giftCount,
    largestGift: giving.largestGift,
    evidence,
  });

  if (!parsed.ok) return { status: 'rejected', reason: parsed.reason };

  const { insight } = parsed;

  await updateRecord(deps.client, COLLECTION.person, personId, {
    aiSummary: insight.summary,
    aiNextBestAction: insight.nextBestAction,
    aiSuggestedAsk: money(insight.suggestedAsk, deps.currency),
    aiRetentionRisk: insight.retentionRisk,
    aiBasis: formatInsightBasis(insight),
    aiGeneratedAt: deps.now.toISOString(),
  });

  return { status: 'stored', warnings: insight.warnings };
};

export const generateGrantReportDraft = async (deps: AiDeps, grantId: string): Promise<InsightOutcome> => {
  const grant = await fetchOne(deps.client, COLLECTION.grant, grantId, {
    name: true,
    status: true,
    funderId: true,
    awardAmount: MONEY,
    spentAmount: MONEY,
    startDate: true,
    endDate: true,
    reportFrequency: true,
    nextReportDue: true,
    kpiProgressPercent: true,
    timeElapsedPercent: true,
    percentSpent: true,
    pace: true,
    purpose: true,
  });
  if (!grant) return { status: 'not-found', reason: 'That grant could not be found.' };

  const [funder, kpis, subgrantees, metrics, payments] = await Promise.all([
    grant.funderId ? fetchOne(deps.client, COLLECTION.company, grant.funderId, { name: true }) : Promise.resolve(null),
    fetchAll(deps.client, COLLECTION.grantKpi, {
      name: true, unit: true, current: true, target: true, asOfDate: true, measurementMethod: true, subgranteeId: true,
    }, { grantId: { eq: grantId } }),
    fetchAll(deps.client, COLLECTION.subgrantee, { name: true, allocatedAmount: MONEY, status: true }, { grantId: { eq: grantId } }),
    fetchAll(deps.client, COLLECTION.programMetric, { name: true, period: true, peopleServed: true, totalCost: MONEY }, { grantId: { eq: grantId } }),
    fetchAll(deps.client, COLLECTION.donation, DONATION_SELECTION, { grantId: { eq: grantId } }),
  ]);

  const subgranteeNames = new Map(subgrantees.records.map((sub) => [sub.id, sub.name as string]));
  const awardUnits = unitsOf(grant.awardAmount);
  const spentUnits = unitsOf(grant.spentAmount);
  const funding = summarizeFunding(payments.records.map(toDonationRow), deps.currency);

  const issues = findGrantDataIssues(
    {
      name: grant.name, status: grant.status, funderId: grant.funderId, awardUnits, spentUnits,
      startDate: dateOnly(grant.startDate), endDate: dateOnly(grant.endDate), reportFrequency: grant.reportFrequency,
    },
    kpis.records.map((kpi) => ({ name: kpi.name, target: kpi.target, asOfDate: dateOnly(kpi.asOfDate) })),
    deps.asOf,
  );

  const evidence = buildGrantEvidence({
    asOf: deps.asOf,
    currency: deps.currency,
    grant: {
      name: grant.name,
      funderName: funder?.name ?? null,
      status: grant.status ?? null,
      awardAmount: awardUnits,
      spentAmount: spentUnits,
      receivedAmount: funding.giftCount > 0 ? funding.receivedAmount : null,
      percentSpent: toNumber(grant.percentSpent),
      startDate: dateOnly(grant.startDate),
      endDate: dateOnly(grant.endDate),
      timeElapsedPercent: toNumber(grant.timeElapsedPercent),
      reportFrequency: grant.reportFrequency ?? null,
      nextReportDue: dateOnly(grant.nextReportDue),
      kpiProgressPercent: toNumber(grant.kpiProgressPercent),
      pace: grant.pace ?? null,
      purpose: deps.includeFreeText ? (grant.purpose ?? null) : null,
    },
    kpis: kpis.records.map((kpi) => ({
      name: kpi.name,
      unit: kpi.unit ?? null,
      current: kpi.current,
      target: kpi.target,
      asOfDate: dateOnly(kpi.asOfDate),
      measurementMethod: kpi.measurementMethod ?? null,
      subgranteeName: kpi.subgranteeId ? (subgranteeNames.get(kpi.subgranteeId) ?? null) : null,
    })),
    subgrantees: subgrantees.records.map((sub) => ({
      name: sub.name, allocatedAmount: unitsOf(sub.allocatedAmount), status: sub.status ?? null,
    })),
    programMetrics: metrics.records
      .map((metric) => ({
        name: metric.name,
        period: dateOnly(metric.period),
        peopleServed: toNumber(metric.peopleServed),
        totalCost: unitsOf(metric.totalCost),
      }))
      .sort((a, b) => (b.period ?? '').localeCompare(a.period ?? ''))
      .slice(0, 12),
    dataIssues: issues,
  });

  const run = await deps.runAgent({
    agentUniversalIdentifier: deps.reportAgentId,
    prompt: `${REPORT_PROMPT_HEADER}\n\n${evidence}`,
  });

  if (!run.success) {
    return { status: 'failed', reason: run.error ?? 'The AI could not be reached. Check that AI is enabled and has credits.' };
  }

  const parsed = parseGrantReport(run.result, evidence);
  if (!parsed.ok) return { status: 'rejected', reason: parsed.reason };

  await updateRecord(deps.client, COLLECTION.grant, grantId, {
    aiReportDraft: parsed.text,
    aiReportGeneratedAt: deps.now.toISOString(),
  });

  return { status: 'stored', warnings: [] };
};

export type WeeklyInsightSummary = { considered: number; stored: number; skipped: number; stoppedEarly: string | null };

// Picks the donors where a timely conversation matters most and writes insights
// for them, up to a limit. It stops at the first failure to reach the AI, so an
// outage or an empty credit balance never turns into hundreds of failed calls.
export const runWeeklyInsights = async (deps: AiDeps, limit: number): Promise<WeeklyInsightSummary> => {
  const [people, plans] = await Promise.all([
    fetchAll(deps.client, COLLECTION.person, {
      givingStatus: true, outreachPermission: true, aiGeneratedAt: true, lastGiftDate: true, lifetimeGiving: MONEY,
    }, { givingStatus: { in: ['NEW', 'ACTIVE', 'AT_RISK', 'LAPSED'] } }),
    fetchAll(deps.client, COLLECTION.cultivationPlan, { stage: true, donorId: true }, {
      stage: { in: ['IDENTIFICATION', 'QUALIFICATION', 'CULTIVATION', 'SOLICITATION'] },
    }),
  ]);

  const stageByDonor = new Map<string, string>(
    plans.records.filter((plan: RecordNode) => plan.donorId).map((plan) => [plan.donorId as string, plan.stage as string]),
  );

  const candidates: InsightCandidate[] = people.records.map((person) => ({
    id: person.id,
    givingStatus: person.givingStatus ?? null,
    lifetimeGiving: unitsOf(person.lifetimeGiving) ?? 0,
    outreachPermission: person.outreachPermission ?? null,
    aiGeneratedOn: dateOnly(person.aiGeneratedAt),
    lastGiftDate: dateOnly(person.lastGiftDate),
    planStage: stageByDonor.get(person.id) ?? null,
  }));

  const chosen = rankInsightCandidates(candidates, deps.asOf, limit);
  const summary: WeeklyInsightSummary = { considered: chosen.length, stored: 0, skipped: 0, stoppedEarly: null };

  for (const personId of chosen) {
    const outcome = await generateDonorInsight(deps, personId);

    if (outcome.status === 'stored') summary.stored += 1;
    else if (outcome.status === 'failed') {
      summary.stoppedEarly = outcome.reason;
      break;
    } else summary.skipped += 1;
  }

  return summary;
};
