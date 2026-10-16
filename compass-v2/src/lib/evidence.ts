import { type OutreachPermission } from 'src/constants/enums';
import { KPI_STATUS_LABELS, resolveKpiStatus } from 'src/lib/kpi';
import { type DonorGivingSummary } from 'src/lib/donations';
import { type NextStepHealth } from 'src/lib/cultivation';
import { daysBetween } from 'src/lib/dates';
import { formatMoney, roundTo, toNumber } from 'src/lib/money';

// The evidence packet is the only thing the AI model is shown. It is built from
// structured fields on purpose:
//   * No name, email, phone or address is included. The insight is stored back
//     on the person's own record, where the name is already known, so the model
//     never needs to learn who the donor is.
//   * Free-text fields (notes, a plan's purpose or next step) are left out
//     unless the workspace opts in, because staff sometimes type names and
//     personal details into them.

export type RecentGift = {
  date: string | null;
  amount: number;
  giftType: string | null;
  status: string | null;
  campaign: string | null;
};

export type DonorEvidenceInput = {
  asOf: string;
  currency: string;
  contactTypes: readonly string[];
  outreachPermission: OutreachPermission | null;
  givingStatus: string | null;
  giving: DonorGivingSummary;
  recentGifts: readonly RecentGift[];
  plan: {
    stage: string | null;
    askAmount: number | null;
    nextStepDate: string | null;
    nextStepHealth: NextStepHealth;
    purpose?: string | null;
    nextStep?: string | null;
  } | null;
  volunteer: { approvedHours: number; lastVolunteeredOn: string | null } | null;
  includeFreeText: boolean;
};

export const MAX_RECENT_GIFTS = 12;
const MAX_FREE_TEXT = 160;

const line = (label: string, value: string | null | undefined): string | null =>
  value ? `${label}: ${value}` : null;

export const buildDonorEvidence = (input: DonorEvidenceInput): string => {
  const { giving, currency } = input;
  const money = (units: number) => formatMoney(units, currency);

  const average = giving.giftCount > 0 ? roundTo(giving.lifetimeGiving / giving.giftCount, 2) : null;
  const daysSinceLast = giving.lastGiftDate ? daysBetween(giving.lastGiftDate, input.asOf) : null;

  const lines = [
    `DONOR RECORD (name and contact details withheld). Facts from Nomad Compass as of ${input.asOf}.`,
    line('Contact types', input.contactTypes.join(', ') || null),
    line('Outreach permission', input.outreachPermission ?? 'not set'),
    line('Giving status', input.givingStatus ?? 'unknown'),
    giving.giftCount > 0
      ? `Cash giving: ${money(giving.lifetimeGiving)} across ${giving.giftCount} gift${giving.giftCount === 1 ? '' : 's'}.`
      : 'Cash giving: no received gifts on record.',
    line('Average gift', average !== null ? money(average) : null),
    line('Largest gift', giving.largestGift !== null ? money(giving.largestGift) : null),
    line('First gift', giving.firstGiftDate),
    giving.lastGiftDate
      ? `Last gift: ${giving.lastGiftDate}${giving.lastGiftAmount !== null ? ` of ${money(giving.lastGiftAmount)}` : ''}${daysSinceLast !== null ? ` (${daysSinceLast} days ago)` : ''}.`
      : null,
    giving.skippedGiftCount > 0
      ? `Note: ${giving.skippedGiftCount} received gift${giving.skippedGiftCount === 1 ? ' was' : 's were'} not counted above (other currency or invalid amount).`
      : null,
  ];

  if (input.recentGifts.length > 0) {
    lines.push('Recent gifts, newest first:');
    for (const gift of input.recentGifts.slice(0, MAX_RECENT_GIFTS)) {
      lines.push(
        `- ${gift.date ?? 'date unknown'}: ${money(gift.amount)}, ${gift.giftType ?? 'type unknown'}, ${gift.status ?? 'status unknown'}${gift.campaign ? `, campaign "${gift.campaign}"` : ''}`,
      );
    }
  }

  if (input.plan) {
    lines.push(
      `Open cultivation plan: stage ${input.plan.stage ?? 'unknown'}${input.plan.askAmount !== null ? `, planned ask ${money(input.plan.askAmount)}` : ''}${input.plan.nextStepDate ? `, next step date ${input.plan.nextStepDate} (${input.plan.nextStepHealth.toLowerCase().replace('_', ' ')})` : ', no next step date set'}.`,
    );
    if (input.includeFreeText) {
      lines.push(
        line('Plan purpose (staff wording)', input.plan.purpose?.slice(0, MAX_FREE_TEXT)),
        line('Plan next step (staff wording)', input.plan.nextStep?.slice(0, MAX_FREE_TEXT)),
      );
    }
  } else {
    lines.push('Cultivation plan: none open.');
  }

  if (input.volunteer && input.volunteer.approvedHours > 0) {
    lines.push(
      `Volunteering: ${input.volunteer.approvedHours} approved hours${input.volunteer.lastVolunteeredOn ? `, most recently ${input.volunteer.lastVolunteeredOn}` : ''}.`,
    );
  }

  return lines.filter((entry): entry is string => Boolean(entry)).join('\n');
};

