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

export const LOGIC_FUNCTION_ID = {
  onDonationChanged: stableUuid('logic-function:on-donation-changed'),
  onVolunteerLogChanged: stableUuid('logic-function:on-volunteer-log-changed'),
  onKpiChanged: stableUuid('logic-function:on-kpi-changed'),
  onGrantChanged: stableUuid('logic-function:on-grant-changed'),
  onPlanChanged: stableUuid('logic-function:on-plan-changed'),
  onProgramMetricChanged: stableUuid('logic-function:on-program-metric-changed'),
  nightlySweep: stableUuid('logic-function:nightly-sweep'),
  weeklyAiInsights: stableUuid('logic-function:weekly-ai-insights'),
  generateDonorInsight: stableUuid('logic-function:generate-donor-insight'),
  generateGrantReport: stableUuid('logic-function:generate-grant-report'),
  recordDonation: stableUuid('logic-function:record-donation'),
  addSampleData: stableUuid('logic-function:add-sample-data'),
  removeSampleData: stableUuid('logic-function:remove-sample-data'),
  importFromV1: stableUuid('logic-function:import-from-v1'),
  healthCheck: stableUuid('logic-function:health-check'),
} as const;

export const AGENT_ID = {
  donorInsights: stableUuid('agent:donor-insights-analyst'),
  grantReportWriter: stableUuid('agent:grant-report-writer'),
} as const;

export const ROLE_ID = {
  aiNoData: stableUuid('role:ai-no-data'),
  fundraiser: stableUuid('role:fundraiser'),
  grantsManager: stableUuid('role:grants-manager'),
  volunteerCoordinator: stableUuid('role:volunteer-coordinator'),
  boardViewer: stableUuid('role:board-viewer'),
} as const;

export const SETTING_ID = {
  majorGiftThreshold: stableUuid('setting:major-gift-threshold'),
  reportingCurrency: stableUuid('setting:reporting-currency'),
  aiIncludeFreeText: stableUuid('setting:ai-include-free-text'),
  aiWeeklyInsightsEnabled: stableUuid('setting:ai-weekly-insights-enabled'),
  aiWeeklyInsightLimit: stableUuid('setting:ai-weekly-insight-limit'),
} as const;

export const SKILL_ID = {
  howCompassWorks: stableUuid('skill:how-compass-works'),
  donorCultivation: stableUuid('skill:donor-cultivation'),
  donorStewardship: stableUuid('skill:donor-stewardship'),
  grantReporting: stableUuid('skill:grant-reporting'),
  aiGuardrails: stableUuid('skill:ai-guardrails'),
} as const;

export const VIEW_ID = {
  donors: stableUuid('view:donors'),
  donorsToReach: stableUuid('view:donors-to-reach'),
  prospects: stableUuid('view:prospects'),
  aiInsights: stableUuid('view:ai-donor-insights'),
  giftsToThank: stableUuid('view:gifts-to-thank'),
  cultivationPipeline: stableUuid('view:cultivation-pipeline'),
  overdueSteps: stableUuid('view:overdue-next-steps'),
  activeCampaigns: stableUuid('view:active-campaigns'),
  grantPipeline: stableUuid('view:grant-pipeline'),
  activeGrants: stableUuid('view:active-grants'),
  grantsNeedingAttention: stableUuid('view:grants-needing-attention'),
  kpisBehind: stableUuid('view:kpis-behind'),
  volunteers: stableUuid('view:volunteers'),
  hoursAwaitingApproval: stableUuid('view:hours-awaiting-approval'),
} as const;

export const FOLDER_ID = {
  fundraising: stableUuid('folder:fundraising'),
  grants: stableUuid('folder:grants'),
  volunteers: stableUuid('folder:volunteers'),
} as const;

export const PAGE_LAYOUT_ID = {
  home: stableUuid('page-layout:home'),
} as const;

export const FRONT_COMPONENT_ID = {
  donorInsight: stableUuid('front-component:donor-insight'),
  grantReport: stableUuid('front-component:grant-report'),
  addSampleData: stableUuid('front-component:add-sample-data'),
  removeSampleData: stableUuid('front-component:remove-sample-data'),
} as const;

export const COMMAND_ID = {
  donorInsight: stableUuid('command:donor-insight'),
  grantReport: stableUuid('command:grant-report'),
  addSampleData: stableUuid('command:add-sample-data'),
  removeSampleData: stableUuid('command:remove-sample-data'),
} as const;
