import React from 'react';
import { Activity } from 'lucide-react';
import { KpiRollup, KpiHealth } from '../src/lib/overview';

interface KpiSidebarProps {
  rollup: KpiRollup;
}

const HEALTH_LABEL: Record<KpiHealth, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  off_track: 'Off track',
};

const HEALTH_STYLE: Record<KpiHealth, string> = {
  on_track: 'text-teal bg-teal/10 border-teal/25',
  at_risk: 'text-brassbright bg-brass/10 border-brass/30',
  off_track: 'text-parchment bg-abyss border-hairline',
};

/**
 * Key Indicators are the KPIs entered on each grant, rolled up. Nothing here is
 * a platform metric or a sample: if no grant has a KPI with a target, the panel
 * says so and points to where to add one.
 */
export const KpiSidebar: React.FC<KpiSidebarProps> = ({ rollup }) => {
  const { kpis, onTrack, atRisk, offTrack, withoutTarget } = rollup;

  return (
    <div className="bg-surface p-6 rounded-xl border border-hairline hover:border-brass/30 transition-colors duration-300 space-y-6">
      <div className="border-b border-hairline pb-4">
        <h3 className="font-display font-semibold text-ivory text-lg flex items-center gap-2">
          <Activity size={20} className="text-teal" />
          Key Indicators
        </h3>
        <p className="text-xs text-inkmute mt-1 font-mono2">From the KPIs on your grants</p>
      </div>

      {kpis.length === 0 ? (
        <p className="text-xs text-inkmute leading-relaxed">
          No indicators yet. Open a grant under <span className="text-parchment">Grants</span> and add a
          KPI with a target.
          {withoutTarget > 0 && ` ${withoutTarget} KPI${withoutTarget === 1 ? ' has' : 's have'} no target, so ${withoutTarget === 1 ? 'it is' : 'they are'} not counted.`}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            {([['on_track', onTrack], ['at_risk', atRisk], ['off_track', offTrack]] as [KpiHealth, number][]).map(([h, n]) => (
              <div key={h} className={`rounded-lg border px-2 py-3 ${HEALTH_STYLE[h]}`}>
                <div className="font-display text-2xl font-semibold">{n}</div>
                <div className="text-[10px] font-mono2 uppercase tracking-wider">{HEALTH_LABEL[h]}</div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {kpis.map((kpi) => (
              <div key={kpi.id} className="p-4 rounded-lg bg-ink/60 border border-hairline/70">
                <span className="text-[0.6rem] font-mono2 text-inkfaint uppercase tracking-[0.16em]">{kpi.name}</span>
                <div className="flex items-baseline justify-between gap-2 mt-1">
                  <span className="font-display text-xl font-semibold text-ivory tracking-tight">
                    {kpi.current.toLocaleString()} of {kpi.target.toLocaleString()}
                    {kpi.unit ? <span className="text-xs text-inkmute font-normal"> {kpi.unit}</span> : null}
                  </span>
                  <span className={`text-[10px] font-mono2 font-bold px-1.5 py-0.5 rounded-md border ${HEALTH_STYLE[kpi.health]}`}>
                    {Math.round(kpi.progressPercent)}%
                  </span>
                </div>
                <div className="h-1.5 bg-abyss rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-teal rounded-full" style={{ width: `${Math.min(kpi.progressPercent, 100)}%` }} />
                </div>
                <p className="text-xs text-inkmute mt-2">{kpi.funder} · {kpi.grantName}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
