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
  BrainCircuit,
  ChevronDown,
  Database
} from 'lucide-react';
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
import { AIInsightsPanel } from './components/AIInsightsPanel';
import { DataManagementView } from './components/DataManagementView';
import { GrantTrackingView } from './components/GrantTrackingView';
import { AnalysisView } from './components/AnalysisView';
import { GrantDiscoveryView } from './components/GrantDiscoveryView';
import { TeamManagementView } from './components/TeamManagementView';
import { LoginView } from './components/LoginView';
import { OnboardingView } from './components/OnboardingView';
import { DemoModeBanner, DemoHint } from './components/DemoTour';
import { useAuth } from './src/contexts/AuthContext';
import { generateImpactReport, generateDashboardInsights } from './services/geminiService';
import { DashboardStats, ProgramMetric, AIAnalysisData, Grant, Opportunity, ROLE_PERMISSIONS } from './types';

// --- Colors & Gradients ---
const COLORS = {
  blue: ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd'],
  green: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
  purple: ['#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff'],
  orange: ['#f97316', '#fb923c', '#fdba74', '#fed7aa'],
  slate: ['#475569', '#64748b', '#94a3b8', '#cbd5e1']
};

// --- Mock Data ---
const MOCK_GRANTS: Grant[] = [
  {
    id: 'g1',
    name: 'Clean Water Initiative - Phase II',
    funder: 'Bill & Melinda Gates Foundation',
    amount: 250000,
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
  benchmarkComparison: "32% below sector avg"
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
  }
};

// Transform data for sparklines
const SPARK_IMPACT = MOCK_PROGRAMS.map(p => ({ value: p.peopleServed }));
const SPARK_COST = MOCK_PROGRAMS.map(p => ({ value: p.totalCost }));
const SPARK_ROI = MOCK_PROGRAMS.map(p => ({ value: p.costPerPerson }));
const SPARK_FINANCIALS_SPENDING = [
  { value: 45000 }, { value: 52000 }, { value: 48000 }, { value: 61000 }, { value: 55000 }, { value: 67000 }
];
const SPARK_FINANCIALS_SOURCES = [
  { value: 38000 }, { value: 42000 }, { value: 55000 }, { value: 51000 }, { value: 59000 }, { value: 63000 }
];

