import React from 'react';
import { TrendingUp, Activity, HelpCircle } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { SaasKPI } from '../types';

interface KpiSidebarProps {
  kpis: SaasKPI[];
}

export const KpiSidebar: React.FC<KpiSidebarProps> = ({ kpis }) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow duration-300 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <Activity size={20} className="text-brand-500" />
            Key Performance Indicators
          </h3>
          <p className="text-xs text-slate-500 mt-1">Crucial metrics for the SaaS platform</p>
        </div>
        <span className="px-2.5 py-1 bg-brand-50 text-brand-700 text-[10px] font-bold uppercase rounded-full tracking-wider border border-brand-100">
          SaaS Vitality
        </span>
      </div>

      <div className="space-y-5">
        {kpis.map((kpi) => {
          const isUp = kpi.trend === 'up';
          // Prepare sparkline data
          const sparkData = (kpi.sparkline || []).map((val, idx) => ({ id: idx, value: val }));

          return (
            <div 
              key={kpi.id} 
              className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-brand-200 hover:bg-slate-50/80 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{kpi.name}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{kpi.value}</span>
                    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                      isUp ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-slate-600 bg-slate-100 border border-slate-200'
                    }`}>
                      {isUp && <TrendingUp size={12} />}
                      {isUp ? '+' : ''}{kpi.changePercent}%
                    </span>
                  </div>
                </div>

                {/* Compact Sparkline Chart */}
                {sparkData.length > 0 && (
                  <div className="h-10 w-24 self-center pr-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparkData}>
                        <defs>
                          <linearGradient id={`sparkGrad-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          fill={`url(#sparkGrad-${kpi.id})`}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Tooltip explanation inside row */}
              <div className="mt-3 pt-3 border-t border-slate-100/50 flex gap-2 items-start">
                <HelpCircle size={14} className="text-slate-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 leading-relaxed group-hover:text-slate-700 transition-colors">
                  {kpi.explanation}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
