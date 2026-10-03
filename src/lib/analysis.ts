import { DashboardStats, Grant } from '../../types';

export type MetricType = 'impact' | 'cost' | 'roi';
export type DimensionType = 'grant' | 'time' | 'funder';

export interface AnalysisPoint {
  name: string;
  fullName?: string;
  value: number;
}

/** Charts get unreadable (and slow) past this many bars; the rest roll up into "Other". */
export const MAX_CHART_POINTS = 25;

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function buildAnalysisData(
  stats: Pick<DashboardStats, 'programs'>,
  grants: Grant[],
  metric: MetricType,
  dimension: DimensionType
): AnalysisPoint[] {
  if (dimension === 'grant') {
    // Duplicate first words ("Water Access A", "Water Access B") would make two
    // bars share a label, so disambiguate with a running suffix.
    const seen = new Map<string, number>();
    return grants.map((g) => {
      const base = g.name?.split(' ')[0] || 'Untitled';
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      const kpis = g.kpis ?? [];
      const value =
        metric === 'impact'
          ? kpis.reduce((acc, k) => acc + num(k.current), 0)
          : metric === 'cost'
            ? num(g.amount)
            : // cost per unit of the grant's first KPI; stays a number so charts can scale it
              Math.round((num(g.amount) / Math.max(1, num(kpis[0]?.current) || 1)) * 100) / 100;
      return { name: n === 1 ? base : `${base} ${n}`, fullName: g.name, value };
    });
  }

  if (dimension === 'time') {
    return (stats.programs ?? []).map((p) => ({
      name: p.month,
      value: num(metric === 'impact' ? p.peopleServed : metric === 'cost' ? p.totalCost : p.costPerPerson),
    }));
  }

  const totals = new Map<string, number>();
  for (const g of grants) {
    const val =
      metric === 'impact' ? num(g.kpis?.[0]?.current) : metric === 'cost' ? num(g.amount) : num(g.amount) / 1000;
    totals.set(g.funder, (totals.get(g.funder) ?? 0) + val);
  }
  return [...totals.entries()].map(([name, value]) => ({ name, value }));
}

/** Keeps the largest points and folds the remainder into one "Other" point. */
export function capPoints(points: AnalysisPoint[], max = MAX_CHART_POINTS): AnalysisPoint[] {
  if (points.length <= max) return points;
  const sorted = [...points].sort((a, b) => b.value - a.value);
  const rest = sorted.slice(max - 1).reduce((acc, p) => acc + p.value, 0);
  return [...sorted.slice(0, max - 1), { name: `Other (${sorted.length - (max - 1)})`, value: rest }];
}

/** Share of the total as a whole-number percent; 0 (not NaN/Infinity) when the total is 0. */
export function sharePercent(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}