const App: React.FC = () => {
  const { user, profile, organization, role, loading, login, logout, createOrg } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<'dashboard' | 'data' | 'grants' | 'analysis' | 'discovery' | 'team'>('dashboard');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [stats, setStats] = useState<DashboardStats>(AGGREGATED_STATS);
  const [grants, setGrants] = useState<Grant[]>(MOCK_GRANTS);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportContent, setReportContent] = useState<string>("");
  
  // AI Insights State
  const [showInsights, setShowInsights] = useState(true);
  const [insights, setInsights] = useState<AIAnalysisData | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Toggle Demo Mode
  useEffect(() => {
    if (isDemoMode) {
      setStats(DEMO_STATS);
      setGrants(DEMO_GRANTS);
    } else {
      setStats(AGGREGATED_STATS);
      setGrants(MOCK_GRANTS);
    }
  }, [isDemoMode]);

  const fetchInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const data = await generateDashboardInsights(stats);
      setInsights(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Load AI Insights on mount and when stats update
  useEffect(() => {
    fetchInsights();
  }, [stats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Activity size={48} className="text-brand-500 animate-spin" />
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

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-900 text-white transition-all duration-300 ease-in-out fixed h-full z-20 flex flex-col shadow-2xl`}
      >
        <div className="h-20 flex items-center justify-center border-b border-slate-800/50">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="bg-gradient-to-br from-brand-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-brand-500/20">
              <Activity size={22} className="text-white" />
            </div>
            {isSidebarOpen && <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Nomad Compass</span>}
          </div>
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
            <DemoHint text="Smart Insights Engine" position="right">
              <NavItem 
                icon={<BrainCircuit size={20} />} 
                label="AI Analysis" 
                isOpen={isSidebarOpen} 
                onClick={() => setActiveView('dashboard')}
              />
            </DemoHint>
          ) : (
            <NavItem 
              icon={<BrainCircuit size={20} />} 
              label="AI Analysis" 
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
              />
            </DemoHint>
          ) : (
            <NavItem 
              icon={<Database size={20} />} 
              label="Manage Data" 
              active={activeView === 'data'} 
              isOpen={isSidebarOpen} 
              onClick={() => setActiveView('data')}
            />
          )}
          <div className="pt-4 pb-2 px-3">
            <p className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest ${!isSidebarOpen && 'hidden'}`}>Preview Features</p>
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
            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 group ${
              isDemoMode 
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <Sparkles size={20} className={isDemoMode ? 'animate-pulse' : ''} />
            {isSidebarOpen && <span className="font-medium text-sm whitespace-nowrap">Demo Mode</span>}
            {isSidebarOpen && isDemoMode && (
              <div className="ml-auto w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
            )}
          </button>
          
          {role && ROLE_PERMISSIONS[role].canManageTeam && (
            <NavItem icon={<Users size={20} />} label="Team Management" active={activeView === 'team'} isOpen={isSidebarOpen} onClick={() => setActiveView('team')} />
          )}
          <NavItem icon={<MapPin size={20} />} label="Geographic Reach" isOpen={isSidebarOpen} />
          <NavItem icon={<DollarSign size={20} />} label="Financials" isOpen={isSidebarOpen} />
        </nav>

        <div className="p-3 border-t border-slate-800/50 bg-slate-900">
           <NavItem icon={<Settings size={20} />} label="Settings" isOpen={isSidebarOpen} />
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-10 px-8 flex items-center justify-between shadow-sm">
          <DemoModeBanner isActive={isDemoMode} onClose={() => setIsDemoMode(false)} />
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            >
              <Menu size={20} />
            </button>
            <div className="relative hidden md:block group">
                <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4 group-focus-within:text-brand-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search metrics..." 
                    className="pl-10 pr-4 py-2.5 bg-slate-100/50 border border-transparent rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white w-64 outline-none transition-all"
                />
            </div>
          </div>

          <div className="flex gap-3">
            {isDemoMode ? (
              <DemoHint text="Verified by AI" position="bottom">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200 shadow-sm">
                    <ShieldCheck size={14} />
                    <span>Verified Data</span>
                </div>
              </DemoHint>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200 shadow-sm">
                  <ShieldCheck size={14} />
                  <span>Verified Data</span>
              </div>
            )}
            <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white ring-2 ring-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
               <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-900">{profile?.displayName}</p>
                  <button 
                    onClick={logout}
                    className="text-[10px] text-slate-400 hover:text-red-500 font-bold uppercase transition-colors"
                  >
                    Sign Out
                  </button>
               </div>
               <div className="w-10 h-10 bg-gradient-to-br from-brand-100 to-purple-100 rounded-full flex items-center justify-center text-brand-700 font-bold border-2 border-white shadow-md">
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
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Program Impact</h1>
                  <p className="text-slate-500 mt-1 flex items-center gap-2">
                    FY 2025 • Q1-Q2 Analysis <span className="w-1 h-1 rounded-full bg-slate-300"></span> Last updated today
                  </p>
                </div>
                <div className="flex gap-3">
                  {isDemoMode ? (
                    <DemoHint text="AI-Driven Strategy" position="bottom">
                      <button 
                        onClick={() => setShowInsights(!showInsights)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                          showInsights 
                          ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <BrainCircuit size={18} />
                        {showInsights ? 'Hide AI Analysis' : 'Show AI Analysis'}
                      </button>
                    </DemoHint>
                  ) : (
                    <button 
                      onClick={() => setShowInsights(!showInsights)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                        showInsights 
                        ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <BrainCircuit size={18} />
                      {showInsights ? 'Hide AI Analysis' : 'Show AI Analysis'}
                    </button>
                  )}

                  {isDemoMode ? (
                    <DemoHint text="Grant-Ready Markdown" position="bottom">
                      <button 
                        onClick={handleGenerateReport}
                        className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-brand-500/20 font-medium transition-all hover:scale-[1.02] active:scale-95"
                      >
                        <Sparkles size={18} />
                        Generate Grant Report
                      </button>
                    </DemoHint>
                  ) : (
                    <button 
                      onClick={handleGenerateReport}
                      className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-brand-500/20 font-medium transition-all hover:scale-[1.02] active:scale-95"
                    >
                      <Sparkles size={18} />
                      Generate Grant Report
                    </button>
                  )}
                </div>
              </div>

              {/* Theory of Change Banner */}
              <div className="bg-white rounded-2xl p-0 shadow-lg border border-slate-100/60 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                  <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-brand-400 to-purple-500"></div>
                  <div className="p-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                      <Activity size={14} className="text-brand-500" /> Theory of Change Pathway
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center relative z-10">
                        <div className="flex flex-col group">
                            <span className="text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wider">Input</span>
                            <span className="text-xl font-bold text-slate-800 group-hover:text-brand-600 transition-colors">${(stats.totalBudgetSpent / 1000).toFixed(1)}k Invested</span>
                        </div>
                        <div className="hidden md:flex justify-center text-slate-300"><ArrowRight size={20} /></div>
                        <div className="flex flex-col group">
                            <span className="text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wider">Activity</span>
                            <span className="text-xl font-bold text-slate-800 group-hover:text-brand-600 transition-colors">{stats.theoryOfChange.activities}</span>
                        </div>
                        <div className="hidden md:flex justify-center text-slate-300"><ArrowRight size={20} /></div>
                        <div className="flex flex-col group">
                            <span className="text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wider">Outcome</span>
                            <span className="text-xl font-bold text-slate-800 group-hover:text-brand-600 transition-colors">{stats.theoryOfChange.outcomes}</span>
                        </div>
                        <div className="hidden md:flex justify-center text-slate-300"><ArrowRight size={20} /></div>
                        <div className="flex flex-col group">
                            <span className="text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wider">Impact</span>
                            <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600">{stats.theoryOfChange.impact}</span>
                        </div>
                    </div>
                  </div>
              </div>

              {/* AI Insights Section */}
              {showInsights && (
                <AIInsightsPanel data={insights} isLoading={isLoadingInsights} onRefresh={fetchInsights} />
              )}

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
                  sparklineData={SPARK_IMPACT}
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
                  sparklineData={SPARK_ROI}
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

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
                
                {/* Demographics Section */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">Demographic Reach</h3>
                        <p className="text-sm text-slate-500">Beneficiaries by Age and Ethnicity</p>
                      </div>
                      <button className="text-slate-400 hover:text-slate-600"><Settings size={16} /></button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Age Distribution (Pie) */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Age Distribution</h4>
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
                                  <Cell key={`cell-${index}`} fill={COLORS.blue[index % COLORS.blue.length]} stroke="none" />
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
                              <span className="text-3xl font-bold text-slate-800">{stats.totalPeopleServed.toLocaleString()}</span>
                              <p className="text-xs text-slate-500 font-medium uppercase tracking-tighter">Served</p>
                          </div>
                      </div>

                      {/* Legend */}
                      <div className="flex justify-center gap-4 flex-wrap">
                          {stats.demographics.age.map((item, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS.blue[i]}}></div>
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{item.name}</span>
                              </div>
                          ))}
                      </div>
                    </div>

                    {/* Race/Ethnicity (Bar) */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Race & Ethnicity</h4>
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
                                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} 
                                    axisLine={false} 
                                    tickLine={false}
                                  />
                                  <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                  />
                                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                      {stats.demographics.race.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS.slate[index % COLORS.slate.length]} />
                                      ))}
                                      <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center">
                        <span className="text-[10px] text-slate-400 font-medium italic">Relative distribution percentage</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Historical Impact Chart */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">Impact Trajectory</h3>
                      <p className="text-sm text-slate-500">Outcomes achieved over time</p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-200">
                        <button className="px-3 py-1 text-xs font-semibold bg-white text-slate-800 rounded-md shadow-sm">6M</button>
                        <button className="px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-800">1Y</button>
                        <button className="px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-800">ALL</button>
                    </div>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={MOCK_PROGRAMS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorServed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
                          cursor={{stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4'}}
                        />
                        <Legend iconType="circle" />
                        <Area 
                            type="monotone" 
                            dataKey="peopleServed" 
                            name="Outcomes"
                            stroke="#8b5cf6" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorServed)" 
                            activeDot={{r: 6, strokeWidth: 0, fill: '#8b5cf6'}}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="costPerPerson" 
                            name="Efficiency ($)"
                            stroke="#0ea5e9" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorCost)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Financial Health Section */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-shadow duration-300 animate-in fade-in slide-in-from-bottom-7 duration-700 delay-400">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <DollarSign size={20} className="text-emerald-500" />
                        Financial Health
                      </h3>
                      <p className="text-sm text-slate-500">Resource Allocation & Funding Diversity</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-100 shadow-sm">
                      Reserve: {stats.financials.operatingReserveMonths} mo.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Spending Breakdown */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Spending Breakdown</h4>
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
                                <Cell key={`cell-${index}`} fill={COLORS.green[index % COLORS.green.length]} stroke="none" />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} 
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                           <span className="text-lg font-bold text-slate-800">{stats.financials.spending[0].value}%</span>
                        </div>
                      </div>
                      
                      {/* Historical Sparkline */}
                      <div className="h-10 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={SPARK_FINANCIALS_SPENDING}>
                            <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#10b981" 
                              fill="#10b981" 
                              fillOpacity={0.1}
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight text-center mt-1">Total Spending Trend</p>
                      </div>
                    </div>

                    {/* Funding Sources */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Funding Diversity</h4>
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
                                <Cell key={`cell-${index}`} fill={COLORS.orange[index % COLORS.orange.length]} stroke="none" />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} 
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                           <span className="text-lg font-bold text-slate-800">{stats.financials.sources[0].value}%</span>
                        </div>
                      </div>

                      {/* Historical Sparkline */}
                      <div className="h-10 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={SPARK_FINANCIALS_SOURCES}>
                            <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#f97316" 
                              fill="#f97316" 
                              fillOpacity={0.1}
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight text-center mt-1">New Funding Trend</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Geographic Reach */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-shadow duration-300 animate-in fade-in slide-in-from-bottom-7 duration-700 delay-500">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                              <MapPin size={20} className="text-brand-500" /> 
                              Service Areas
                            </h3>
                            <p className="text-sm text-slate-500">Regional Outreach Breakdown</p>
                        </div>
                        <div className="text-xs text-slate-400 font-medium">89% Urban Focus</div>
                    </div>
                    <div className="space-y-6">
                        {stats.geographic.neighborhoods.map((area, i) => (
                            <div key={i} className="group">
                                <div className="flex justify-between text-sm mb-1.5">
                                    <span className="text-slate-600 font-medium">{area.name}</span>
                                    <span className="text-slate-900 font-bold">{area.value}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-[1500ms]" 
                                      style={{ width: `${area.value}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              </div>
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

    </div>
  );
};

// Helper for Sidebar items
const NavItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean; 
  isOpen: boolean;
  onClick?: () => void;
}> = ({ icon, label, active, isOpen, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 group ${
      active 
        ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/30' 
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
    }`}>
      <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-white transition-colors'}`}>{icon}</span>
      {isOpen && <span className="font-medium text-sm whitespace-nowrap">{label}</span>}
      {isOpen && !active && <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
    </button>
  );
};

export default App;