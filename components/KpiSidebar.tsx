import React from 'react';
import { TrendingUp, Activity, HelpCircle } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { SaasKPI } from '../types';

interface KpiSidebarProps {
  kpis: SaasKPI[];
}

export const KpiSidebar: React.FC<KpiSidebarProps> = ({ kpis }) => {
  return (
    <div className="bg-surface p-6 rounded-xl border border-hairline hover:border-brass/30 transition-colors duration-300 space-y-6">
      <div className="flex items-center justify-between border-b border-hairline pb-4">
        <div>
          <h3 className="font-display font-semibold text-ivory text-lg flex items-center gap-2">
            <Activity size={20} className="text-teal" />
            Key Indicators
          </h3>
          <p className="text-xs text-inkmute mt-1 font-mono2">Platform vitals</p>
        </div>
        <span className="px-2.5 py-1 bg-brass/10 text-brass text-[10px] font-mono2 uppercase rounded-full tracking-wider border border-brass/25">
          Vitality
        </span>
      </div>

      {kpis.length === 0 && (
        <p className="text-xs text-inkmute leading-relaxed">
          No indicators yet. Add them under <span className="text-parchment">Manage Data → Key
          Performance Indicators</span>.
        </p>
      )}

      <div className="space-y-5">
        {kpis.map((kpi) => {
          const isUp = kpi.trend === 'up';
          const sparkData = (kpi.sparkline || []).map((val, idx) => ({ id: idx, value: val }));

          return (
            <div
              key={kpi.id}
              className="p-4 rounded-lg bg-ink/60 border border-hairline/70 hover:border-brass/35 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[0.6rem] font-mono2 text-inkfaint uppercase tracking-[0.16em]">{kpi.name}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-2xl font-semibold text-ivory tracking-tight">{kpi.value}</span>
                    <span className={`inline-flex items-center gap-0.5 text-[11px] font-mono2 font-bold px-1.5 py-0.5 rounded-md ${
                      isUp ? 'text-teal bg-teal/10 border border-teal/25' : 'text-inkmute bg-abyss border border-hairline'
                    }`}>
                      {isUp && <TrendingUp size={12} />}
                      {isUp ? '+' : ''}{kpi.changePercent}%
                    </span>
                  </div>
                </div>

                {sparkData.length > 0 && (
                  <div className="h-10 w-24 self-center pr-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparkData}>
                        <defs>
                          <linearGradient id={`sparkGrad-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4fc4d3" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#4fc4d3" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#4fc4d3"
                          strokeWidth={2}
                          fill={`url(#sparkGrad-${kpi.id})`}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-hairline/50 flex gap-2 items-start">
                <HelpCircle size={14} className="text-inkfaint shrink-0 mt-0.5" />
                <p className="text-xs text-inkmute leading-relaxed group-hover:text-parchment transition-colors">
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
