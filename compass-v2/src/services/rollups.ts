import { summarizeDonorGiving, summarizeFunding, percentOfGoal, type DonorGivingSummary } from 'src/lib/donations';
import { daysBetween } from 'src/lib/dates';
import {
  findGrantDataIssues,
  formatDataCheck,
  percentSpent,
  resolvePace,
  timeElapsedPercent,
} from 'src/lib/grant';
import { resolveKpiStatus, summarizeKpis } from 'src/lib/kpi';
import { summarizeVolunteerHours } from 'src/lib/volunteer';
import { weightedAskAmount } from 'src/lib/cultivation';

import {
  DONATION_SELECTION,
  dateOnly,
  money,
  numberOf,
  toDonationRow,
  unitsOf,
} from 'src/services/mappers';
import {
  COLLECTION,
  fetchAll,
  fetchOne,
  updateIfChanged,
  type GraphqlClient,
  type RecordNode,
} from 'src/services/repo';

export type RollupDeps = {
  client: GraphqlClient;
  // Today, as a calendar date (2026-10-06). Passed in so tests control time.
  asOf: string;
  // Totals are only added up in this currency.
  currency: string;
};

const MONEY = { amountMicros: true, currencyCode: true } as const;

const PERSON_GIVING_SELECTION = {
  name: { firstName: true, lastName: true },
  contactTypes: true,
  outreachPermission: true,
  givingStatus: true,
  lifetimeGiving: MONEY,
  giftCount: true,
  firstGiftDate: true,
  lastGiftDate: true,
  lastGiftAmount: MONEY,
  largestGift: MONEY,
} as const;

export type DonorRollupResult = {
  status: 'updated' | 'unchanged' | 'missing';
  summary: DonorGivingSummary | null;
  previousGivingStatus: string | null;
  person: RecordNode | null;
};

// Recalculates everything shown about a donor's giving from their donations.
// It is safe to run any number of times: it only writes what actually changed.
export const recomputeDonorRollup = async (
  deps: RollupDeps,
  personId: string,
  preloaded?: { person?: RecordNode; donations?: RecordNode[] },
): Promise<DonorRollupResult> => {
  const person =
    preloaded?.person ?? (await fetchOne(deps.client, COLLECTION.person, personId, PERSON_GIVING_SELECTION));

  if (!person) return { status: 'missing', summary: null, previousGivingStatus: null, person: null };

  const donations =
    preloaded?.donations ??
    (await fetchAll(deps.client, COLLECTION.donation, DONATION_SELECTION, { donorId: { eq: personId } })).records;

  const summary = summarizeDonorGiving(donations.map(toDonationRow), deps.asOf, deps.currency);

  const contactTypes: string[] = Array.isArray(person.contactTypes) ? person.contactTypes : [];
  const nextContactTypes =
    summary.giftCount > 0 && !contactTypes.includes('DONOR') ? [...contactTypes, 'DONOR'] : contactTypes;

  const current = {
    contactTypes,
    givingStatus: person.givingStatus ?? null,
    lifetimeGiving: money(unitsOf(person.lifetimeGiving), deps.currency),
    giftCount: numberOf(person.giftCount),
    firstGiftDate: dateOnly(person.firstGiftDate),
    lastGiftDate: dateOnly(person.lastGiftDate),
    lastGiftAmount: money(unitsOf(person.lastGiftAmount), deps.currency),
    largestGift: money(unitsOf(person.largestGift), deps.currency),
  };

  const changed = await updateIfChanged(
    deps.client,
    COLLECTION.person,
    { id: person.id, ...current },
    {
      contactTypes: nextContactTypes,
      givingStatus: summary.givingStatus,
      lifetimeGiving: money(summary.lifetimeGiving, deps.currency),
      giftCount: summary.giftCount,
      firstGiftDate: summary.firstGiftDate,
      lastGiftDate: summary.lastGiftDate,
      lastGiftAmount: money(summary.lastGiftAmount, deps.currency),
      largestGift: money(summary.largestGift, deps.currency),
    },
  );

  return {
    status: changed ? 'updated' : 'unchanged',
    summary,
    previousGivingStatus: person.givingStatus ?? null,
    person,
  };
};

