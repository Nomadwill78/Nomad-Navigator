import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  PieChart as PieIcon, 
  Activity, 
  LayoutDashboard, 
  Settings, 
  Sparkles,
  Menu,
  MapPin,
  Target,
  ShieldCheck,
  Scale,
  ArrowRight,
  ChevronDown,
  Database,
  Download,
  CheckCircle2,
  Circle,
  CreditCard,
  Layers
} from 'lucide-react';
import { exportDashboardPDF } from './src/lib/exportUtils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
  LabelList
} from 'recharts';
import { StatCard } from './components/StatCard';
import { ImpactReportModal } from './components/ImpactReportModal';
import { DataManagementView } from './components/DataManagementView';
import { GrantTrackingView } from './components/GrantTrackingView';
import { AnalysisView } from './components/AnalysisView';
import { GrantDiscoveryView } from './components/GrantDiscoveryView';
import { TeamManagementView } from './components/TeamManagementView';
import { BillingView } from './components/BillingView';
import { LoginView } from './components/LoginView';
import { TrialSignupView } from './components/TrialSignupView';
import { SalesPageView } from './components/SalesPageView';
import { OnboardingView } from './components/OnboardingView';
import { SettingsView } from './components/SettingsView';
import { WelcomeView } from './components/WelcomeView';
import { DemoModeBanner, DemoHint } from './components/DemoTour';
import { BrandLogo } from './components/BrandLogo';
import { KpiSidebar } from './components/KpiSidebar';
import { useAuth } from './src/contexts/AuthContext';
import { useOrgData } from './src/hooks/useOrgData';
import { computeGrantTotals, computeFundingDiversity, rollUpKpis } from './src/lib/overview';
import { filterGrants, availableYears, isFilterActive, NO_FILTER, GrantFilter } from './src/lib/programs';
import { ProgramsView } from './components/ProgramsView';
import { generateImpactReport } from './services/geminiService';
import { DashboardStats, ProgramMetric, Grant, Opportunity, Program, ROLE_PERMISSIONS } from './types';
import { Analytics } from '@vercel/analytics/react';

// --- Chart ramps ---
// Named for what they mean, not for a hue. Teal reads impact, brass reads money
// and governance, slate stays neutral. See DESIGN.md → Colors → Chart Ramps.
const COLORS = {
  impact: ['#4fc4d3', '#6fd2de', '#9ae0e8', '#c4eef2'],
  impactDeep: ['#4fc4d3', '#3faebd', '#2f8b98', '#256e78'],
  funding: ['#cba85c', '#e7ce88', '#b8905a', '#8a6d3f'],
  neutral: ['#6f86a6', '#93a6c2', '#b7c4d8', '#d8e0ec']
};

// --- Sample data ---
// EVERYTHING BELOW IS SAMPLE CONTENT AND IS ONLY EVER SHOWN IN DEMO MODE.
// A real organization starts empty and fills up from its own entries; sample
// numbers are never seeded into an org's Firestore data.
const SAMPLE_GRANTS: Grant[] = [
  {
    id: 'g1',
    name: 'Clean Water Initiative - Phase II',
    funder: 'Bill & Melinda Gates Foundation',
    amount: 250000,
    spentAmount: 185000,
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    status: 'active',
    kpis: [
      { id: 'k1', name: 'Household Connections', target: 5000, current: 3200, unit: 'wells' },
      { id: 'k2', name: 'Community Workshops', target: 50, current: 42, unit: 'sessions' },
      { id: 'k3', name: 'Reduction in Cholera', target: 20, current: 15, unit: '%' }
    ],
    subgrantees: [
      {
        id: 's1',
        name: 'AquaAid Africa',
        allocatedAmount: 75000,
        status: 'active',
        kpis: [
          { id: 'sk1', name: 'Well Restorations', target: 200, current: 154, unit: 'wells' }
        ]
      },
      {
        id: 's2',
        name: 'Village Health Partners',
        allocatedAmount: 45000,
        status: 'active',
        kpis: [
          { id: 'sk2', name: 'Sanitation Kits', target: 1000, current: 920, unit: 'kits' }
        ]
      }
    ]
  },
  {
    id: 'g2',
    name: 'Rural Sanitation Program',
    funder: 'World Bank Group',
    amount: 125000,
    spentAmount: 112500,
    startDate: '2024-06-01',
    endDate: '2025-05-31',
    status: 'active',
    kpis: [
      { id: 'k4', name: 'Toilet Installations', target: 1000, current: 850, unit: 'units' },
      { id: 'k5', name: 'Hygiene Kits Distributed', target: 5000, current: 4800, unit: 'kits' }
    ],
    subgrantees: []
  }
];

const SAMPLE_PROGRAMS: ProgramMetric[] = [
  { id: '1', name: 'Jan', month: 'Jan', peopleServed: 1200, totalCost: 15000, costPerPerson: 12.5 },
  { id: '2', name: 'Feb', month: 'Feb', peopleServed: 1800, totalCost: 18500, costPerPerson: 10.2 },
  { id: '3', name: 'Mar', month: 'Mar', peopleServed: 2200, totalCost: 21000, costPerPerson: 9.5 },
  { id: '4', name: 'Apr', month: 'Apr', peopleServed: 2100, totalCost: 23000, costPerPerson: 10.9 },
  { id: '5', name: 'May', month: 'May', peopleServed: 2800, totalCost: 26000, costPerPerson: 9.2 },
  { id: '6', name: 'Jun', month: 'Jun', peopleServed: 3500, totalCost: 29000, costPerPerson: 8.2 },
];

const DEMO_GRANTS: Grant[] = [
  {
    id: 'dg1',
    programId: 'dp1',
    name: 'National Solar Expansion',
    funder: 'UNDP',
    amount: 1500000,
    spentAmount: 980000,
    startDate: '2025-01-01',
    endDate: '2026-12-31',
    status: 'active',
    kpis: [
      { id: 'dk1', name: 'Household Electrification', target: 25000, current: 18400, unit: 'homes' },
      { id: 'dk2', name: 'CO2 Offset', target: 50000, current: 32000, unit: 'tons' },
      { id: 'dk3', name: 'Local Technician Jobs', target: 200, current: 145, unit: 'jobs' }
    ],
    subgrantees: [
      {
        id: 'ds1',
        name: 'SunPower Kenya',
        allocatedAmount: 400000,
        status: 'active',
        kpis: [
          { id: 'dsk1', name: 'Grid Mini-Connections', target: 5000, current: 4200, unit: 'connections' }
        ]
      }
    ]
  },
  {
    id: 'dg2',
    programId: 'dp1',
    name: 'West African Water Initiative',
    funder: 'USAID',
    amount: 500000,
    spentAmount: 420000,
    startDate: '2025-03-01',
    endDate: '2026-03-01',
    status: 'active',
    kpis: [
      { id: 'dk4', name: 'Boreholes Completed', target: 150, current: 92, unit: 'wells' }
    ],
    subgrantees: []
  }
];

