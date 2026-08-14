import React, { useState, useEffect } from 'react';
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
  Bell,
  Search,
  MapPin,
  Target,
  ShieldCheck,
  Scale,
  ArrowRight,
  ChevronDown,
  Database,
  Download
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
import { LoginView } from './components/LoginView';
import { TrialSignupView } from './components/TrialSignupView';
import { OnboardingView } from './components/OnboardingView';
import { DemoModeBanner, DemoHint } from './components/DemoTour';
import { BrandLogo } from './components/BrandLogo';
import { KpiSidebar } from './components/KpiSidebar';
import { useAuth } from './src/contexts/AuthContext';
import { generateImpactReport } from './services/geminiService';
import { DashboardStats, ProgramMetric, Grant, Opportunity, ROLE_PERMISSIONS } from './types';
import { Analytics } from '@vercel/analytics/react';

// --- Colors & Gradients ---
// Cartographic chart ramps — teal (impact), brass (funding), parchment (neutral)
const COLORS = {
  impact: ['#4fc4d3', '#6fd2de', '#9ae0e8', '#c4eef2'],
  impactDeep: ['#4fc4d3', '#3faebd', '#2f8b98', '#256e78'],
  funding: ['#cba85c', '#e7ce88', '#b8905a', '#8a6d3f'],
  neutral: ['#6f86a6', '#93a6c2', '#b7c4d8', '#d8e0ec']
};

// --- Mock Data ---
const MOCK_GRANTS: Grant[] = [
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

const MOCK_PROGRAMS: ProgramMetric[] = [
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

const MOCK_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'o1',
    funder: 'Bloomberg Philanthropies',
    name: 'Global Water Security Grant',
    amount: 750000,
    matchScore: 94,
    deadline: '2025-09-15',
    description: 'Funding for innovative infrastructure projects in developing urban centers focused on sustainable water management.',
    whyMatch: 'Matches your current 92% performance in Urban WASH projects and your high SROI in East Africa.'
  },
  {
    id: 'o1',
    funder: 'World Health Organization',
    name: 'Community Hygiene Accelerator',
    amount: 200000,
    matchScore: 88,
    deadline: '2025-10-01',
    description: 'Scaling hygiene education and facility installations in high-density informal settlements.',
    whyMatch: 'Strong alignment with your "Rural Sanitation Program" outcomes and your verified data methodology.'
  }
];

