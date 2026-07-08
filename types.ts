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

export type UserRole = 
  | 'admin' 
  | 'grant_coordinator' 
  | 'impact_analyst' 
  | 'compliance_officer' 
  | 'data_entry' 
  | 'viewer';

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