export type GrantEvidenceInput = {
  asOf: string;
  currency: string;
  grant: {
    name: string;
    funderName: string | null;
    status: string | null;
    awardAmount: number | null;
    spentAmount: number | null;
    receivedAmount: number | null;
    percentSpent: number | null;
    startDate: string | null;
    endDate: string | null;
    timeElapsedPercent: number | null;
    reportFrequency: string | null;
    nextReportDue: string | null;
    kpiProgressPercent: number | null;
    pace: string | null;
    purpose: string | null;
  };
  kpis: readonly {
    name: string;
    unit: string | null;
    current: unknown;
    target: unknown;
    asOfDate: string | null;
    measurementMethod: string | null;
    subgranteeName: string | null;
  }[];
  subgrantees: readonly { name: string; allocatedAmount: number | null; status: string | null }[];
  programMetrics: readonly {
    name: string;
    period: string | null;
    peopleServed: number | null;
    totalCost: number | null;
  }[];
  dataIssues: readonly string[];
};

export const buildGrantEvidence = (input: GrantEvidenceInput): string => {
  const { grant, currency } = input;
  const money = (units: number) => formatMoney(units, currency);
  const lines: (string | null)[] = [
    `GRANT RECORD. Facts from Nomad Compass as of ${input.asOf}.`,
    `Grant: ${grant.name}`,
    line('Funder', grant.funderName),
    line('Status', grant.status),
    grant.awardAmount !== null ? `Award: ${money(grant.awardAmount)}.` : 'Award amount: not recorded.',
    grant.spentAmount !== null
      ? `Spent so far: ${money(grant.spentAmount)}${grant.percentSpent !== null ? ` (${grant.percentSpent}% of the award)` : ''}.`
      : null,
    grant.receivedAmount !== null ? `Payments received: ${money(grant.receivedAmount)}.` : null,
    grant.startDate && grant.endDate
      ? `Grant period: ${grant.startDate} to ${grant.endDate}${grant.timeElapsedPercent !== null ? ` (${grant.timeElapsedPercent}% of the period has passed)` : ''}.`
      : null,
    line('Reporting frequency', grant.reportFrequency),
    line('Next report due', grant.nextReportDue),
    grant.kpiProgressPercent !== null
      ? `Overall KPI progress: ${grant.kpiProgressPercent}% (average, each KPI capped at 100%). Pace: ${grant.pace ?? 'not assessed'}.`
      : 'Overall KPI progress: not available (no KPI has a target).',
    line('Stated purpose', grant.purpose?.slice(0, 400)),
  ];

  if (input.kpis.length > 0) {
    lines.push('KPIs:');
    for (const kpi of input.kpis) {
      const status = resolveKpiStatus(kpi.current, kpi.target);
      const current = toNumber(kpi.current);
      const target = toNumber(kpi.target);

      lines.push(
        `- ${kpi.name}${kpi.subgranteeName ? ` (subgrantee ${kpi.subgranteeName})` : ''}: ${current ?? 'no value'} of ${target ?? 'no target'}${kpi.unit ? ` ${kpi.unit}` : ''}` +
          `${status.status !== 'NO_TARGET' ? `, ${status.progressPercent}% (${KPI_STATUS_LABELS[status.status]})` : ', no target set'}` +
          `${kpi.asOfDate ? `, measured ${kpi.asOfDate}` : ', measurement date not recorded'}` +
          `${kpi.measurementMethod ? `, method: ${kpi.measurementMethod.slice(0, 200)}` : ', method not recorded'}`,
      );
    }
  } else {
    lines.push('KPIs: none recorded.');
  }

  if (input.subgrantees.length > 0) {
    lines.push('Subgrantees:');
    for (const sub of input.subgrantees) {
      lines.push(
        `- ${sub.name}: ${sub.allocatedAmount !== null ? `allocated ${money(sub.allocatedAmount)}` : 'allocation not recorded'}, ${sub.status ?? 'status unknown'}`,
      );
    }
  }

  if (input.programMetrics.length > 0) {
    lines.push('Program results by month:');
    for (const metric of input.programMetrics) {
      const perPerson =
        metric.peopleServed && metric.peopleServed > 0 && metric.totalCost !== null
          ? ` (${money(roundTo(metric.totalCost / metric.peopleServed, 2))} per person)`
          : '';

      lines.push(
        `- ${metric.period ?? 'period unknown'}, ${metric.name}: ${metric.peopleServed ?? 'unknown'} people served${metric.totalCost !== null ? `, cost ${money(metric.totalCost)}` : ''}${perPerson}`,
      );
    }
  }

  if (input.dataIssues.length > 0) {
    lines.push('Data problems already flagged on this grant:', ...input.dataIssues.map((issue) => `- ${issue}`));
  }

  return lines.filter((entry): entry is string => Boolean(entry)).join('\n');
};

