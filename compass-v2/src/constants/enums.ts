// Every dropdown in the app is declared here once. The object definitions turn
// these into Twenty select options, and the business logic imports the same
// values, so a dropdown choice and the code that reads it cannot drift apart.

export type OptionColor =
  | 'red' | 'ruby' | 'crimson' | 'tomato' | 'orange' | 'amber' | 'yellow'
  | 'lime' | 'grass' | 'green' | 'jade' | 'mint' | 'turquoise' | 'cyan'
  | 'sky' | 'blue' | 'iris' | 'violet' | 'purple' | 'plum' | 'pink'
  | 'bronze' | 'gold' | 'brown' | 'gray';

export type OptionSeed<TValue extends string> = {
  value: TValue;
  label: string;
  color: OptionColor;
};

export const buildOptions = <TValue extends string>(
  seeds: readonly OptionSeed<TValue>[],
) => seeds.map((seed, position) => ({ ...seed, position }));

// ---------------------------------------------------------------- grants

export const GRANT_STATUS_SEEDS = [
  { value: 'PROSPECT', label: 'Prospect', color: 'gray' },
  { value: 'APPLYING', label: 'Applying', color: 'sky' },
  { value: 'SUBMITTED', label: 'Submitted', color: 'blue' },
  { value: 'PENDING', label: 'Awarded, not started', color: 'amber' },
  { value: 'ACTIVE', label: 'Active', color: 'green' },
  { value: 'COMPLETED', label: 'Completed', color: 'turquoise' },
  { value: 'DECLINED', label: 'Declined', color: 'red' },
] as const satisfies readonly OptionSeed<string>[];
export type GrantStatus = (typeof GRANT_STATUS_SEEDS)[number]['value'];

export const REPORT_FREQUENCY_SEEDS = [
  { value: 'WEEKLY', label: 'Weekly', color: 'sky' },
  { value: 'MONTHLY', label: 'Monthly', color: 'blue' },
  { value: 'QUARTERLY', label: 'Quarterly', color: 'iris' },
  { value: 'ANNUAL', label: 'Annual', color: 'purple' },
] as const satisfies readonly OptionSeed<string>[];
export type ReportFrequency = (typeof REPORT_FREQUENCY_SEEDS)[number]['value'];

export const GRANT_PACE_SEEDS = [
  { value: 'NOT_ENOUGH_DATA', label: 'Not enough data', color: 'gray' },
  { value: 'ON_PACE', label: 'On pace', color: 'green' },
  { value: 'SLIPPING', label: 'Slipping', color: 'amber' },
  { value: 'OFF_PACE', label: 'Off pace', color: 'red' },
] as const satisfies readonly OptionSeed<string>[];
export type GrantPace = (typeof GRANT_PACE_SEEDS)[number]['value'];

export const KPI_STATUS_SEEDS = [
  { value: 'NO_TARGET', label: 'No target', color: 'gray' },
  { value: 'NOT_STARTED', label: 'Not started', color: 'gray' },
  { value: 'BEHIND', label: 'Behind', color: 'red' },
  { value: 'ON_TRACK', label: 'On track', color: 'green' },
  { value: 'MET', label: 'Met', color: 'turquoise' },
  { value: 'EXCEEDED', label: 'Exceeded', color: 'blue' },
] as const satisfies readonly OptionSeed<string>[];
export type KpiStatus = (typeof KPI_STATUS_SEEDS)[number]['value'];

export const SUBGRANTEE_STATUS_SEEDS = [
  { value: 'PENDING', label: 'Pending', color: 'amber' },
  { value: 'ACTIVE', label: 'Active', color: 'green' },
  { value: 'COMPLETED', label: 'Completed', color: 'turquoise' },
] as const satisfies readonly OptionSeed<string>[];

// -------------------------------------------------------------- donations

export const DONATION_STATUS_SEEDS = [
  { value: 'PLEDGED', label: 'Pledged', color: 'amber' },
  { value: 'RECEIVED', label: 'Received', color: 'green' },
  { value: 'WRITTEN_OFF', label: 'Written off', color: 'gray' },
] as const satisfies readonly OptionSeed<string>[];
export type DonationStatus = (typeof DONATION_STATUS_SEEDS)[number]['value'];

