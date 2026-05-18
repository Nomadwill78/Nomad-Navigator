// @ts-nocheck
import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Legend,
  Cell
} from 'recharts';
import { 
  Filter, 
  TrendingUp, 
  DollarSign, 
  Users, 
  PieChart as PieIcon, 
  Layers,
  ChevronDown,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { DashboardStats, Grant } from '../types';

interface AnalysisViewProps {
  stats: DashboardStats;
  grants: Grant[];
}

type MetricType = 'impact' | 'cost' | 'roi';
type DimensionType = 'grant' | 'time' | 'funder';

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export const AnalysisView: React.FC<AnalysisViewProps> = ({ stats, grants }) => {
  const [metric, setMetric] = useState<MetricType>('impact');
  const [dimension, setDimension] = useState<DimensionType>('grant');
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');

  // Prepare data based on selection
  const getAnalysisData = () => {
    if (dimension === 'grant') {
      return grants.map(g => ({
        name: g.id === 'g1' ? 'Phase II' : 'Sanitation', // Short names
        fullName: g.name,
        value: metric === 'impact' 
          ? g.kpis.reduce((acc, k) => acc + k.current, 0)
          : metric === 'cost' ? g.amount : (g.amount / Math.max(1, g.kpis[0]?.current || 1)).toFixed(2)
      }));
    }

    if (dimension === 'time') {
      return stats.programs.map(p => ({
        name: p.month,
        value: metric === 'impact' ? p.peopleServed : metric === 'cost' ? p.totalCost : p.costPerPerson
      }));
    }

    if (dimension === 'funder') {
      const funderTotals: Record<string, number> = {};
      grants.forEach(g => {
        const val = metric === 'impact' 
          ? g.kpis[0]?.current || 0 
          : metric === 'cost' ? g.amount : g.amount / 1000;
        funderTotals[g.funder] = (funderTotals[g.funder] || 0) + Number(val);
      });
      return Object.entries(funderTotals).map(([name, value]) => ({ name, value }));
    }

    return [];
  };

  const data = getAnalysisData();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Advanced Analytics</h2>
          <p className="text-slate-500">Cross-reference program impact against funding portfolios.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Metric Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
             {(['impact', 'cost', 'roi'] as MetricType[]).map((m) => (
               <button
                 key={m}
                 onClick={() => setMetric(m)}
                 className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                   metric === m ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                 }`}
               >
                 {m}
               </button>
             ))}
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-3 shadow-sm text-sm font-bold text-slate-600">
            <Filter size={16} className="text-slate-400" />
            <select 
              value={dimension} 
              onChange={(e) => setDimension(e.target.value as DimensionType)}
              className="outline-none bg-transparent cursor-pointer"
            >
              <option value="grant">By Grant Portfolio</option>
              <option value="time">By Temporal Trend</option>
              <option value="funder">By Funder Allocation</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
             <button 
               onClick={() => setChartType('bar')}
               className={`p-2 rounded-lg transition-all ${chartType === 'bar' ? 'bg-brand-50 text-brand-600' : 'text-slate-400'}`}
             >
               <Layers size={18} />
             </button>
             <button 
               onClick={() => setChartType('area')}
               className={`p-2 rounded-lg transition-all ${chartType === 'area' ? 'bg-brand-50 text-brand-600' : 'text-slate-400'}`}
             >
               <TrendingUp size={18} />
             </button>
          </div>
        </div>
      </div>

      {/* Main Analysis Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="bg-brand-600 text-white p-2.5 rounded-xl">
                 {metric === 'impact' ? <Users size={20} /> : metric === 'cost' ? <DollarSign size={20} /> : <TrendingUp size={20} />}
              </div>
              <div>
                 <h3 className="font-bold text-slate-800 text-lg capitalize">{metric} Analysis</h3>
                 <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Pivoted by {dimension}</p>
              </div>
           </div>
           <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-xs font-bold border border-green-100">
              <ArrowUpRight size={14} />
              <span>Optimized Portfolio</span>
           </div>
        </div>

        <div className="p-8">
           <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 {chartType === 'bar' ? (
                   <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}} dy={15} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                     <Tooltip 
                       cursor={{fill: '#f8fafc'}}
                       contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                     />
                     <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                        {data.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Bar>
                   </BarChart>
                 ) : (
                   <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                     <defs>
                       <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                         <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}} dy={15} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                     <Tooltip 
                       contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                     />
                     <Area 
                       type="monotone" 
                       dataKey="value" 
                       stroke="#0ea5e9" 
                       strokeWidth={4}
                       fillOpacity={1} 
                       fill="url(#colorValue)" 
                     />
                   </AreaChart>
                 )}
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Insight Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {data.slice(0, 4).map((item, i) => (
           <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-brand-500 transition-all cursor-default">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.name}</p>
                <h4 className="text-2xl font-bold text-slate-800 tabular-nums">
                   {metric === 'cost' ? '$' : ''}{Number(item.value).toLocaleString()}
                </h4>
              </div>
              <div className="mt-4 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                 <p className="text-[10px] text-slate-500 font-medium">Contributes {((Number(item.value) / data.reduce((a,b) => a + Number(b.value), 0)) * 100).toFixed(0)}% to total {metric}</p>
              </div>
           </div>
         ))}
      </div>

      {/* Methodology Note */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 flex items-start gap-6 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
         <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
            <Info className="text-brand-400" size={24} />
         </div>
         <div className="relative z-10">
            <h4 className="font-bold text-lg mb-2">Analysis Calibration</h4>
            <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
               Varied data analysis uses weighted aggregation from your **Grant Metrics** and **Program Stats**. Cross-referencing {dimension} against {metric} identifies marginal utility—allowing you to shift focus to higher-ROI interventions before the NEXT reporting cycle.
            </p>
         </div>
      </div>
    </div>
  );
};