const DEMO_PROGRAMS: Program[] = [
  {
    id: 'dp1',
    name: 'Sample: Energy and Water Access',
    description: 'Sample program for demo mode only.',
    populationServed: 'Sample communities',
    startDate: '2025-01-01',
    endDate: '2026-12-31',
  },
];

// Sample deadlines are computed relative to today rather than hardcoded, so the
// "AI found these opportunities" preview never shows a deadline that has already
// passed, no matter when someone views the demo.
function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const SAMPLE_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'o1',
    funder: 'Bloomberg Philanthropies',
    name: 'Global Water Security Grant',
    amount: 750000,
    matchScore: 94,
    deadline: daysFromNow(45),
    description: 'Funding for innovative infrastructure projects in developing urban centers focused on sustainable water management.',
    whyMatch: 'Matches your current 92% performance in Urban WASH projects and your high SROI in East Africa.'
  },
  {
    id: 'o2',
    funder: 'World Health Organization',
    name: 'Community Hygiene Accelerator',
    amount: 200000,
    matchScore: 88,
    deadline: daysFromNow(61),
    description: 'Scaling hygiene education and facility installations in high-density informal settlements.',
    whyMatch: 'Strong alignment with your "Rural Sanitation Program" outcomes and your verified data methodology.'
  }
];

const SAMPLE_STATS: DashboardStats = {
  totalPeopleServed: 13600,
  totalBudgetSpent: 132500,
  avgCostPerPerson: 9.74,
  programs: SAMPLE_PROGRAMS,
  demographics: {
    age: [
      { name: 'Youth (0-17)', value: 35 },
      { name: 'Adults (18-64)', value: 52 },
      { name: 'Seniors (65+)', value: 13 },
    ],
    race: [
      { name: 'Black/AA', value: 45 },
      { name: 'Hispanic/Latino', value: 28 },
      { name: 'White', value: 18 },
      { name: 'Asian', value: 6 },
      { name: 'Other', value: 3 },
    ],
    gender: [
      { name: 'Female', value: 58 },
      { name: 'Male', value: 40 },
      { name: 'Non-binary', value: 2 },
    ],
    disabilityPercent: 12
  },
  geographic: {
    neighborhoods: [
      { name: 'South Memphis', value: 32 },
      { name: 'Whitehaven', value: 24 },
      { name: 'Frayser', value: 18 },
      { name: 'Orange Mound', value: 15 },
      { name: 'Parkway Village', value: 11 },
    ],
    urbanRural: [
      { name: 'Urban', value: 89 },
      { name: 'Rural', value: 11 },
    ]
  },
  outcomesDetails: {
    householdsWaterAccess: 13600,
    healthImprovements: 8450, 
    behaviorChanges: 9200 
  },
  theoryOfChange: {
    activities: "85 Water Systems Installed",
    outputs: "13,600 People Served",
    outcomes: "47% Less Waterborne Illness",
    impact: "Generational Health Equity"
  },
  financials: {
    spending: [
      { name: 'Program', value: 82 },
      { name: 'Admin', value: 12 },
      { name: 'Fundraising', value: 6 },
    ],
    sources: [
      { name: 'Foundation', value: 45 },
      { name: 'Govt', value: 30 },
      { name: 'Individual', value: 20 },
      { name: 'Earned', value: 5 },
    ],
    operatingReserveMonths: 6
  },
  dataQuality: {
    level: "High",
    method: "Mixed-methods RCT",
    lastUpdated: "June 30, 2025"
  },
  sroi: 4.50,
  benchmarkComparison: "32% below sector avg",
  saasKpis: [
    {
      id: 'kpi_active_users',
      name: 'Active Users',
      value: '4,250',
      explanation: 'SaaS platform accounts actively logging impact metrics and program updates weekly.',
      changePercent: 14.8,
      trend: 'up',
      sparkline: [3100, 3400, 3800, 4100, 4250]
    },
    {
      id: 'kpi_donations',
      name: 'Donations Processed',
      value: '$145,200',
      explanation: 'Direct fundraising and grant payments processed securely via Stripe Integration.',
      changePercent: 22.4,
      trend: 'up',
      sparkline: [110000, 118000, 130000, 135000, 145200]
    },
    {
      id: 'kpi_volunteer_hours',
      name: 'Volunteer Hours Logged',
      value: '1,840 hrs',
      explanation: 'Verified hours contributed by field agents and community workshop leads.',
      changePercent: 8.3,
      trend: 'up',
      sparkline: [1500, 1600, 1680, 1720, 1840]
    },
    {
      id: 'kpi_completions',
      name: 'Successful Program Completions',
      value: '94.2%',
      explanation: 'Successful delivery rate of water purification and health education campaigns.',
      changePercent: 3.1,
      trend: 'up',
      sparkline: [90.5, 91.2, 92.0, 93.5, 94.2]
    }
  ]
};

const DEMO_STATS: DashboardStats = {
  ...SAMPLE_STATS,
  totalPeopleServed: 54200,
  totalBudgetSpent: 450000,
  avgCostPerPerson: 8.30,
  sroi: 5.2,
  benchmarkComparison: "45% below sector avg",
  theoryOfChange: {
    activities: "215 Solar Wells Installed",
    outputs: "54,200 People Empowered",
    outcomes: "62% Improvement in Public Health",
    impact: "Regional Economic Stability"
  },
  saasKpis: [
    {
      id: 'kpi_active_users',
      name: 'Active Users',
      value: '12,400',
      explanation: 'SaaS platform accounts actively logging impact metrics and program updates weekly.',
      changePercent: 35.2,
      trend: 'up',
      sparkline: [8000, 9200, 10500, 11400, 12400]
    },
    {
      id: 'kpi_donations',
      name: 'Donations Processed',
      value: '$485,000',
      explanation: 'Direct fundraising and grant payments processed securely via Stripe Integration.',
      changePercent: 48.6,
      trend: 'up',
      sparkline: [300000, 350000, 390000, 440000, 485000]
    },
    {
      id: 'kpi_volunteer_hours',
      name: 'Volunteer Hours Logged',
      value: '5,120 hrs',
      explanation: 'Verified hours contributed by field agents and community workshop leads.',
      changePercent: 18.5,
      trend: 'up',
      sparkline: [4100, 4300, 4600, 4900, 5120]
    },
    {
      id: 'kpi_completions',
      name: 'Successful Program Completions',
      value: '98.7%',
      explanation: 'Successful delivery rate of water purification and health education campaigns.',
      changePercent: 4.8,
      trend: 'up',
      sparkline: [93.2, 95.0, 96.8, 97.9, 98.7]
    }
  ]
};

