import React from 'react';
import { 
  Save, 
  Info, 
  Database, 
  ChevronRight, 
  Users, 
  DollarSign, 
  Target, 
  ShieldCheck,
  TrendingUp,
  MapPin
} from 'lucide-react';
import { DashboardStats, ROLE_PERMISSIONS } from '../types';
import { useAuth } from '../src/contexts/AuthContext';

interface DataManagementViewProps {
  stats: DashboardStats;
  onUpdate: (newStats: DashboardStats) => void;
}

export const DataManagementView: React.FC<DataManagementViewProps> = ({ stats, onUpdate }) => {
  const { role } = useAuth();
  const permissions = role ? ROLE_PERMISSIONS[role] : null;

  const handleChange = (path: string, value: any) => {
    if (!permissions?.canEditMetrics) return;
    const newStats = { ...stats };
    const keys = path.split('.');
    let current: any = newStats;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    onUpdate(newStats);
  };

  const FieldGroup: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
        <div className="p-2 bg-white rounded-lg shadow-sm text-brand-600">
          {icon}
        </div>
        <h4 className="font-bold text-slate-800">{title}</h4>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children}
      </div>
    </div>
  );

  const InputField: React.FC<{ 
    label: string; 
    path: string; 
    type?: string; 
    tooltip: string;
    placeholder?: string;
  }> = ({ label, path, type = "text", tooltip, placeholder }) => {
    // Get value from path
    const value = path.split('.').reduce((obj, key) => obj?.[key], stats as any);

    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
          <div className="group relative">
            <Info size={14} className="text-slate-300 cursor-help hover:text-brand-500 transition-colors" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-50">
              {tooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
            </div>
          </div>
        </div>
        <input 
          type={type}
          disabled={!permissions?.canEditMetrics}
          value={value ?? ""}
          onChange={(e) => handleChange(path, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none transition-all ${!permissions?.canEditMetrics && 'opacity-60 cursor-not-allowed'}`}
        />
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manage Metrics</h2>
          <p className="text-slate-500">Update your nonprofit's core impact and financial data.</p>
        </div>
        {permissions?.canEditMetrics && (
          <button className="flex items-center gap-2 bg-brand-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all">
            <Save size={18} />
            Save Changes
          </button>
        )}
      </div>

      <FieldGroup icon={<Target />} title="Theory of Change & Impact">
        <InputField 
          label="Activities" 
          path="theoryOfChange.activities" 
          tooltip="Summary of recurring high-level activities (e.g., '100 Wells Drilled')"
        />
        <InputField 
          label="Key Outputs" 
          path="theoryOfChange.outputs" 
          tooltip="Measurable immediate results (e.g., '50,000 Gallons Clean Water')"
        />
        <InputField 
          label="Key Outcomes" 
          path="theoryOfChange.outcomes" 
          tooltip="Intermediate effects on beneficiaries (e.g., '30% drop in illness')"
        />
        <InputField 
          label="Ultimate Impact" 
          path="theoryOfChange.impact" 
          tooltip="Long-term systemic change being sought"
        />
        <InputField 
          label="SROI Ratio" 
          path="sroi" 
          type="number"
          tooltip="Social Return on Investment. Social value generated per $1 invested."
        />
        <InputField 
          label="Benchmark Comparison" 
          path="benchmarkComparison" 
          tooltip="How your efficiency compares to the sector average"
        />
      </FieldGroup>

      <FieldGroup icon={<Users />} title="Beneficiary Data">
        <InputField 
          label="Total People Served" 
          path="totalPeopleServed" 
          type="number"
          tooltip="Unduplicated count of unique individuals reached this fiscal year"
        />
        <InputField 
          label="Disability %" 
          path="demographics.disabilityPercent" 
          type="number"
          tooltip="Percentage of beneficiaries identifying with a disability"
        />
        <InputField 
          label="Water Access Count" 
          path="outcomesDetails.householdsWaterAccess" 
          type="number"
          tooltip="Total households with new or improved water access"
        />
        <InputField 
          label="Health Improvements" 
          path="outcomesDetails.healthImprovements" 
          type="number"
          tooltip="Documented cases of significant health improvement"
        />
        <InputField 
          label="Behavioral Gains" 
          path="outcomesDetails.behaviorChanges" 
          type="number"
          tooltip="Individuals showing positive sanitation behavior change"
        />
      </FieldGroup>

      <FieldGroup icon={<DollarSign />} title="Financial Metrics">
        <InputField 
          label="Total Budget Spent" 
          path="totalBudgetSpent" 
          type="number"
          tooltip="Cumulative program spending for the period"
        />
        <InputField 
          label="Operating Reserve" 
          path="financials.operatingReserveMonths" 
          type="number"
          tooltip="Months of operations covered by cash reserves"
        />
        <InputField 
          label="Avg Cost Per Person" 
          path="avgCostPerPerson" 
          type="number"
          tooltip="Total Budget / Total People Served"
        />
      </FieldGroup>

      <FieldGroup icon={<ShieldCheck />} title="Verification & Methodology">
        <InputField 
          label="Quality Level" 
          path="dataQuality.level" 
          tooltip="Level of data maturity (e.g., Low, Medium, High, Audited)"
        />
        <InputField 
          label="Methodology" 
          path="dataQuality.method" 
          tooltip="How data was collected (e.g., Surveys, RCT, Site Audits)"
        />
        <InputField 
          label="Last Update" 
          path="dataQuality.lastUpdated" 
          tooltip="The date when this data was last verified"
        />
      </FieldGroup>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4">
        <div className="bg-blue-500 text-white p-3 rounded-xl h-fit">
          <Database size={24} />
        </div>
        <div>
          <h4 className="font-bold text-blue-900 mb-1">Data Entry Checklist</h4>
          <p className="text-sm text-blue-800 leading-relaxed max-w-2xl">
            To generate a high-quality **Grant Readiness Report**, ensure you have entered verified outcomes and financial efficiency ratios. AI analysis performs best when 'Outcomes' and 'Benchmark' fields match your internal audit documents.
          </p>
        </div>
      </div>
    </div>
  );
};
