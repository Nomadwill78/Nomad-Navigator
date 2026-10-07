export interface ProgramMetric {
  id: string;
  name: string;
  peopleServed: number;
  totalCost: number;
  costPerPerson: number;
  month: string;
}

export interface Demographics {
  age: { name: string; value: number }[];
  race: { name: string; value: number }[];
  gender: { name: string; value: number }[];
  disabilityPercent: number;
}

export interface GeographicImpact {
  neighborhoods: { name: string; value: number }[];
  urbanRural: { name: string; value: number }[];
}

export interface Outcomes {
  householdsWaterAccess: number;
  healthImprovements: number;
  behaviorChanges: number;
}

export interface TheoryOfChange {
  activities: string;
  outputs: string;
  outcomes: string;
  impact: string;
}

export interface FinancialBreakdown {
  spending: { name: string; value: number }[];
  sources: { name: string; value: number }[];
  operatingReserveMonths: number;
}

export interface DataQuality {
  level: string;
  method: string;
  lastUpdated: string;
}

export interface SaasKPI {
  id: string;
  name: string;
  value: string | number;
  explanation: string;
  changePercent: number;
  trend: 'up' | 'down' | 'neutral';
  sparkline: number[];
}

export interface DashboardStats {
  totalPeopleServed: number;
  totalBudgetSpent: number;
  avgCostPerPerson: number;
  programs: ProgramMetric[];
  demographics: Demographics;
  geographic: GeographicImpact;
  outcomesDetails: Outcomes;
  theoryOfChange: TheoryOfChange;
  financials: FinancialBreakdown;
  dataQuality: DataQuality;
  sroi: number;
  benchmarkComparison: string;
  saasKpis: SaasKPI[];
}

export interface GeneratedReport {
  title: string;
  content: string;
  generatedAt: string;
}

export type ReportFrequency = 'weekly' | 'monthly' | 'quarterly' | 'annual';

export type UserRole =
  | 'admin'
  | 'grant_coordinator'
  | 'impact_analyst'
  | 'compliance_officer'
  | 'data_entry'
  | 'viewer';

export const USER_ROLES: UserRole[] = [
  'admin',
  'grant_coordinator',
  'impact_analyst',
  'compliance_officer',
  'data_entry',
  'viewer',
];

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Full system administration',
  grant_coordinator: 'Manage grant lifecycle',
  impact_analyst: 'Manage impact metrics',
  compliance_officer: 'Audit-only access',
  data_entry: 'Enter raw metric data',
  viewer: 'Read-only dashboard',
};