export const GIFT_TYPE_SEEDS = [
  { value: 'ONE_TIME', label: 'One-time gift', color: 'blue' },
  { value: 'RECURRING', label: 'Recurring gift', color: 'iris' },
  { value: 'PLEDGE_PAYMENT', label: 'Pledge payment', color: 'purple' },
  { value: 'GRANT_PAYMENT', label: 'Grant payment', color: 'turquoise' },
  { value: 'MATCHING_GIFT', label: 'Matching gift', color: 'pink' },
  { value: 'IN_KIND', label: 'In-kind (goods or services)', color: 'brown' },
] as const satisfies readonly OptionSeed<string>[];
export type GiftType = (typeof GIFT_TYPE_SEEDS)[number]['value'];

export const PAYMENT_METHOD_SEEDS = [
  { value: 'CHECK', label: 'Check', color: 'gray' },
  { value: 'CARD', label: 'Credit or debit card', color: 'blue' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer (ACH or wire)', color: 'sky' },
  { value: 'CASH', label: 'Cash', color: 'green' },
  { value: 'DAF_OR_STOCK', label: 'Donor-advised fund or stock', color: 'purple' },
  { value: 'ONLINE_PLATFORM', label: 'Online giving platform', color: 'turquoise' },
  { value: 'OTHER', label: 'Other', color: 'gray' },
] as const satisfies readonly OptionSeed<string>[];

export const CAMPAIGN_TYPE_SEEDS = [
  { value: 'ANNUAL_APPEAL', label: 'Annual appeal', color: 'blue' },
  { value: 'EVENT', label: 'Event', color: 'pink' },
  { value: 'GIVING_DAY', label: 'Giving day', color: 'orange' },
  { value: 'CAPITAL', label: 'Capital campaign', color: 'purple' },
  { value: 'PEER_TO_PEER', label: 'Peer-to-peer', color: 'turquoise' },
  { value: 'MEMBERSHIP', label: 'Membership', color: 'iris' },
  { value: 'OTHER', label: 'Other', color: 'gray' },
] as const satisfies readonly OptionSeed<string>[];

export const CAMPAIGN_STATUS_SEEDS = [
  { value: 'PLANNING', label: 'Planning', color: 'gray' },
  { value: 'ACTIVE', label: 'Active', color: 'green' },
  { value: 'COMPLETED', label: 'Completed', color: 'turquoise' },
] as const satisfies readonly OptionSeed<string>[];

// ---------------------------------------------------------- people / donors

export const CONTACT_TYPE_SEEDS = [
  { value: 'DONOR', label: 'Donor', color: 'green' },
  { value: 'PROSPECT', label: 'Prospect', color: 'sky' },
  { value: 'VOLUNTEER', label: 'Volunteer', color: 'orange' },
  { value: 'BOARD_MEMBER', label: 'Board member', color: 'purple' },
  { value: 'FUNDER_CONTACT', label: 'Funder contact', color: 'blue' },
  { value: 'PARTNER', label: 'Partner', color: 'turquoise' },
] as const satisfies readonly OptionSeed<string>[];

export const GIVING_STATUS_SEEDS = [
  { value: 'PROSPECT', label: 'Prospect (no gifts yet)', color: 'gray' },
  { value: 'NEW', label: 'New donor', color: 'sky' },
  { value: 'ACTIVE', label: 'Active', color: 'green' },
  { value: 'AT_RISK', label: 'At risk (renewal due)', color: 'amber' },
  { value: 'LAPSED', label: 'Lapsed', color: 'orange' },
  { value: 'INACTIVE', label: 'Inactive (2+ years)', color: 'red' },
] as const satisfies readonly OptionSeed<string>[];
export type GivingStatus = (typeof GIVING_STATUS_SEEDS)[number]['value'];

export const OUTREACH_PERMISSION_SEEDS = [
  { value: 'OK_TO_CONTACT', label: 'OK to contact', color: 'green' },
  { value: 'NO_ASKS', label: 'Thank-yous only, no asks', color: 'amber' },
  { value: 'DO_NOT_CONTACT', label: 'Do not contact', color: 'red' },
] as const satisfies readonly OptionSeed<string>[];
export type OutreachPermission =
  (typeof OUTREACH_PERMISSION_SEEDS)[number]['value'];

export const CAPACITY_SEEDS = [
  { value: 'UNDER_1K', label: 'Under $1,000', color: 'gray' },
  { value: 'K1_TO_10K', label: '$1,000 to $10,000', color: 'sky' },
  { value: 'K10_TO_100K', label: '$10,000 to $100,000', color: 'blue' },
  { value: 'OVER_100K', label: 'Over $100,000', color: 'purple' },
] as const satisfies readonly OptionSeed<string>[];

export const RISK_SEEDS = [
  { value: 'LOW', label: 'Low', color: 'green' },
  { value: 'MEDIUM', label: 'Medium', color: 'amber' },
  { value: 'HIGH', label: 'High', color: 'red' },
] as const satisfies readonly OptionSeed<string>[];
export type RiskLevel = (typeof RISK_SEEDS)[number]['value'];

// -------------------------------------------------------------- volunteers

export const VOLUNTEER_STATUS_SEEDS = [
  { value: 'INTERESTED', label: 'Interested', color: 'sky' },
  { value: 'ONBOARDING', label: 'Onboarding', color: 'amber' },
  { value: 'ACTIVE', label: 'Active', color: 'green' },
  { value: 'INACTIVE', label: 'Inactive', color: 'gray' },
] as const satisfies readonly OptionSeed<string>[];

export const VOLUNTEER_SKILL_SEEDS = [
  { value: 'EVENTS', label: 'Events', color: 'pink' },
  { value: 'MENTORING', label: 'Mentoring or tutoring', color: 'green' },
  { value: 'ADMIN', label: 'Office or admin', color: 'gray' },
  { value: 'FUNDRAISING', label: 'Fundraising', color: 'purple' },
  { value: 'COMMUNICATIONS', label: 'Communications', color: 'blue' },
  { value: 'PROFESSIONAL', label: 'Legal, finance or HR', color: 'iris' },
  { value: 'TECHNOLOGY', label: 'Technology', color: 'turquoise' },
  { value: 'TRANSPORT', label: 'Driving or transport', color: 'orange' },
] as const satisfies readonly OptionSeed<string>[];

export const BACKGROUND_CHECK_SEEDS = [
  { value: 'NOT_REQUIRED', label: 'Not required', color: 'gray' },
  { value: 'PENDING', label: 'Pending', color: 'amber' },
  { value: 'CLEARED', label: 'Cleared', color: 'green' },
  { value: 'EXPIRED', label: 'Expired', color: 'red' },
] as const satisfies readonly OptionSeed<string>[];

export const VOLUNTEER_LOG_STATUS_SEEDS = [
  { value: 'LOGGED', label: 'Logged, awaiting approval', color: 'amber' },
  { value: 'APPROVED', label: 'Approved', color: 'green' },
] as const satisfies readonly OptionSeed<string>[];
export type VolunteerLogStatus =
  (typeof VOLUNTEER_LOG_STATUS_SEEDS)[number]['value'];

// ------------------------------------------------------------- cultivation

export const CULTIVATION_STAGE_SEEDS = [
  { value: 'IDENTIFICATION', label: '1. Identify', color: 'gray' },
  { value: 'QUALIFICATION', label: '2. Qualify', color: 'sky' },
  { value: 'CULTIVATION', label: '3. Cultivate', color: 'blue' },
  { value: 'SOLICITATION', label: '4. Ask', color: 'amber' },
  { value: 'STEWARDSHIP', label: '5. Steward (gift received)', color: 'green' },
  { value: 'DECLINED', label: 'Declined or paused', color: 'red' },
] as const satisfies readonly OptionSeed<string>[];
export type CultivationStage = (typeof CULTIVATION_STAGE_SEEDS)[number]['value'];

// ----------------------------------------------------------- organizations

export const ORGANIZATION_TYPE_SEEDS = [
  { value: 'FOUNDATION', label: 'Foundation', color: 'purple' },
  { value: 'CORPORATE', label: 'Corporate funder or sponsor', color: 'blue' },
  { value: 'GOVERNMENT', label: 'Government agency', color: 'turquoise' },
  { value: 'FAITH_OR_CIVIC', label: 'Faith or civic group', color: 'orange' },
  { value: 'PARTNER_ORG', label: 'Partner organization', color: 'green' },
  { value: 'VENDOR', label: 'Vendor', color: 'gray' },
] as const satisfies readonly OptionSeed<string>[];
