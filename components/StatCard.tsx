import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

interface StatCardProps {
  title: string;
  value: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  description?: string;
  /** Two Bearings Rule: 'impact' draws the card in Signal Teal, 'funding' in
   *  Lamplit Brass for money, governance, and quality metrics. */
  accent?: 'impact' | 'funding';
  sparklineData?: { value: number }[];
  subValue?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  trend,
  trendDirection = 'neutral',
  icon,
  description,
  accent: accentName = 'impact',
  sparklineData,
  subValue,
}) => {
  const accent = accentName === 'funding' ? '#cba85c' : '#4fc4d3';

  return (
    <div className="relative overflow-hidden rounded-xl p-6 bg-surface border border-hairline transition-all duration-300 hover:border-brass/45 group">
      {/* accent rule */}
      <div className="absolute top-0 left-0 h-full w-0.5" style={{ background: accent, opacity: 0.85 }}></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-5">
          <div
            className="p-2 rounded-lg border"
            style={{ background: `${accent}18`, borderColor: `${accent}40`, color: accent }}
          >
            {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-5 h-5' })}
          </div>

          {trend && (
            <div
              className="flex items-center text-[0.68rem] font-mono2 font-bold px-2 py-1 rounded-full border"
              style={
                trendDirection === 'down'
                  ? { color: '#93a6c2', background: 'rgba(147,166,194,0.08)', borderColor: 'rgba(147,166,194,0.25)' }
                  : { color: accent, background: `${accent}14`, borderColor: `${accent}33` }
              }
            >
              {trendDirection === 'up' ? (
                <ArrowUpRight className="w-3 h-3 mr-1" />
              ) : trendDirection === 'down' ? (
                <ArrowDownRight className="w-3 h-3 mr-1" />
              ) : null}
              {trend}
            </div>
          )}
        </div>

        <h3 className="text-inkfaint text-[0.6rem] font-mono2 uppercase tracking-[0.18em] mb-2">{title}</h3>
        <div className="flex items-baseline gap-2">
          <div className="font-display text-3xl font-semibold tracking-tight text-ivory">{value}</div>
          {subValue && <span className="text-sm font-medium text-inkmute">{subValue}</span>}
        </div>

        {description && <p className="text-inkmute text-xs mt-1.5 leading-relaxed">{description}</p>}
      </div>

      {/* Sparkline */}
      {sparklineData && (
        <div className="absolute bottom-0 left-0 right-0 h-14 opacity-40 group-hover:opacity-70 transition-opacity">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient id={`sc-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke={accent} fill={`url(#sc-${title.replace(/\s/g, '')})`} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