export interface RolePermission {
  canManageTeam: boolean;
  canEditGrants: boolean;
  canEditMetrics: boolean;
  canDeleteGrants: boolean;
  canExportData: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermission> = {
  admin: { canManageTeam: true, canEditGrants: true, canEditMetrics: true, canDeleteGrants: true, canExportData: true },
  grant_coordinator: { canManageTeam: false, canEditGrants: true, canEditMetrics: false, canDeleteGrants: false, canExportData: true },
  impact_analyst: { canManageTeam: false, canEditGrants: false, canEditMetrics: true, canDeleteGrants: false, canExportData: true },
  compliance_officer: { canManageTeam: false, canEditGrants: false, canEditMetrics: false, canDeleteGrants: false, canExportData: true },
  data_entry: { canManageTeam: false, canEditGrants: false, canEditMetrics: true, canDeleteGrants: false, canExportData: false },
  viewer: { canManageTeam: false, canEditGrants: false, canEditMetrics: false, canDeleteGrants: false, canExportData: false },
};

export interface OrgMember {
  userId: string;
  email: string;
  role: UserRole;
  joinedAt: string;
  docId?: string;
}

export interface Invitation {
  id: string;
  email: string;
  orgId: string;
  orgName: string;
  role: UserRole;
  invitedBy: string;
  invitedByEmail: string;
  status: 'pending';
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  creatorId: string;
  createdAt: string;
  memberCount: number;
}

/**
 * THE AUTHORITATIVE PLAN MODEL.
 * `seatLimit` is null for an unlimited-seat plan (currently Growth).
 */
export type PlanId = 'trial' | 'starter' | 'growth' | 'pro';

export const PLAN_SEAT_LIMITS: Record<PlanId, number | null> = {
  trial: 8,
  starter: 3,
  growth: null,
  pro: 20,
};

export const PLAN_LABELS: Record<PlanId, string> = {
  trial: 'Trial',
  starter: 'Compass Starter',
  growth: 'Compass Growth',
  pro: 'Compass Pro',
};

export interface OrgBilling {
  plan: PlanId;
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  /** Null means unlimited seats. */
  seatLimit: number | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  currentOrgId?: string;
  hasSeenWelcome?: boolean;
}

/** One measurement of a KPI for a reporting period. `date` is the last day of the period (YYYY-MM-DD). */
export interface KpiEntry { id: string; date: string; value: number; }
/** A count of people in one group, such as "Ages 16-24". */
export interface BreakdownRow { id: string; label: string; count: number; }
export type KpiReportingPeriod = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'cumulative';
export interface GrantKPI {
  id: string; name: string; target: number; current: number; unit: string;
  /** KPIs sharing this id are the same outcome reported to different funders (counted once, each with its own target). */
  sharedKpiId?: string;
  /** Where the number started, so progress can be shown as change from baseline. */
  baseline?: number;
  reportingPeriod?: KpiReportingPeriod;
  dataSource?: string;
  definition?: string;
  /** Which funder requires this KPI. */
  requiredBy?: string;
  /** A value per period. The latest entry is also saved as `current`. */
  history?: KpiEntry[];
  /** Who was served, counted by age and by ethnicity. */
  ageBreakdown?: BreakdownRow[];
  ethnicityBreakdown?: BreakdownRow[];
}
export interface SubgranteeKPI { id: string; name: string; target: number; current: number; unit: string; }
export type PartnerReportingStatus = 'current' | 'late' | 'not_started';
export interface Subgrantee {
  id: string; name: string; allocatedAmount: number; status: 'active' | 'pending' | 'completed'; kpis: SubgranteeKPI[];
  /** Money the partner has drawn down so far against allocatedAmount. */
  drawnAmount?: number;
  reportingStatus?: PartnerReportingStatus;
}
export interface Opportunity { id: string; funder: string; name: string; amount: number; matchScore: number; deadline: string; description: string; whyMatch: string; }

export type BudgetCategory = 'personnel' | 'supplies' | 'partner_pass_through' | 'other';
export interface BudgetLine { id: string; category: BudgetCategory; budgeted: number; spent: number; }
export type ReportStatus = 'upcoming' | 'submitted' | 'late';
/** A report a funder expects. Status is worked out from the dates, never stored. */
export interface ReportDue {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  dueDate: string;
  /** Who is responsible. */
  owner: string;
  /** Where reminders go. When empty, reminders go to the organization's admins. */
  ownerEmail?: string;
  /** YYYY-MM-DD once the report has been sent to the funder. */
  submittedDate?: string;
}
export type GrantReportFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'none';

export interface Grant {
  id: string; name: string; funder: string; amount: number; startDate: string; endDate: string;
  status: 'active' | 'pending' | 'completed'; kpis: GrantKPI[]; subgrantees?: Subgrantee[]; spentAmount?: number;
  /** The program this grant funds. Unset means the grant is not assigned to a program yet. */
  programId?: string;
  restriction?: 'restricted' | 'unrestricted';
  allowedUses?: string;
  matchRequired?: number;
  matchSecured?: number;
  reportFrequency?: GrantReportFrequency;
  budgetLines?: BudgetLine[];
  reports?: ReportDue[];
}

/** A program is what the organization runs; several grants from different funders can pay for it. */
export interface Program {
  id: string;
  name: string;
  description: string;
  populationServed: string;
  startDate: string;
  endDate: string;
  /** What it costs to run the program. Used only to work out the funding gap; left unset if unknown. */
  budgetNeed?: number;
}
export interface AIAnalysisData { keyFindings: string[]; recommendations: string[]; risks: string[]; trendAnalysis: string; readinessScore: number; }
