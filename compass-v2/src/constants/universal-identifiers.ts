import { stableUuid } from 'src/constants/stable-uuid';

export const APP_DISPLAY_NAME = 'Nomad Compass';
export const APP_DESCRIPTION =
  'Grants, impact, donors, volunteers and donor cultivation in one place, with AI insights that show their evidence. By Nomad Consulting.';

export const APPLICATION_UNIVERSAL_IDENTIFIER = stableUuid('application');
export const DEFAULT_ROLE_UNIVERSAL_IDENTIFIER = stableUuid('role:default');

// The permanent key behind every ID is the seed string. Never rename a seed:
// that would make Twenty treat the field as brand new and orphan its data.

export const OBJECT_ID = {
  grant: stableUuid('object:grant'),
  grantKpi: stableUuid('object:grantKpi'),
  subgrantee: stableUuid('object:subgrantee'),
  programMetric: stableUuid('object:programMetric'),
  donation: stableUuid('object:donation'),
  fundraisingCampaign: stableUuid('object:fundraisingCampaign'),
  cultivationPlan: stableUuid('object:cultivationPlan'),
  volunteerLog: stableUuid('object:volunteerLog'),
} as const;

// Builds { fieldName: uuid } for one object. Because the names are a literal
// tuple, FIELD.grant.nme is a compile error instead of a silent wrong ID.
const fieldIds = <const TNames extends readonly string[]>(
  objectKey: string,
  names: TNames,
): Record<TNames[number], string> =>
  Object.fromEntries(
    names.map((name) => [name, stableUuid(`field:${objectKey}:${name}`)]),
  ) as Record<TNames[number], string>;

export const GRANT_FIELD = fieldIds('grant', [
  'name', 'status', 'awardAmount', 'requestedAmount', 'spentAmount',
  'receivedAmount', 'startDate', 'endDate', 'applicationDeadline',
  'reportFrequency', 'nextReportDue', 'lastReportSubmittedOn', 'purpose',
  'kpiProgressPercent', 'timeElapsedPercent', 'percentSpent', 'pace',
  'dataCheck', 'aiReportDraft', 'aiReportGeneratedAt',
  // relations
  'funder', 'owner', 'kpis', 'subgrantees', 'programMetrics', 'donations',
  'volunteerLogs',
] as const);

export const GRANT_KPI_FIELD = fieldIds('grantKpi', [
  'name', 'target', 'current', 'unit', 'asOfDate', 'measurementMethod',
  'status', 'progressPercent',
  // relations
  'grant', 'subgrantee',
] as const);

export const SUBGRANTEE_FIELD = fieldIds('subgrantee', [
  'name', 'status', 'allocatedAmount',
  // relations
  'grant', 'kpis',
] as const);

export const PROGRAM_METRIC_FIELD = fieldIds('programMetric', [
  'name', 'period', 'peopleServed', 'totalCost', 'costPerPerson',
  // relations
  'grant',
] as const);

export const DONATION_FIELD = fieldIds('donation', [
  'name', 'status', 'giftType', 'amount', 'giftDate', 'paymentMethod',
  'designation', 'isAnonymous', 'referenceNumber', 'acknowledged',
  'acknowledgedOn', 'thankYouTaskCreated',
  // relations
  'donor', 'organizationDonor', 'campaign', 'grant',
] as const);

export const CAMPAIGN_FIELD = fieldIds('fundraisingCampaign', [
  'name', 'campaignType', 'status', 'goalAmount', 'startDate', 'endDate',
  'raisedAmount', 'pledgedAmount', 'donorCount', 'percentOfGoal',
  // relations
  'donations',
] as const);

export const PLAN_FIELD = fieldIds('cultivationPlan', [
  'name', 'stage', 'askAmount', 'probabilityPercent', 'weightedAmount',
  'purpose', 'targetAskDate', 'nextStep', 'nextStepDate', 'lastContactDate',
  'strategy',
  // relations
  'donor', 'organization', 'owner',
] as const);

export const VOLUNTEER_LOG_FIELD = fieldIds('volunteerLog', [
  'name', 'activityDate', 'hours', 'activity', 'status',
  // relations
  'volunteer', 'grant',
] as const);

// Fields Compass adds to Twenty's built-in People (contacts), Companies
// (organizations) and Workspace members (your team).
export const PERSON_FIELD = fieldIds('person', [
  'contactTypes', 'outreachPermission', 'capacityRating',
  'givingStatus', 'lifetimeGiving', 'giftCount', 'firstGiftDate',
  'lastGiftDate', 'lastGiftAmount', 'largestGift',
  'volunteerStatus', 'volunteerSince', 'volunteerSkills', 'volunteerHours',
  'lastVolunteeredOn', 'backgroundCheckStatus', 'backgroundCheckExpires',
  'aiSummary', 'aiNextBestAction', 'aiSuggestedAsk', 'aiRetentionRisk',
  'aiBasis', 'aiGeneratedAt',
  // relations
  'donations', 'cultivationPlans', 'volunteerLogs',
] as const);

export const COMPANY_FIELD = fieldIds('company', [
  'organizationTypes', 'fundingPriorities', 'totalGiven', 'totalAwarded',
  'activeGrantCount',
  // relations
  'grants', 'donations', 'cultivationPlans',
] as const);

export const WORKSPACE_MEMBER_FIELD = fieldIds('workspaceMember', [
  'ownedGrants', 'ownedCultivationPlans',
] as const);

export const id = (seed: string): string => stableUuid(seed);