const App: React.FC = () => {
  const {
    user, profile, organization, role, loading, invitation,
    logout, createOrg, acceptInvitation, resendVerificationEmail, dismissWelcome,
  } = useAuth();
  const permissions = role ? ROLE_PERMISSIONS[role] : null;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // On phones/small tablets the sidebar is an off-canvas drawer rather than a
  // permanent column, so it should start closed there instead of covering the page.
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) {
      setIsSidebarOpen(false);
    }
  }, []);
  const [activeView, setActiveView] = useState<'dashboard' | 'data' | 'grants' | 'programs' | 'analysis' | 'discovery' | 'team' | 'billing' | 'settings'>('dashboard');
  // True while the user has a CSV loaded into the Manage Data importer but hasn't
  // confirmed it yet. Used to warn before navigating away, so the mapped data isn't
  // silently thrown away.
  const [hasPendingImport, setHasPendingImport] = useState(false);
  const navigateTo = (view: typeof activeView) => {
    if (hasPendingImport && view !== 'data') {
      const proceed = window.confirm(
        "You have an unfinished CSV import on the Manage Data page. Leaving now will discard it. Continue?"
      );
      if (!proceed) return;
    }
    setActiveView(view);
    // On mobile the sidebar is an overlay drawer, so close it once the user has
    // picked a destination instead of leaving it covering the page they asked for.
    if (window.matchMedia('(max-width: 767px)').matches) {
      setIsSidebarOpen(false);
    }
  };
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [trajectoryRange, setTrajectoryRange] = useState<'6M' | '1Y' | 'ALL'>('ALL');

  // Grants and metrics live in Firestore under this organization, so every member
  // of the org sees the same numbers. Demo mode is served from memory and never written.
  const { stats, grants, programs, createProgram, updateProgram, deleteProgram, setStats, createGrant, updateGrant, deleteGrant, syncStatus, syncError, hasUnsavedChanges, retrySync } = useOrgData(
    organization?.id ?? null,
    isDemoMode,
    DEMO_STATS,
    DEMO_GRANTS,
    DEMO_PROGRAMS
  );

  const sparkImpact = (stats.programs || []).map(p => ({ value: p.peopleServed }));
  const sparkRoi = (stats.programs || []).map(p => ({ value: p.costPerPerson }));

  // Every Overview figure below is computed from the grants the user entered.
  // Nothing here is a default, an estimate, or a placeholder number.
  const [filter, setFilter] = useState<GrantFilter>(NO_FILTER);
  const filtered = useMemo(() => filterGrants(grants, filter), [grants, filter]);
  const filterOn = isFilterActive(filter);
  const years = useMemo(() => availableYears(grants), [grants]);
  const totals = useMemo(() => computeGrantTotals(filtered), [filtered]);
  const diversity = useMemo(() => computeFundingDiversity(filtered), [filtered]);
  const kpiRollup = useMemo(() => rollUpKpis(filtered), [filtered]);
  // People served is entered for the whole organization, so a per-program or per-year
  // spend divided by it would be a made-up ratio. It is only shown when nothing is filtered.
  const costPerPerson = !filterOn && stats.totalPeopleServed > 0 && totals.totalSpent > 0 ? totals.totalSpent / stats.totalPeopleServed : null;
  const urbanShare = stats.geographic.urbanRural.find(u => /urban/i.test(u.name))?.value;
  const hasNoData = !isDemoMode && stats.totalPeopleServed === 0 && (stats.programs || []).length === 0;

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportContent, setReportContent] = useState<string>("");
  
  // Connectivity Listeners to track network changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Stripe donation link. Opens a hosted Stripe Payment Link — no backend
  // needed, so it works on the static Vercel deployment. Create the link in the
  // Stripe Dashboard (Payment Links → let customers choose the amount) and paste
  // its URL below. Until a real link is set, the button shows a friendly notice
  // instead of a broken error.
  const DONATION_LINK = 'https://buy.stripe.com/9B6fZjgOS3NSfWC5DQ8ww0e';

  const handleStripePayment = () => {
    if (DONATION_LINK.includes('REPLACE_WITH_YOUR_PAYMENT_LINK')) {
      alert('Donations are being set up — thank you for your support! Please check back soon.');
      return;
    }
    window.location.href = DONATION_LINK;
  };

  // Handle Payment Success/Cancel Notifications
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      alert('Thank you for your donation!');
      // Clear the param
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('payment') === 'cancel') {
      alert('Payment was cancelled.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('checkout') === 'success') {
      alert("You're subscribed! It may take a moment for your new plan to appear.");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('checkout') === 'cancel') {
      alert('Checkout was cancelled — your plan has not changed.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Public free-trial signup page — no login required
  if (typeof window !== 'undefined' &&
      (window.location.pathname.replace(/\/+$/, '') === '/free-trial' ||
       new URLSearchParams(window.location.search).has('trial'))) {
    return <TrialSignupView />;
  }

  // Public pricing / sales page — no login required
  if (typeof window !== 'undefined' &&
      window.location.pathname.replace(/\/+$/, '') === '/pricing') {
    return <SalesPageView />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <Activity size={48} className="text-teal animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  if (!organization) {
    return (
      <OnboardingView
        userEmail={user.email || ''}
        onCreateOrg={createOrg}
        invitation={invitation}
        emailVerified={user.emailVerified}
        onAcceptInvitation={acceptInvitation}
        onResendVerification={resendVerificationEmail}
      />
    );
  }

  // Shown exactly once per account, right after org setup or joining — the
  // "Complete Your Compass" checklist below picks up from here.
  if (!profile?.hasSeenWelcome) {
    return <WelcomeView organizationName={organization.name} onDismiss={dismissWelcome} />;
  }

  const handleGenerateReport = async (frequency?: any) => {
    setIsReportModalOpen(true);
    
    // If called without a valid frequency string (e.g. from onClick event), just open modal
    if (!frequency || typeof frequency !== 'string') {
      setReportContent("");
      setIsGeneratingReport(false);
      return;
    }

    setIsGeneratingReport(true);
    setReportContent(""); 
    
    try {
      const report = await generateImpactReport(stats, frequency as any);
      setReportContent(report);
    } catch (error) {
      setReportContent("An error occurred while generating the report. Please try again later.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const isQualityAlert = isDataQualityLow(stats.dataQuality?.level);

  return (
    <div className="compass-canvas min-h-screen bg-ink flex font-sans text-parchment">

      {/* Mobile backdrop: tapping outside the open drawer closes it */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-30"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: a permanent column on desktop (collapses to icons-only),
          an off-canvas drawer on mobile (slides in over the content). */}
      <aside
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } max-md:w-64 bg-abyss text-parchment transition-all duration-300 ease-in-out fixed h-full z-20 max-md:z-40 flex flex-col shadow-2xl border-r border-hairline/50 ${
          isSidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
        }`}
      >
        <div className="h-20 flex items-center justify-start px-5 border-b border-hairline/40">
          <BrandLogo size={32} showText={isSidebarOpen} variant="light" />
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2">
          {isDemoMode ? (
            <DemoHint text="Core Dashboard View" position="right">
              <NavItem 
                icon={<LayoutDashboard size={20} />} 
                label="Impact Overview" 
                active={activeView === 'dashboard'} 
                isOpen={isSidebarOpen} 
                onClick={() => navigateTo('dashboard')}
              />
            </DemoHint>
          ) : (
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label="Impact Overview" 
              active={activeView === 'dashboard'} 
              isOpen={isSidebarOpen} 
              onClick={() => navigateTo('dashboard')}
            />
          )}

          {isDemoMode ? (
            <DemoHint text="External Audit Tracking" position="right">
              <NavItem 
                icon={<Target size={20} />} 
                label="Grant Tracking" 
                active={activeView === 'grants'} 
                isOpen={isSidebarOpen} 
                onClick={() => navigateTo('grants')}
              />
            </DemoHint>
          ) : (
            <NavItem 
              icon={<Target size={20} />} 
              label="Grant Tracking" 
              active={activeView === 'grants'} 
              isOpen={isSidebarOpen} 
              onClick={() => navigateTo('grants')}
            />
          )}

          <NavItem
            icon={<Layers size={20} />}
            label="Programs"
            active={activeView === 'programs'}
            isOpen={isSidebarOpen}
            onClick={() => navigateTo('programs')}
          />

          <NavItem 
            icon={<Sparkles size={20} />} 
            label="Grant Discovery" 
            active={activeView === 'discovery'} 
            isOpen={isSidebarOpen} 
            onClick={() => navigateTo('discovery')}
          />

          {isDemoMode ? (
            <DemoHint text="Real-time Metric Tuning" position="right">
              <NavItem 
                icon={<Database size={20} />} 
                label="Manage Data" 
                active={activeView === 'data'} 
                isOpen={isSidebarOpen} 
                onClick={() => navigateTo('data')}
                alert={isQualityAlert}
              />
            </DemoHint>
          ) : (
            <NavItem 
              icon={<Database size={20} />} 
              label="Manage Data" 
              active={activeView === 'data'} 
              isOpen={isSidebarOpen} 
              onClick={() => navigateTo('data')}
              alert={isQualityAlert}
            />
          )}
          <div className="pt-4 pb-2 px-3">
            <p className={`text-[10px] font-mono2 text-inkfaint uppercase tracking-[0.2em] ${!isSidebarOpen && 'hidden'}`}>Preview Features</p>
          </div>
          {isDemoMode ? (
            <DemoHint text="Cross-Source Analytics" position="right">
              <NavItem 
                icon={<PieIcon size={20} />} 
                label="Analysis Deep Dive" 
                active={activeView === 'analysis'} 
                isOpen={isSidebarOpen} 
                onClick={() => navigateTo('analysis')}
              />
            </DemoHint>
          ) : (
            <NavItem 
              icon={<PieIcon size={20} />} 
              label="Analysis Deep Dive" 
              active={activeView === 'analysis'} 
              isOpen={isSidebarOpen} 
              onClick={() => navigateTo('analysis')}
            />
          )}
          <button 
            onClick={() => setIsDemoMode(!isDemoMode)}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-200 group ${
              isDemoMode
                ? 'bg-brass/10 text-brassbright border border-brass/25'
                : 'text-inkmute hover:bg-surface2 hover:text-parchment border border-transparent'
            }`}
          >
            <Sparkles size={20} className={isDemoMode ? 'animate-pulse' : ''} />
            {isSidebarOpen && <span className="font-medium text-sm whitespace-nowrap">Demo Mode</span>}
            {isSidebarOpen && isDemoMode && (
              <div className="ml-auto w-2 h-2 rounded-full bg-brass shadow-[0_0_8px_rgba(203,168,92,0.7)]"></div>
            )}
          </button>
          
          {role && ROLE_PERMISSIONS[role].canManageTeam && (
            <NavItem icon={<Users size={20} />} label="Team Management" active={activeView === 'team'} isOpen={isSidebarOpen} onClick={() => navigateTo('team')} />
          )}
          {role && ROLE_PERMISSIONS[role].canManageTeam && (
            <NavItem icon={<CreditCard size={20} />} label="Billing" active={activeView === 'billing'} isOpen={isSidebarOpen} onClick={() => navigateTo('billing')} />
          )}
          <NavItem icon={<MapPin size={20} />} label="Geographic Reach" isOpen={isSidebarOpen} comingSoon />
          <NavItem icon={<DollarSign size={20} />} label="Financials" isOpen={isSidebarOpen} comingSoon />
          
          <div className="px-3 pt-4 border-t border-hairline/40 mt-4">
            <button
              onClick={() => handleStripePayment()}
              className={`w-full group flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-widest transition-all duration-300 ${
                isSidebarOpen
                  ? 'bg-gradient-to-b from-brassbright to-brass hover:brightness-105 shadow-lg shadow-brass/25 text-[#26200e]'
                  : 'bg-brass/15 text-brass hover:bg-brass/25'
              }`}
              title="Support Project"
            >
              <DollarSign size={18} className="shrink-0" />
              {isSidebarOpen && <span>Support Project</span>}
            </button>
          </div>
        </nav>

        <div className="p-3 border-t border-hairline/40 bg-abyss">
           <NavItem
             icon={<Settings size={20} />}
             label="Settings"
             active={activeView === 'settings'}
             isOpen={isSidebarOpen}
             onClick={() => navigateTo('settings')}
           />
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 max-md:ml-0 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        
        {/* Header */}
        <header className="h-20 bg-abyss/85 backdrop-blur-md border-b border-hairline/50 sticky top-0 z-10 px-8 flex items-center justify-between">
          <DemoModeBanner isActive={isDemoMode} onClose={() => setIsDemoMode(false)} />
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-inkmute hover:text-parchment hover:bg-surface2 rounded-lg transition-all"
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="flex gap-3">
            {isOnline ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal/10 text-teal text-xs font-semibold rounded-full border border-teal/25">
                <div className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse"></div>
                <span>Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brass/10 text-brassbright text-xs font-semibold rounded-full border border-brass/25">
                <div className="w-1.5 h-1.5 rounded-full bg-brass"></div>
                <span>Working Offline (Cached)</span>
              </div>
            )}

            {isDemoMode ? (
              <div
                className="flex items-center gap-2 px-3 py-1.5 bg-brass/10 text-brassbright text-xs font-semibold rounded-full border border-brass/25"
                title="Sample data for exploring the product — never saved to your organization"
              >
                <ShieldCheck size={14} />
                <span>Demo Data</span>
              </div>
            ) : stats.dataQuality.level && stats.dataQuality.level !== 'Not set' ? (
              <div
                className="flex items-center gap-2 px-3 py-1.5 bg-teal/10 text-teal text-xs font-semibold rounded-full border border-teal/25"
                title={`Self-reported by your organization · ${stats.dataQuality.method}`}
              >
                <ShieldCheck size={14} />
                <span>Data Status: {stats.dataQuality.level}</span>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 text-inkfaint text-xs font-semibold rounded-full border border-hairline"
                title="Set a data quality level in Manage Data once you've entered your numbers"
              >
                <ShieldCheck size={14} />
                <span>Data Status: Not Set</span>
              </div>
            )}
            <div className="flex items-center gap-3 pl-4 border-l border-hairline/50">
               <div className="text-right hidden sm:block">
                  <button
                    onClick={() => navigateTo('settings')}
                    className="text-xs font-bold text-parchment hover:text-teal transition-colors"
                    title="Account settings"
                  >
                    {profile?.displayName}
                  </button>
                  <br />
                  <button
                    onClick={logout}
                    className="text-[10px] text-inkfaint hover:text-brass font-bold uppercase transition-colors"
                  >
                    Sign Out
                  </button>
               </div>
               <button
                 onClick={() => navigateTo('settings')}
                 title="Account settings"
                 className="w-10 h-10 bg-gradient-to-br from-surface2 to-surface rounded-full flex items-center justify-center text-brass font-bold border border-brass/40 hover:border-brass/70 transition-colors shrink-0"
               >
                   {profile?.displayName?.charAt(0).toUpperCase() || 'U'}
               </button>
            </div>
          </div>
        </header>

        {(syncStatus === 'error' || !isOnline) && !isDemoMode && (
          <div
            role="alert"
            className={`px-8 py-3 text-sm flex items-center justify-between gap-4 border-b ${
              syncStatus === 'error'
                ? 'bg-rose-500/10 text-rose-100 border-rose-500/30'
                : 'bg-brass/10 text-brassbright border-brass/25'
            }`}
          >
            <span>
              <strong className="font-bold">
                {syncStatus === 'error' ? 'Your latest changes are not saved.' : 'You are offline.'}
              </strong>{' '}
              {syncStatus === 'error'
                ? syncError ?? 'Could not reach the database.'
                : 'You can keep working; changes are stored on this device and will sync automatically when you reconnect.'}
              {hasUnsavedChanges && syncStatus === 'error' && ' Your edits are being held on screen so nothing is lost.'}
            </span>
            {syncStatus === 'error' && (
              <button
                onClick={retrySync}
                className="shrink-0 px-3 py-1.5 rounded-lg border border-rose-400/40 text-xs font-bold hover:bg-rose-500/20 transition-colors"
              >
                Retry now
              </button>
            )}
          </div>
        )}


        {/* Dashboard Content */}
        <div className="p-8 max-w-7xl mx-auto space-y-8 pb-20">
          
          {activeView === 'data' ? (
            <DataManagementView stats={stats} onUpdate={setStats} onPendingImportChange={setHasPendingImport} />
          ) : activeView === 'grants' ? (
            <GrantTrackingView grants={grants} programs={programs} onCreateGrant={createGrant} onUpdateGrant={updateGrant} onDeleteGrant={deleteGrant} />
          ) : activeView === 'programs' ? (
            <ProgramsView
              programs={programs}
              grants={grants}
              canEdit={!!permissions?.canEditGrants}
              canDelete={!!permissions?.canDeleteGrants}
              onCreate={createProgram}
              onUpdate={updateProgram}
              onDelete={deleteProgram}
              onOpenGrants={() => navigateTo('grants')}
            />
          ) : activeView === 'analysis' ? (
            <AnalysisView stats={stats} grants={grants} />
          ) : activeView === 'discovery' ? (
            <GrantDiscoveryView opportunities={SAMPLE_OPPORTUNITIES} />
          ) : activeView === 'team' ? (
            <TeamManagementView />
          ) : activeView === 'billing' ? (
            <BillingView />
          ) : activeView === 'settings' ? (
            <SettingsView />
          ) : (
            <>
              {/* Dashboard Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
                <div>
                  <p className="font-mono2 text-[0.62rem] tracking-[0.28em] uppercase text-brass mb-1.5">Bearing · Program Impact</p>
                  <h1 className="font-display text-4xl font-semibold text-ivory tracking-tight">Program Impact</h1>
                  <p className="text-inkmute mt-1.5 flex items-center gap-2 text-sm font-mono2">
                    {`FY ${new Date().getFullYear()}`} <span className="w-1 h-1 rounded-full bg-inkfaint"></span>{' '}
                    {isDemoMode
                      ? 'Demo data'
                      : stats.dataQuality.lastUpdated && stats.dataQuality.lastUpdated !== '—'
                      ? `Updated ${stats.dataQuality.lastUpdated}`
                      : 'No data entered yet'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {permissions?.canExportData && (
                    <button 
                      onClick={() => exportDashboardPDF(stats, grants)}
                      className="flex items-center gap-2 bg-surface text-parchment border border-hairline hover:border-brass/50 hover:bg-surface2 px-4 py-2.5 rounded-lg font-medium transition-all active:scale-95 animate-in fade-in"
                      title="Export complete dashboard analytics as a PDF report"
                    >
                      <Download size={18} className="text-inkmute" />
                      Export PDF
                    </button>
                  )}

                  {isDemoMode ? (
                    <DemoHint text="Grant-Ready Markdown" position="bottom">
                      <button 
                        onClick={handleGenerateReport}
                        className="flex items-center gap-2 bg-gradient-to-b from-brassbright to-brass hover:brightness-105 text-[#26200e] px-5 py-2.5 rounded-lg shadow-lg shadow-brass/25 font-semibold transition-all active:scale-95"
                      >
                        <Sparkles size={18} />
                        Generate Grant Report
                      </button>
                    </DemoHint>
                  ) : (
                    <button 
                      onClick={handleGenerateReport}
                      className="flex items-center gap-2 bg-gradient-to-b from-brassbright to-brass hover:brightness-105 text-[#26200e] px-5 py-2.5 rounded-lg shadow-lg shadow-brass/25 font-semibold transition-all active:scale-95"
                    >
                      <Sparkles size={18} />
                      Generate Grant Report
                    </button>
                  )}
                </div>
              </div>

              {/* Filters: every grant-based figure below follows these two choices. */}
              {grants.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 bg-surface border border-hairline rounded-xl px-4 py-3">
                  <label className="flex items-center gap-2 text-xs text-inkfaint">
                    Program
                    <select
                      value={filter.programId}
                      onChange={(e) => setFilter({ ...filter, programId: e.target.value })}
                      className="bg-ink/70 border border-hairline rounded-lg px-2 py-1.5 text-sm text-parchment outline-none max-w-[16rem]"
                    >
                      <option value="all">All programs</option>
                      {programs.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                      <option value="none">Not assigned to a program</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-inkfaint">
                    Year
                    <select
                      value={String(filter.year)}
                      onChange={(e) => setFilter({ ...filter, year: e.target.value === 'all' ? 'all' : Number(e.target.value) })}
                      className="bg-ink/70 border border-hairline rounded-lg px-2 py-1.5 text-sm text-parchment outline-none"
                    >
                      <option value="all">All years</option>
                      {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </label>
                  {filterOn && (
                    <>
                      <button onClick={() => setFilter(NO_FILTER)} className="text-xs text-brassbright font-semibold underline">Clear filters</button>
                      <p className="text-xs text-inkmute basis-full">
                        Showing {filtered.length} of {grants.length} {grants.length === 1 ? 'grant' : 'grants'}. Funding, funders and key indicators follow the filter.
                        People served, demographics and service areas are entered for the whole organization, so they are not filtered.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* First-run guided path: a new organization starts empty, so tell it
                  what to do first rather than presenting a full dashboard with nothing
                  to explain it. Steps drop off the list as they're completed and the
                  whole checklist disappears once data and a grant both exist. */}
              {!isDemoMode && (hasNoData || grants.length === 0) && (
                <div className="bg-surface border border-brass/25 rounded-xl p-6 animate-in fade-in duration-500">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="p-3 bg-brass/10 border border-brass/25 rounded-xl text-brassbright shrink-0">
                      <Database size={22} />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-ivory mb-1">
                        Complete Your Compass
                      </h3>
                      <p className="text-sm text-inkmute leading-relaxed max-w-xl">
                        A few steps get this dashboard reading real numbers instead of an empty screen.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <ChecklistStep done label="Create organization" />
                    <ChecklistStep
                      done={!hasNoData}
                      label="Add your data"
                      actionLabel="Add data"
                      onAction={() => navigateTo('data')}
                    />
                    <ChecklistStep
                      done={grants.length > 0}
                      label="Track a grant"
                      actionLabel="Add grant"
                      onAction={() => navigateTo('grants')}
                    />
                    <ChecklistStep
                      done={false}
                      label="Generate a report"
                      actionLabel="Generate"
                      onAction={handleGenerateReport}
                    />
                  </div>
                  <p className="text-xs text-inkfaint mt-4">
                    Prefer to look around first?{' '}
                    <button onClick={() => setIsDemoMode(true)} className="text-brassbright hover:underline font-semibold">
                      Try Demo Mode
                    </button>{' '}
                    — sample data, never saved to your organization.
                  </p>
                </div>
              )}

              {/* Theory of Change Banner */}
              <div className="bg-surface rounded-xl p-0 border border-hairline relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-teal to-brass"></div>
                  <div className="p-6">
                    <h3 className="text-[0.62rem] font-mono2 text-brass uppercase tracking-[0.24em] mb-5 flex items-center gap-2">
                      <Activity size={14} className="text-teal" /> Theory of Change · Pathway
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center relative z-10">
                        <div className="flex flex-col group">
                            <span className="text-[0.6rem] text-inkfaint font-mono2 mb-1.5 uppercase tracking-[0.16em]">Input</span>
                            <span className="font-display text-xl font-semibold text-parchment group-hover:text-brassbright transition-colors">{totals.totalSpent > 0 ? `$${totals.totalSpent.toLocaleString()} spent` : 'No spending entered'}</span>
                        </div>
                        <div className="hidden md:flex justify-center text-inkfaint"><ArrowRight size={18} /></div>
                        <div className="flex flex-col group">
                            <span className="text-[0.6rem] text-inkfaint font-mono2 mb-1.5 uppercase tracking-[0.16em]">Activity</span>
                            <span className="font-display text-xl font-semibold text-parchment group-hover:text-brassbright transition-colors">{stats.theoryOfChange.activities}</span>
                        </div>
                        <div className="hidden md:flex justify-center text-inkfaint"><ArrowRight size={18} /></div>
                        <div className="flex flex-col group">
                            <span className="text-[0.6rem] text-inkfaint font-mono2 mb-1.5 uppercase tracking-[0.16em]">Outcome</span>
                            <span className="font-display text-xl font-semibold text-parchment group-hover:text-brassbright transition-colors">{stats.theoryOfChange.outcomes}</span>
                        </div>
                        <div className="hidden md:flex justify-center text-inkfaint"><ArrowRight size={18} /></div>
                        <div className="flex flex-col group">
                            <span className="text-[0.6rem] text-inkfaint font-mono2 mb-1.5 uppercase tracking-[0.16em]">Impact</span>
                            <span className="font-display text-xl font-semibold text-teal">{stats.theoryOfChange.impact}</span>
                        </div>
                    </div>
                  </div>
              </div>

              {/* Core Metric Cards with Gradients */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200">
                
                <StatCard
                  title="Funding"
                  value={totals.grantCount > 0 ? `$${totals.totalAwarded.toLocaleString()}` : '—'}
                  subValue={totals.grantCount > 0 ? 'awarded' : undefined}
                  description={
                    totals.grantCount > 0
                      ? `$${totals.totalSpent.toLocaleString()} spent from ${totals.activeFunders} active ${totals.activeFunders === 1 ? 'funder' : 'funders'}`
                      : filterOn ? 'No grants match these filters' : 'Add a grant to see funding totals'
                  }
                  icon={<Target />}
                  accent="impact"
                />

                <StatCard
                  title="Cost Effectiveness"
                  value={costPerPerson !== null ? `$${costPerPerson.toFixed(2)}` : '—'}
                  subValue={costPerPerson !== null ? 'per person' : undefined}
                  description={
                    costPerPerson !== null
                      ? `Grant spending divided by ${stats.totalPeopleServed.toLocaleString()} people served${stats.sroi > 0 ? ` · SROI you entered: $${stats.sroi} per $1` : ''}`
                      : 'Needs spending on a grant and people served under Manage Data'
                  }
                  icon={<Scale />}
                  accent="impact"
                  sparklineData={sparkRoi.length > 1 ? sparkRoi : undefined}
                />

                <StatCard
                  title="Data Quality"
                  value={stats.dataQuality.level}
                  description={stats.dataQuality.method !== 'Not set' ? `Self-reported: ${stats.dataQuality.method}` : 'Set under Manage Data'}
                  icon={<ShieldCheck />}
                  accent="funding"
                />
              </div>

              {/* Dashboard Grid Layout (Charts & Key Performance Indicators Sidebar) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
                
                {/* Core Charts Section (Spans 2 columns on desktop) */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Demographics Section */}
                <div className="bg-surface p-8 rounded-xl border border-hairline hover:border-brass/30 transition-colors duration-300">
                  <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="font-display font-semibold text-ivory text-lg flex items-center gap-2">Demographic Reach</h3>
                        <p className="text-sm text-inkmute">Beneficiaries by Age and Ethnicity</p>
                      </div>
                      <button className="text-inkfaint hover:text-parchment"><Settings size={16} /></button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Age Distribution (Pie) */}
                    <div className="space-y-4">
                      <h4 className="text-[0.6rem] font-mono2 text-inkfaint uppercase tracking-[0.18em] text-center">Age Distribution</h4>
                      <div className="h-64 relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie 
                                data={stats.demographics.age} 
                                dataKey="value" 
                                nameKey="name" 
                                cx="50%" 
                                cy="50%" 
                                innerRadius={60} 
                                outerRadius={80}
                                paddingAngle={5}
                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                              >
                                {stats.demographics.age.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS.impact[index % COLORS.impact.length]} stroke="none" />
                                ))}
                              </Pie>
                              <Tooltip 
                                  contentStyle={{background: '#0b1c33', borderRadius: '10px', border: '1px solid #24405f', boxShadow: '0 18px 40px -18px rgba(0, 0, 0, 0.7)'}} 
                                  itemStyle={{color: '#f1e9d6', fontWeight: 600}}
                                />
                            </PieChart>
                          </ResponsiveContainer>
                          
                          {/* Center Text */}
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                              <span className="font-display text-3xl font-semibold text-ivory">{stats.totalPeopleServed.toLocaleString()}</span>
                              <p className="text-[0.6rem] text-inkfaint font-mono2 uppercase tracking-tighter">Served</p>
                          </div>
                      </div>

                      {/* Legend */}
                      <div className="flex justify-center gap-4 flex-wrap">
                          {stats.demographics.age.map((item, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS.impact[i]}}></div>
                                  <span className="text-[10px] text-inkmute font-mono2 uppercase tracking-wide">{item.name}</span>
                              </div>
                          ))}
                      </div>
                    </div>

                    {/* Race/Ethnicity (Bar) */}
                    <div className="space-y-4">
                      <h4 className="text-[0.6rem] font-mono2 text-inkfaint uppercase tracking-[0.18em] text-center">Race & Ethnicity</h4>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart 
                                layout="vertical" 
                                data={stats.demographics.race} 
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                              >
                                  <XAxis type="number" hide />
                                  <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={100} 
                                    tick={{ fontSize: 10, fill: '#93a6c2', fontWeight: 500 }} 
                                    axisLine={false} 
                                    tickLine={false}
                                  />
                                  <Tooltip 
                                    cursor={{ fill: 'rgba(79,196,211,0.06)' }}
                                    contentStyle={{ background: '#0b1c33', borderRadius: '10px', border: '1px solid #24405f', boxShadow: '0 18px 40px -18px rgba(0, 0, 0, 0.7)' }}
                                  />
                                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                      {stats.demographics.race.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS.neutral[index % COLORS.neutral.length]} />
                                      ))}
                                      <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: '#93a6c2', fontWeight: 700 }} />
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center">
                        <span className="text-[10px] text-inkfaint font-medium italic">Relative distribution percentage</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Historical Impact Chart */}
                <div className="bg-surface p-8 rounded-xl border border-hairline hover:border-brass/30 transition-colors duration-300">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="font-display font-semibold text-ivory text-lg">Impact Trajectory</h3>
                      <p className="text-sm text-inkmute">Outcomes achieved over time</p>
                    </div>
                    <div className="flex items-center gap-2 bg-ink rounded-lg p-1 border border-hairline">
                        {(['6M', '1Y', 'ALL'] as const).map((range) => (
                          <button
                            key={range}
                            onClick={() => setTrajectoryRange(range)}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                              trajectoryRange === range
                                ? 'font-semibold bg-teal/15 text-teal'
                                : 'font-medium text-inkmute hover:text-parchment'
                            }`}
                          >
                            {range}
                          </button>
                        ))}
                    </div>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={
                          trajectoryRange === 'ALL'
                            ? stats.programs || []
                            : (stats.programs || []).slice(-(trajectoryRange === '6M' ? 6 : 12))
                        }
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorServed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4fc4d3" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#4fc4d3" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#cba85c" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#cba85c" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#24405f" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#93a6c2', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#93a6c2', fontSize: 12}} />
                        <Tooltip 
                          contentStyle={{ background: '#0b1c33', borderRadius: '10px', border: '1px solid #24405f', boxShadow: '0 18px 40px -18px rgba(0, 0, 0, 0.7)' }} 
                          cursor={{stroke: '#3a5878', strokeWidth: 1, strokeDasharray: '4 4'}}
                        />
                        <Legend iconType="circle" />
                        <Area 
                            type="monotone" 
                            dataKey="peopleServed" 
                            name="Outcomes"
                            stroke="#4fc4d3" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorServed)" 
                            activeDot={{r: 6, strokeWidth: 0, fill: '#4fc4d3'}}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="costPerPerson" 
                            name="Efficiency ($)"
                            stroke="#cba85c" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorCost)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Financial Health Section */}
                <div className="bg-surface p-8 rounded-xl border border-hairline hover:border-brass/30 transition-colors duration-300 animate-in fade-in slide-in-from-bottom-7 duration-700 delay-400">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="font-display font-semibold text-ivory text-lg flex items-center gap-2">
                        <DollarSign size={20} className="text-teal" />
                        Financial Health
                      </h3>
                      <p className="text-sm text-inkmute">Resource Allocation & Funding Diversity</p>
                    </div>
                    {stats.financials.operatingReserveMonths > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-teal/10 text-teal text-[10px] font-mono2 uppercase tracking-wider rounded-full border border-teal/25">
                        Reserve: {stats.financials.operatingReserveMonths} {stats.financials.operatingReserveMonths === 1 ? 'month' : 'months'}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Spending Breakdown */}
                    <div className="space-y-4">
                      <h4 className="text-[0.6rem] font-mono2 text-inkfaint uppercase tracking-[0.18em]">Spending Breakdown</h4>
                      <div className="h-40 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={stats.financials.spending} 
                              dataKey="value" 
                              nameKey="name" 
                              cx="50%" 
                              cy="50%" 
                              innerRadius={45} 
                              outerRadius={65}
                              paddingAngle={5}
                            >
                              {stats.financials.spending.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS.impactDeep[index % COLORS.impactDeep.length]} stroke="none" />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{background: '#0b1c33', borderRadius: '10px', border: '1px solid #24405f', boxShadow: '0 18px 40px -18px rgba(0, 0, 0, 0.7)'}} 
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                           <span className="font-display text-lg font-semibold text-ivory">{stats.financials.spending[0]?.value ?? 0}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Funding Sources */}
                    <div className="space-y-4">
                      <h4 className="text-[0.6rem] font-mono2 text-inkfaint uppercase tracking-[0.18em]">Funding Diversity</h4>
                      <p className="text-[11px] text-inkmute -mt-2">
                        {diversity.length > 0
                          ? `Share of awards by funder. Largest: ${diversity[0].name}`
                          : 'Add grants to see each funder\'s share'}
                      </p>
                      <div className="h-40 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={diversity} 
                              dataKey="value" 
                              nameKey="name" 
                              cx="50%" 
                              cy="50%" 
                              innerRadius={45} 
                              outerRadius={65}
                              paddingAngle={5}
                            >
                              {diversity.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS.funding[index % COLORS.funding.length]} stroke="none" />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{background: '#0b1c33', borderRadius: '10px', border: '1px solid #24405f', boxShadow: '0 18px 40px -18px rgba(0, 0, 0, 0.7)'}} 
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                           <span className="font-display text-lg font-semibold text-ivory">{diversity.length > 0 ? `${diversity[0].value}%` : '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Geographic Reach */}
                <div className="bg-surface p-8 rounded-xl border border-hairline hover:border-brass/30 transition-colors duration-300 animate-in fade-in slide-in-from-bottom-7 duration-700 delay-500">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="font-display font-semibold text-ivory text-lg flex items-center gap-2">
                              <MapPin size={20} className="text-teal" /> 
                              Service Areas
                            </h3>
                            <p className="text-sm text-inkmute">Regional Outreach Breakdown</p>
                        </div>
                        {urbanShare !== undefined && <div className="text-xs text-inkmute font-mono2">{urbanShare}% urban</div>}
                    </div>
                    <div className="space-y-6">
                        {stats.geographic.neighborhoods.map((area, i) => (
                            <div key={i} className="group">
                                <div className="flex justify-between text-sm mb-1.5">
                                    <span className="text-inkmute font-medium">{area.name}</span>
                                    <span className="text-parchment font-bold">{area.value}%</span>
                                </div>
                                <div className="h-2 bg-abyss rounded-full overflow-hidden border border-hairline/50">
                                    <div 
                                      className="h-full bg-gradient-to-r from-teal to-brass rounded-full transition-all duration-[1500ms]" 
                                      style={{ width: `${area.value}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                </div> {/* Closes inner core charts grid */}

                {/* KPI Sidebar Column (Spans 1 column on desktop) */}
                <div className="lg:col-span-1 lg:sticky lg:top-24">
                  <KpiSidebar rollup={kpiRollup} />
                </div>

              </div> {/* Closes outer dashboard grid */}
            </>
          )}
        </div>
      </main>

      {/* Report Modal */}
      <ImpactReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => {
          setIsReportModalOpen(false);
          setReportContent("");
        }} 
        onGenerate={handleGenerateReport}
        reportContent={reportContent}
        isLoading={isGeneratingReport}
      />

      <Analytics />
    </div>
  );
};