const AGGREGATED_STATS: DashboardStats = {
  totalPeopleServed: 13600,
  totalBudgetSpent: 132500,
  avgCostPerPerson: 9.74,
  programs: MOCK_PROGRAMS,
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
  ...AGGREGATED_STATS,
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

// Transform data for sparklines
const SPARK_COST = MOCK_PROGRAMS.map(p => ({ value: p.totalCost }));
const SPARK_FINANCIALS_SPENDING = [
  { value: 45000 }, { value: 52000 }, { value: 48000 }, { value: 61000 }, { value: 55000 }, { value: 67000 }
];
const SPARK_FINANCIALS_SOURCES = [
  { value: 38000 }, { value: 42000 }, { value: 55000 }, { value: 51000 }, { value: 59000 }, { value: 63000 }
];

const App: React.FC = () => {
  const { user, profile, organization, role, loading, login, logout, createOrg } = useAuth();
  const permissions = role ? ROLE_PERMISSIONS[role] : null;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<'dashboard' | 'data' | 'grants' | 'analysis' | 'discovery' | 'team'>('dashboard');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Initialize from cache or fallback to active starting constants
  const [stats, setStats] = useState<DashboardStats>(() => {
    try {
      const cached = localStorage.getItem('nomad_compass_stats');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (!parsed.saasKpis) {
          parsed.saasKpis = AGGREGATED_STATS.saasKpis;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse cached stats:', e);
    }
    return AGGREGATED_STATS;
  });

  const [grants, setGrants] = useState<Grant[]>(() => {
    try {
      const cached = localStorage.getItem('nomad_compass_grants');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('Failed to parse cached grants:', e);
    }
    return MOCK_GRANTS;
  });

  const sparkImpact = (stats.programs || []).map(p => ({ value: p.peopleServed }));
  const sparkRoi = (stats.programs || []).map(p => ({ value: p.costPerPerson }));

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

  // Sync state variables to local storage for persistent data access
  useEffect(() => {
    if (!isDemoMode) {
      try {
        localStorage.setItem('nomad_compass_stats', JSON.stringify(stats));
      } catch (e) {
        console.error('Failed to write stats to localStorage:', e);
      }
    }
  }, [stats, isDemoMode]);

  useEffect(() => {
    if (!isDemoMode) {
      try {
        localStorage.setItem('nomad_compass_grants', JSON.stringify(grants));
      } catch (e) {
        console.error('Failed to write grants to localStorage:', e);
      }
    }
  }, [grants, isDemoMode]);

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

  // Toggle Demo Mode (Loads clean demo metrics of different size, doesn't rewrite persistent cache)
  useEffect(() => {
    if (isDemoMode) {
      setStats(DEMO_STATS);
      setGrants(DEMO_GRANTS);
    } else {
      // Revert to primary cached values or standard ones if no cache is saved yet
      try {
        const cachedStats = localStorage.getItem('nomad_compass_stats');
        const cachedGrants = localStorage.getItem('nomad_compass_grants');
        setStats(cachedStats ? JSON.parse(cachedStats) : AGGREGATED_STATS);
        setGrants(cachedGrants ? JSON.parse(cachedGrants) : MOCK_GRANTS);
      } catch (e) {
        setStats(AGGREGATED_STATS);
        setGrants(MOCK_GRANTS);
      }
    }
  }, [isDemoMode]);


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
    }
  }, []);

  // Public free-trial signup page — no login required
  if (typeof window !== 'undefined' &&
      (window.location.pathname.replace(/\/+$/, '') === '/free-trial' ||
       new URLSearchParams(window.location.search).has('trial'))) {
    return <TrialSignupView />;
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
    return <OnboardingView userEmail={user.email || ''} onCreateOrg={createOrg} />;
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

      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-abyss text-parchment transition-all duration-300 ease-in-out fixed h-full z-20 flex flex-col shadow-2xl border-r border-hairline/50`}
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
                onClick={() => setActiveView('dashboard')}
              />
            </DemoHint>
          ) : (
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label="Impact Overview" 
              active={activeView === 'dashboard'} 
              isOpen={isSidebarOpen} 
              onClick={() => setActiveView('dashboard')}
            />
          )}

          {isDemoMode ? (
            <DemoHint text="External Audit Tracking" position="right">
              <NavItem 
                icon={<Target size={20} />} 
                label="Grant Tracking" 
                active={activeView === 'grants'} 
                isOpen={isSidebarOpen} 
                onClick={() => setActiveView('grants')}
              />
            </DemoHint>
          ) : (
            <NavItem 
              icon={<Target size={20} />} 
              label="Grant Tracking" 
              active={activeView === 'grants'} 
              isOpen={isSidebarOpen} 
              onClick={() => setActiveView('grants')}
            />
          )}

          <NavItem 
            icon={<Sparkles size={20} />} 
            label="Grant Discovery" 
            active={activeView === 'discovery'} 
            isOpen={isSidebarOpen} 
            onClick={() => setActiveView('discovery')}
          />

          {isDemoMode ? (
            <DemoHint text="Real-time Metric Tuning" position="right">
              <NavItem 
                icon={<Database size={20} />} 
                label="Manage Data" 
                active={activeView === 'data'} 
                isOpen={isSidebarOpen} 
                onClick={() => setActiveView('data')}
                alert={isQualityAlert}
              />
            </DemoHint>
          ) : (
            <NavItem 
              icon={<Database size={20} />} 
              label="Manage Data" 
              active={activeView === 'data'} 
              isOpen={isSidebarOpen} 
              onClick={() => setActiveView('data')}
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
                onClick={() => setActiveView('analysis')}
              />
            </DemoHint>
          ) : (
            <NavItem 
              icon={<PieIcon size={20} />} 
              label="Analysis Deep Dive" 
              active={activeView === 'analysis'} 
              isOpen={isSidebarOpen} 
              onClick={() => setActiveView('analysis')}
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
            <NavItem icon={<Users size={20} />} label="Team Management" active={activeView === 'team'} isOpen={isSidebarOpen} onClick={() => setActiveView('team')} />
          )}
          <NavItem icon={<MapPin size={20} />} label="Geographic Reach" isOpen={isSidebarOpen} />
          <NavItem icon={<DollarSign size={20} />} label="Financials" isOpen={isSidebarOpen} />
          
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
           <NavItem icon={<Settings size={20} />} label="Settings" isOpen={isSidebarOpen} />
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        
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
            <div className="relative hidden md:block group">
                <Search className="absolute left-3 top-3 text-inkfaint w-4 h-4 group-focus-within:text-teal transition-colors" />
                <input
                    type="text"
                    placeholder="Search metrics..."
                    className="pl-10 pr-4 py-2.5 bg-ink/70 border border-hairline/60 rounded-lg text-sm text-parchment placeholder:text-inkfaint focus:ring-2 focus:ring-teal/40 focus:border-teal/50 w-64 outline-none transition-all"
                />
            </div>
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
              <DemoHint text="Verified by AI" position="bottom">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-teal/10 text-teal text-xs font-semibold rounded-full border border-teal/25">
                    <ShieldCheck size={14} />
                    <span>Verified Data</span>
                </div>
              </DemoHint>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-teal/10 text-teal text-xs font-semibold rounded-full border border-teal/25">
                  <ShieldCheck size={14} />
                  <span>Verified Data</span>
              </div>
            )}
            <button className="relative p-2 text-inkmute hover:text-parchment hover:bg-surface2 rounded-lg transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-brass rounded-full ring-2 ring-abyss"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-hairline/50">
               <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-parchment">{profile?.displayName}</p>
                  <button
                    onClick={logout}
                    className="text-[10px] text-inkfaint hover:text-brass font-bold uppercase transition-colors"
                  >
                    Sign Out
                  </button>
               </div>
               <div className="w-10 h-10 bg-gradient-to-br from-surface2 to-surface rounded-full flex items-center justify-center text-brass font-bold border border-brass/40">
                   {profile?.displayName?.charAt(0).toUpperCase() || 'U'}
               </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 max-w-7xl mx-auto space-y-8 pb-20">
          
          {activeView === 'data' ? (
            <DataManagementView stats={stats} onUpdate={setStats} />
          ) : activeView === 'grants' ? (
            <GrantTrackingView grants={grants} onUpdateGrants={setGrants} />
          ) : activeView === 'analysis' ? (
            <AnalysisView stats={stats} grants={grants} />
          ) : activeView === 'discovery' ? (
            <GrantDiscoveryView opportunities={MOCK_OPPORTUNITIES} />
          ) : activeView === 'team' ? (
            <TeamManagementView />
          ) : (
            <>
              {/* Dashboard Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
                <div>
                  <p className="font-mono2 text-[0.62rem] tracking-[0.28em] uppercase text-brass mb-1.5">Bearing · Program Impact</p>
                  <h1 className="font-display text-4xl font-semibold text-ivory tracking-tight">Program Impact</h1>
                  <p className="text-inkmute mt-1.5 flex items-center gap-2 text-sm font-mono2">
                    FY 2025 · Q1–Q2 <span className="w-1 h-1 rounded-full bg-inkfaint"></span> Updated today
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
                            <span className="font-display text-xl font-semibold text-parchment group-hover:text-brassbright transition-colors">${(stats.totalBudgetSpent / 1000).toFixed(1)}k Invested</span>
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
                  title="Program Outcomes"
                  value={stats.outcomesDetails.householdsWaterAccess.toLocaleString()}
                  subValue="households"
                  trend="+12.5% vs target"
                  trendDirection="up"
                  description="Sustained clean water access"
                  icon={<Target />}
                  gradientFrom="from-blue-500"
                  gradientTo="to-indigo-600"
                  sparklineData={sparkImpact}
                />

                <StatCard 
                  title="Cost Effectiveness"
                  value={`$${stats.avgCostPerPerson.toFixed(2)}`}
                  subValue="per person"
                  trend="32% below avg"
                  trendDirection="up"
                  description={`SROI: $${stats.sroi} social value per $1`}
                  icon={<Scale />}
                  gradientFrom="from-emerald-500"
                  gradientTo="to-teal-600"
                  sparklineData={sparkRoi}
                />

                <StatCard 
                  title="Data Quality"
                  value={stats.dataQuality.level}
                  trend="Verified"
                  trendDirection="neutral"
                  description={`${stats.dataQuality.method} methodology`}
                  icon={<ShieldCheck />}
                  gradientFrom="from-purple-500"
                  gradientTo="to-pink-600"
                  // No sparkline for quality
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
                                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} 
                                  itemStyle={{color: '#334155', fontWeight: 600}}
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
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
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
                        <button className="px-3 py-1 text-xs font-semibold bg-teal/15 text-teal rounded-md">6M</button>
                        <button className="px-3 py-1 text-xs font-medium text-inkmute hover:text-parchment">1Y</button>
                        <button className="px-3 py-1 text-xs font-medium text-inkmute hover:text-parchment">ALL</button>
                    </div>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.programs || MOCK_PROGRAMS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
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
                    <div className="flex items-center gap-2 px-3 py-1 bg-teal/10 text-teal text-[10px] font-mono2 uppercase tracking-wider rounded-full border border-teal/25">
                      Reserve: {stats.financials.operatingReserveMonths} mo.
                    </div>
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
                              contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} 
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                           <span className="font-display text-lg font-semibold text-ivory">{stats.financials.spending[0].value}%</span>
                        </div>
                      </div>
                      
                      {/* Historical Sparkline */}
                      <div className="h-10 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={SPARK_FINANCIALS_SPENDING}>
                            <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#4fc4d3" 
                              fill="#4fc4d3" 
                              fillOpacity={0.1}
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                        <p className="text-[9px] text-inkfaint font-mono2 uppercase tracking-tight text-center mt-1">Total Spending Trend</p>
                      </div>
                    </div>

                    {/* Funding Sources */}
                    <div className="space-y-4">
                      <h4 className="text-[0.6rem] font-mono2 text-inkfaint uppercase tracking-[0.18em]">Funding Diversity</h4>
                      <div className="h-40 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={stats.financials.sources} 
                              dataKey="value" 
                              nameKey="name" 
                              cx="50%" 
                              cy="50%" 
                              innerRadius={45} 
                              outerRadius={65}
                              paddingAngle={5}
                            >
                              {stats.financials.sources.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS.funding[index % COLORS.funding.length]} stroke="none" />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} 
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                           <span className="font-display text-lg font-semibold text-ivory">{stats.financials.sources[0].value}%</span>
                        </div>
                      </div>

                      {/* Historical Sparkline */}
                      <div className="h-10 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={SPARK_FINANCIALS_SOURCES}>
                            <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#cba85c" 
                              fill="#cba85c" 
                              fillOpacity={0.1}
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                        <p className="text-[9px] text-inkfaint font-mono2 uppercase tracking-tight text-center mt-1">New Funding Trend</p>
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
                        <div className="text-xs text-inkmute font-mono2">89% Urban Focus</div>
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
                  <KpiSidebar kpis={stats.saasKpis || AGGREGATED_STATS.saasKpis} />
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
}> = ({ icon, label, active, isOpen, onClick, alert }) => {
  return (
    <button 
      onClick={onClick}
      className={`relative flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-200 group ${
      active
        ? 'bg-teal/10 text-ivory border border-teal/25'
        : 'text-inkmute hover:bg-surface2 hover:text-parchment border border-transparent'
    }`}>
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-brass"></span>}
      <span className="relative">
        <span className={`${active ? 'text-teal' : 'text-inkfaint group-hover:text-parchment transition-colors'}`}>{icon}</span>
        {/* Subtle dot on the icon itself if sidebar is collapsed */}
        {alert && !isOpen && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
        )}
      </span>
      {isOpen && <span className="font-medium text-sm whitespace-nowrap">{label}</span>}
      {isOpen && alert && (
        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-md uppercase tracking-wide animate-pulse">
          Alert
        </span>
      )}
      {isOpen && !active && !alert && <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
    </button>
  );
};

export default App;
