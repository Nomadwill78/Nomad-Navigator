export interface ProgramMetric {
  id: string;
  name: string;
  peopleServed: number;
  totalCost: number;
  costPerPerson: number; // ROI metric
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
  
  // New Enhanced Fields
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

/**
 * THE AUTHORITATIVE ROLE MODEL.
 *
 * These six roles are the single source of truth for authorization. `firestore.rules`
 * and `security_spec.md` both follow this list — if you change it here, change it in
 * both of those files in the same commit, or the UI and the database will disagree
 * about who can do what.
 *
 * (An older four-role model — admin/editor/viewer/uploader — existed in the security
 * spec and is now retired. It never matched the app.)
 */
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

/** One line per role, shown in the invite picker and the members table. */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Full system administration',
  grant_coordinator: 'Manage grant lifecycle',
  impact_analyst: 'Manage impact metrics',
  compliance_officer: 'Audit-only access',
  data_entry: 'Enter raw metric data',
  viewer: 'Read-only dashboard',
};

/**
 * Maximum members per organization, counting accepted members and pending invitations.
 * Enforced in the UI here and hard-enforced in `firestore.rules` (`memberCount <= 8`).
 * Changing the limit means changing BOTH — this constant and the number in the rules.
 */
export const SEAT_LIMIT = 8;

export interface RolePermission {
  canManageTeam: boolean;
  canEditGrants: boolean;
  canEditMetrics: boolean;
  canDeleteGrants: boolean;
  canExportData: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermission> = {
  admin: {
    canManageTeam: true,
    canEditGrants: true,
    canEditMetrics: true,
    canDeleteGrants: true,
    canExportData: true,
  },
  grant_coordinator: {
    canManageTeam: false,
    canEditGrants: true,
    canEditMetrics: false,
    canDeleteGrants: false,
    canExportData: true,
  },
  impact_analyst: {
    canManageTeam: false,
    canEditGrants: false,
    canEditMetrics: true,
    canDeleteGrants: false,
    canExportData: true,
  },
  compliance_officer: {
    canManageTeam: false,
    canEditGrants: false,
    canEditMetrics: false,
    canDeleteGrants: false,
    canExportData: true,
  },
  data_entry: {
    canManageTeam: false,
    canEditGrants: false,
    canEditMetrics: true,
    canDeleteGrants: false,
    canExportData: false,
  },
  viewer: {
    canManageTeam: false,
    canEditGrants: false,
    canEditMetrics: false,
    canDeleteGrants: false,
    canExportData: false,
  },
};

export interface OrgMember {
  userId: string;
  email: string;
  role: UserRole;
  joinedAt: string;
  /** Firestore document id. Always the member's auth uid. */
  docId?: string;
}

/**
 * A pending invitation lives at `invitations/{lowercased-email}` — a top-level
 * collection, because the invitee is not yet a member of the org and therefore
 * cannot read anything underneath it. One pending invitation per email address.
 *
 * The document is deleted the moment it is accepted; a member doc replaces it.
 */
export interface Invitation {
  /** Document id — the invitee's email, lowercased and trimmed. */
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

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  currentOrgId?: string;
  /** True once this account has dismissed the one-time welcome step. */
  hasSeenWelcome?: boolean;
}

export interface GrantKPI {
  id: string;
  name: string;
  target: number;
  current: number;
  unit: string;
}

export interface SubgranteeKPI {
  id: string;
  name: string;
  target: number;
  current: number;
  unit: string;
}

export interface Subgrantee {
  id: string;
  name: string;
  allocatedAmount: number;
  status: 'active' | 'pending' | 'completed';
  kpis: SubgranteeKPI[];
}

export interface Opportunity {
  id: string;
  funder: string;
  name: string;
  amount: number;
  matchScore: number; // 0-100
  deadline: string;
  description: string;
  whyMatch: string;
}

export interface Grant {
  id: string;
  name: string;
  funder: string;
  amount: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'pending' | 'completed';
  kpis: GrantKPI[];
  subgrantees?: Subgrantee[];
  spentAmount?: number;
}

// New Types for AI Analysis
export interface AIAnalysisData {
  keyFindings: string[];
  recommendations: string[];
  risks: string[];
  trendAnalysis: string;
  readinessScore: number;
}