// Helper function to check if the current Data Quality level drops below acceptable thresholds
const isDataQualityLow = (levelStr: string): boolean => {
  if (!levelStr) return false;
  const cleanLevel = levelStr.trim().toLowerCase();

  // 1. Direct word-based checks
  if (['low', 'poor', 'warning', 'bad', 'critical', 'fail'].includes(cleanLevel)) {
    return true;
  }

  // 2. Parse percentage check (e.g. "85%", "78.5", "92%")
  const percentMatch = cleanLevel.match(/(\d+(?:\.\d+)?)\s*%?/);
  if (percentMatch) {
    const value = parseFloat(percentMatch[1]);
    // If the string represents a percentage or numeric score, alert if below 90%
    return value < 90;
  }

  return false;
};

// Helper for Sidebar items
const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  isOpen: boolean;
  onClick?: () => void;
  alert?: boolean;
  /** No screen exists behind this item yet — shown disabled with a "Soon" badge rather than looking like a dead link. */
  comingSoon?: boolean;
}> = ({ icon, label, active, isOpen, onClick, alert, comingSoon }) => {
  return (
    <button
      onClick={comingSoon ? undefined : onClick}
      disabled={comingSoon}
      title={comingSoon ? `${label} — not built yet` : undefined}
      className={`relative flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-200 group ${
      comingSoon
        ? 'text-inkfaint/60 cursor-not-allowed border border-transparent'
        : active
        ? 'bg-teal/10 text-ivory border border-teal/25'
        : 'text-inkmute hover:bg-surface2 hover:text-parchment border border-transparent'
    }`}>
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-brass"></span>}
      <span className="relative">
        <span className={`${active ? 'text-teal' : 'text-inkfaint group-hover:text-parchment transition-colors'}`}>{icon}</span>
        {/* Subtle dot on the icon itself if sidebar is collapsed */}
        {alert && !isOpen && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-alert opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-alert"></span>
          </span>
        )}
      </span>
      {isOpen && <span className="font-medium text-sm whitespace-nowrap">{label}</span>}
      {isOpen && comingSoon && (
        <span className="ml-auto px-1.5 py-0.5 text-[0.6rem] font-mono2 font-bold bg-white/5 text-inkfaint border border-hairline rounded-md uppercase tracking-wide">
          Soon
        </span>
      )}
      {isOpen && alert && (
        <span className="ml-auto px-1.5 py-0.5 text-[0.6rem] font-mono2 font-bold bg-alert/15 text-alerttext border border-alert/40 rounded-md uppercase tracking-wide">
          Alert
        </span>
      )}
      {isOpen && !active && !alert && !comingSoon && <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
    </button>
  );
};

const ChecklistStep: React.FC<{
  done: boolean;
  label: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ done, label, actionLabel, onAction }) => (
  <div className={`flex items-center justify-between gap-2 p-3 rounded-lg border ${
    done ? 'bg-teal/5 border-teal/20' : 'bg-ink/40 border-hairline/60'
  }`}>
    <div className="flex items-center gap-2 min-w-0">
      {done ? (
        <CheckCircle2 size={16} className="text-teal shrink-0" />
      ) : (
        <Circle size={16} className="text-inkfaint shrink-0" />
      )}
      <span className={`text-xs font-semibold truncate ${done ? 'text-parchment' : 'text-inkmute'}`}>{label}</span>
    </div>
    {!done && onAction && (
      <button onClick={onAction} className="text-[10px] font-bold uppercase tracking-wide text-brassbright hover:underline shrink-0">
        {actionLabel || 'Go'}
      </button>
    )}
  </div>
);

export default App;