export type InsightCandidate = {
  id: string;
  givingStatus: string | null;
  lifetimeGiving: number;
  outreachPermission: string | null;
  aiGeneratedOn: string | null;
  lastGiftDate: string | null;
  planStage: string | null;
};

const STATUS_SCORE: Record<string, number> = {
  AT_RISK: 50,
  LAPSED: 40,
  NEW: 40,
  ACTIVE: 10,
  INACTIVE: 5,
  PROSPECT: 5,
};

const STAGE_SCORE: Record<string, number> = {
  SOLICITATION: 40,
  CULTIVATION: 25,
  QUALIFICATION: 15,
  IDENTIFICATION: 5,
};

export const INSIGHT_REFRESH_DAYS = 30;
export const MIN_INSIGHT_SCORE = 15;

// Decides who the weekly batch looks at, so limited AI credits go to the
// donors where a timely conversation matters most.
export const rankInsightCandidates = (
  candidates: readonly InsightCandidate[],
  asOf: string,
  limit: number,
): string[] =>
  candidates
    .filter((candidate) => candidate.outreachPermission !== 'DO_NOT_CONTACT')
    .filter((candidate) => {
      if (!candidate.aiGeneratedOn) return true;

      const age = daysBetween(candidate.aiGeneratedOn, asOf);
      const newGiftSince =
        candidate.lastGiftDate !== null && candidate.lastGiftDate > candidate.aiGeneratedOn;

      return newGiftSince || age === null || age >= INSIGHT_REFRESH_DAYS;
    })
    .map((candidate) => ({
      id: candidate.id,
      score:
        (STATUS_SCORE[candidate.givingStatus ?? ''] ?? 0) +
        (STAGE_SCORE[candidate.planStage ?? ''] ?? 0) +
        Math.min(30, Math.round(Math.log10(1 + Math.max(candidate.lifetimeGiving, 0)) * 8)),
    }))
    .filter((entry) => entry.score >= MIN_INSIGHT_SCORE)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, Math.max(limit, 0))
    .map((entry) => entry.id);