export const recomputeCampaignRollup = async (deps: RollupDeps, campaignId: string): Promise<boolean> => {
  const campaign = await fetchOne(deps.client, COLLECTION.fundraisingCampaign, campaignId, {
    goalAmount: MONEY,
    raisedAmount: MONEY,
    pledgedAmount: MONEY,
    donorCount: true,
    percentOfGoal: true,
  });
  if (!campaign) return false;

  const { records } = await fetchAll(deps.client, COLLECTION.donation, DONATION_SELECTION, {
    campaignId: { eq: campaignId },
  });
  const funding = summarizeFunding(records.map(toDonationRow), deps.currency);

  return updateIfChanged(
    deps.client,
    COLLECTION.fundraisingCampaign,
    {
      id: campaign.id,
      raisedAmount: money(unitsOf(campaign.raisedAmount), deps.currency),
      pledgedAmount: money(unitsOf(campaign.pledgedAmount), deps.currency),
      donorCount: numberOf(campaign.donorCount),
      percentOfGoal: numberOf(campaign.percentOfGoal),
    },
    {
      raisedAmount: money(funding.receivedAmount, deps.currency),
      pledgedAmount: money(funding.pledgedAmount, deps.currency),
      donorCount: funding.contributorCount,
      percentOfGoal: percentOfGoal(funding.receivedAmount, unitsOf(campaign.goalAmount)),
    },
  );
};

// Funders: how much they have given in total, and what their grants add up to.
export const recomputeCompanyRollup = async (deps: RollupDeps, companyId: string): Promise<boolean> => {
  const company = await fetchOne(deps.client, COLLECTION.company, companyId, {
    totalGiven: MONEY,
    totalAwarded: MONEY,
    activeGrantCount: true,
  });
  if (!company) return false;

  const [donations, grants] = await Promise.all([
    fetchAll(deps.client, COLLECTION.donation, DONATION_SELECTION, { organizationDonorId: { eq: companyId } }),
    fetchAll(deps.client, COLLECTION.grant, { status: true, awardAmount: MONEY }, { funderId: { eq: companyId } }),
  ]);

  const given = summarizeFunding(donations.records.map(toDonationRow), deps.currency).receivedAmount;
  const awardedStatuses = ['PENDING', 'ACTIVE', 'COMPLETED'];
  const awarded = grants.records
    .filter((grant) => awardedStatuses.includes(grant.status))
    .reduce((sum, grant) => sum + (unitsOf(grant.awardAmount) ?? 0), 0);
  const activeCount = grants.records.filter((grant) => grant.status === 'ACTIVE').length;

  return updateIfChanged(
    deps.client,
    COLLECTION.company,
    {
      id: company.id,
      totalGiven: money(unitsOf(company.totalGiven), deps.currency),
      totalAwarded: money(unitsOf(company.totalAwarded), deps.currency),
      activeGrantCount: numberOf(company.activeGrantCount),
    },
    {
      totalGiven: money(given, deps.currency),
      totalAwarded: money(awarded, deps.currency),
      activeGrantCount: activeCount,
    },
  );
};

const KPI_SELECTION = {
  name: true,
  target: true,
  current: true,
  asOfDate: true,
  status: true,
  progressPercent: true,
  grantId: true,
} as const;

export const recomputeKpiRecord = async (deps: RollupDeps, kpi: RecordNode): Promise<boolean> => {
  const info = resolveKpiStatus(kpi.current, kpi.target);

  return updateIfChanged(
    deps.client,
    COLLECTION.grantKpi,
    { id: kpi.id, status: kpi.status ?? null, progressPercent: numberOf(kpi.progressPercent) },
    { status: info.status, progressPercent: info.progressPercent },
  );
};

export const recomputeKpi = async (deps: RollupDeps, kpiId: string): Promise<string | null> => {
  const kpi = await fetchOne(deps.client, COLLECTION.grantKpi, kpiId, KPI_SELECTION);
  if (!kpi) return null;

  await recomputeKpiRecord(deps, kpi);

  return kpi.grantId ?? null;
};

const GRANT_SELECTION = {
  name: true,
  status: true,
  funderId: true,
  awardAmount: MONEY,
  spentAmount: MONEY,
  receivedAmount: MONEY,
  startDate: true,
  endDate: true,
  reportFrequency: true,
  kpiProgressPercent: true,
  timeElapsedPercent: true,
  percentSpent: true,
  pace: true,
  dataCheck: true,
} as const;

