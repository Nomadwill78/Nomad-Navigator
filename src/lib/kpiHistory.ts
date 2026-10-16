import { Grant, GrantKPI, KpiEntry, BreakdownRow } from '../../types';
import { dayNumber } from './overview';

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

// --- History and trend ------------------------------------------------------

/** Entries with a valid date, oldest first. */
export function sortedHistory(kpi: Pick<GrantKPI, 'history'>): KpiEntry[] {
  return (kpi.history ?? [])
    .filter((e) => dayNumber(e.date) !== null && Number.isFinite(e.value))
    .sort((a, b) => (dayNumber(a.date)! - dayNumber(b.date)!));
}

/**
 * Adds or replaces the entry for a period and returns the updated KPI. The KPI's
 * `current` becomes the latest period's value, so history and the headline number
 * can never disagree.
 */
export function withEntry(kpi: GrantKPI, entry: KpiEntry): GrantKPI {
  const others = (kpi.history ?? []).filter((e) => e.id !== entry.id && e.date !== entry.date);
  const history = [...others, entry];
  const latest = sortedHistory({ history }).at(-1);
  return { ...kpi, history, current: latest ? latest.value : kpi.current };
}

export function withoutEntry(kpi: GrantKPI, entryId: string): GrantKPI {
  const history = (kpi.history ?? []).filter((e) => e.id !== entryId);
  const latest = sortedHistory({ history }).at(-1);
  return { ...kpi, history, current: latest ? latest.value : kpi.current };
}

/** A trend needs at least two measurements. */
export function trendPoints(kpi: Pick<GrantKPI, 'history'>): { date: string; value: number }[] | null {
  const pts = sortedHistory(kpi);
  return pts.length >= 2 ? pts.map((e) => ({ date: e.date, value: e.value })) : null;
}

export interface BaselineChange {
  change: number;
  /** Null when the baseline is 0, where a percent has no meaning. */
  percent: number | null;
}

/** Change since the baseline. Null when no baseline was entered. */
export function changeFromBaseline(kpi: Pick<GrantKPI, 'baseline' | 'current'>): BaselineChange | null {
  if (typeof kpi.baseline !== 'number' || !Number.isFinite(kpi.baseline)) return null;
  const change = num(kpi.current) - kpi.baseline;
  return { change, percent: kpi.baseline !== 0 ? Math.round((change / kpi.baseline) * 100) : null };
}

// --- Who was served ---------------------------------------------------------

export const AGE_SUGGESTIONS = ['Under 16', '16-24', '25-34', '35-54', '55 and over'];
export const ETHNICITY_SUGGESTIONS = [
  'Black or African American', 'White', 'Hispanic or Latino', 'Asian', 'American Indian or Alaska Native',
  'Native Hawaiian or Pacific Islander', 'Two or more races', 'Another group', 'Prefer not to say',
];

export const breakdownTotal = (rows: BreakdownRow[] | undefined): number =>
  (rows ?? []).reduce((a, r) => a + Math.max(0, num(r.count)), 0);

/** A breakdown should add up to the KPI's value. Returns a message when it does not. */
export function breakdownProblem(kpi: GrantKPI, which: 'age' | 'ethnicity'): string | null {
  const rows = which === 'age' ? kpi.ageBreakdown : kpi.ethnicityBreakdown;
  if (!rows || rows.length === 0) return null;
  const total = breakdownTotal(rows);
  return total === num(kpi.current)
    ? null
    : `The ${which} counts add up to ${total.toLocaleString()}, but this KPI is at ${num(kpi.current).toLocaleString()}.`;
}

export interface DemographicSlice { name: string; value: number; count: number; }

/**
 * Pools entered breakdowns across grants into whole-number percents that sum to 100.
 * A KPI shared by several funders is the same people, so it is counted once.
 * Groups with the same label (ignoring case) are merged.
 */
export function aggregateBreakdown(grants: Grant[], which: 'age' | 'ethnicity'): DemographicSlice[] {
  const seen = new Set<string>();
  const counts = new Map<string, { name: string; count: number }>();
  for (const g of grants) {
    if (g.status === 'pending') continue;
    for (const k of g.kpis ?? []) {
      if (k.sharedKpiId) {
        if (seen.has(k.sharedKpiId)) continue;
        seen.add(k.sharedKpiId);
      }
      for (const r of (which === 'age' ? k.ageBreakdown : k.ethnicityBreakdown) ?? []) {
        const label = (r.label ?? '').trim();
        if (!label || num(r.count) <= 0) continue;
        const key = label.toLowerCase();
        const cur = counts.get(key) ?? { name: label, count: 0 };
        cur.count += num(r.count);
        counts.set(key, cur);
      }
    }
  }
  const rows = [...counts.values()].sort((a, b) => b.count - a.count);
  const total = rows.reduce((a, r) => a + r.count, 0);
  if (total <= 0) return [];
  const exact = rows.map((r) => (r.count / total) * 100);
  const floors = exact.map(Math.floor);
  let remaining = 100 - floors.reduce((a, b) => a + b, 0);
  for (const { i } of exact.map((x, i) => ({ i, f: x - Math.floor(x) })).sort((a, b) => b.f - a.f)) {
    if (remaining <= 0) break;
    floors[i] += 1;
    remaining -= 1;
  }
  return rows.map((r, i) => ({ name: r.name, value: floors[i], count: r.count }));
}