export const recomputeGrant = async (deps: RollupDeps, grantId: string): Promise<boolean> => {
  const grant = await fetchOne(deps.client, COLLECTION.grant, grantId, GRANT_SELECTION);
  if (!grant) return false;

  const [kpiResult, donationResult] = await Promise.all([
    fetchAll(deps.client, COLLECTION.grantKpi, KPI_SELECTION, { grantId: { eq: grantId } }),
    fetchAll(deps.client, COLLECTION.donation, DONATION_SELECTION, { grantId: { eq: grantId } }),
  ]);

  // KPI statuses are refreshed here too, so one pass leaves the whole grant consistent.
  for (const kpi of kpiResult.records) await recomputeKpiRecord(deps, kpi);

  const kpiSummary = summarizeKpis(
    kpiResult.records.map((kpi) => ({ current: kpi.current, target: kpi.target })),
  );
  const awardUnits = unitsOf(grant.awardAmount);
  const spentUnits = unitsOf(grant.spentAmount);
  const elapsed = timeElapsedPercent(grant.startDate, grant.endDate, deps.asOf);
  const funding = summarizeFunding(donationResult.records.map(toDonationRow), deps.currency);

  const issues = findGrantDataIssues(
    {
      name: grant.name,
      status: grant.status,
      funderId: grant.funderId,
      awardUnits,
      spentUnits,
      startDate: dateOnly(grant.startDate),
      endDate: dateOnly(grant.endDate),
      reportFrequency: grant.reportFrequency,
    },
    kpiResult.records.map((kpi) => ({ name: kpi.name, target: kpi.target, asOfDate: dateOnly(kpi.asOfDate) })),
    deps.asOf,
  );

  const changed = await updateIfChanged(
    deps.client,
    COLLECTION.grant,
    {
      id: grant.id,
      kpiProgressPercent: numberOf(grant.kpiProgressPercent),
      timeElapsedPercent: numberOf(grant.timeElapsedPercent),
      percentSpent: numberOf(grant.percentSpent),
      pace: grant.pace ?? null,
      dataCheck: grant.dataCheck ?? null,
      receivedAmount: money(unitsOf(grant.receivedAmount), deps.currency),
    },
    {
      kpiProgressPercent: kpiSummary.averageProgressPercent,
      timeElapsedPercent: elapsed,
      percentSpent: percentSpent(spentUnits, awardUnits),
      pace: resolvePace({
        status: grant.status,
        kpiProgressPercent: kpiSummary.averageProgressPercent,
        elapsedPercent: elapsed,
      }),
      dataCheck: formatDataCheck(issues),
      receivedAmount: funding.giftCount > 0 ? money(funding.receivedAmount, deps.currency) : null,
    },
  );

  if (grant.funderId) await recomputeCompanyRollup(deps, grant.funderId);

  return changed;
};

export const recomputeVolunteerRollup = async (deps: RollupDeps, personId: string): Promise<boolean> => {
  const person = await fetchOne(deps.client, COLLECTION.person, personId, {
    contactTypes: true,
    volunteerStatus: true,
    volunteerSince: true,
    volunteerHours: true,
    lastVolunteeredOn: true,
  });
  if (!person) return false;

  const { records } = await fetchAll(
    deps.client,
    COLLECTION.volunteerLog,
    { hours: true, activityDate: true, status: true },
    { volunteerId: { eq: personId } },
  );

  const summary = summarizeVolunteerHours(
    records.map((log) => ({ hours: log.hours, activityDate: dateOnly(log.activityDate), status: log.status ?? null })),
    deps.asOf,
  );

  const contactTypes: string[] = Array.isArray(person.contactTypes) ? person.contactTypes : [];
  const earliest = records
    .map((log) => dateOnly(log.activityDate))
    .filter((date): date is string => date !== null)
    .sort()[0] ?? null;

  const current = {
    contactTypes,
    volunteerStatus: person.volunteerStatus ?? null,
    volunteerSince: dateOnly(person.volunteerSince),
    volunteerHours: numberOf(person.volunteerHours),
    lastVolunteeredOn: dateOnly(person.lastVolunteeredOn),
  };
  const hasLogs = summary.logCount > 0;

  // Defaults are only filled in when empty. A coordinator's own choices win.
  return updateIfChanged(deps.client, COLLECTION.person, { id: person.id, ...current }, {
    contactTypes: hasLogs && !contactTypes.includes('VOLUNTEER') ? [...contactTypes, 'VOLUNTEER'] : contactTypes,
    volunteerStatus: current.volunteerStatus ?? (hasLogs ? 'ACTIVE' : null),
    volunteerSince: current.volunteerSince ?? earliest,
    volunteerHours: summary.approvedHours,
    lastVolunteeredOn: summary.lastVolunteeredOn,
  });
};

export const recomputePlanRollup = async (deps: RollupDeps, planId: string): Promise<boolean> => {
  const plan = await fetchOne(deps.client, COLLECTION.cultivationPlan, planId, {
    stage: true,
    askAmount: MONEY,
    probabilityPercent: true,
    weightedAmount: MONEY,
  });
  if (!plan) return false;

  const weighted = weightedAskAmount({
    stage: plan.stage,
    askAmount: unitsOf(plan.askAmount),
    probabilityPercent: plan.probabilityPercent,
  });

  return updateIfChanged(
    deps.client,
    COLLECTION.cultivationPlan,
    { id: plan.id, weightedAmount: money(unitsOf(plan.weightedAmount), deps.currency) },
    { weightedAmount: money(weighted, deps.currency) },
  );
};

export const daysSince = (date: string | null, asOf: string): number | null =>
  date ? daysBetween(date, asOf) : null;
