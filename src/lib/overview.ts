import { Grant } from '../../types';
import { resolveKpiStatus } from './kpiStatus';

/**
 * Every number on the Overview is computed here, from grants the user entered.
 * Nothing in this file invents, estimates or defaults a figure. When there is
 * nothing to compute from, functions return null or an empty list so the screen
 * can say so honestly instead of showing a made-up value.
 */

// --- Dates ----------------------------------------------------------------

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Dates are stored as plain YYYY-MM-DD text and never converted through a time
 * zone. `new Date('2026-01-01')` is midnight UTC, which displays as 12/31/2025
 * for anyone west of Greenwich. This returns a day number (days since
 * 1970-01-01, calendar arithmetic only) so comparisons never touch a zone.
 */
export function dayNumber(ymd: string): number | null {
  const m = DAY_RE.exec(ymd ?? '');
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const check = new Date(ms);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return Math.round(ms / 86_400_000);
}

/** Today's calendar date on the user's own clock, as YYYY-MM-DD. */
export function todayYmd(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** 2026-01-01 -> "01/01/2026". Returns an em-dash-free placeholder for bad input. */
export function formatYmd(ymd: string): string {
  const m = DAY_RE.exec(ymd ?? '');
  return m ? `${m[2]}/${m[3]}/${m[1]}` : 'Not set';
}

// --- Money totals ---------------------------------------------------------

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/**
 * "Awarded" means active and completed grants. A pending grant has not been awarded yet, so it is
 * left out of every total, but it is reported separately (pendingAmount) so it is never invisible.
 */
const countsTowardTotals = (g: Grant) => g.status !== 'pending';

const funderKey = (g: Grant) => (g.funder ?? '').trim().toLowerCase();

export interface GrantTotals {
  totalAwarded: number;
  totalSpent: number;
  /** Distinct funders among the grants counted in totalAwarded (active and completed). */
  funderCount: number;
  /** Of those, the funders with at least one active grant. */
  activeFunders: number;
  /** Grants counted in totalAwarded. */
  grantCount: number;
  /** Money on pending grants. Not in totalAwarded. */
  pendingAmount: number;
  pendingCount: number;
}

export function computeGrantTotals(grants: Grant[]): GrantTotals {
  const counted = grants.filter(countsTowardTotals);
  const pending = grants.filter((g) => !countsTowardTotals(g));
  const funders = new Set(counted.map(funderKey).filter(Boolean));
  const active = new Set(counted.filter((g) => g.status === 'active').map(funderKey).filter(Boolean));
  return {
    totalAwarded: counted.reduce((a, g) => a + num(g.amount), 0),
    totalSpent: counted.reduce((a, g) => a + num(g.spentAmount), 0),
    funderCount: funders.size,
    activeFunders: active.size,
    grantCount: counted.length,
    pendingAmount: pending.reduce((a, g) => a + num(g.amount), 0),
    pendingCount: pending.length,
  };
}

// --- Funding diversity ----------------------------------------------------

export interface FunderShare {
  name: string;
  /** Whole-number percent. All shares of one result sum to exactly 100. */
  value: number;
  amount: number;
}

/** Share of total awards per funder (largest remainder so the shares add to 100). */
export function computeFundingDiversity(grants: Grant[]): FunderShare[] {
  const byFunder = new Map<string, { name: string; amount: number }>();
  for (const g of grants.filter(countsTowardTotals)) {
    const name = (g.funder ?? '').trim();
    if (!name || num(g.amount) <= 0) continue;
    const key = name.toLowerCase();
    const cur = byFunder.get(key) ?? { name, amount: 0 };
    cur.amount += num(g.amount);
    byFunder.set(key, cur);
  }
  const rows = [...byFunder.values()].sort((a, b) => b.amount - a.amount);
  const total = rows.reduce((a, r) => a + r.amount, 0);
  if (total <= 0) return [];

  const exact = rows.map((r) => (r.amount / total) * 100);
  const floors = exact.map(Math.floor);
  let remaining = 100 - floors.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remaining <= 0) break;
    floors[i] += 1;
    remaining -= 1;
  }
  return rows.map((r, i) => ({ name: r.name, value: floors[i], amount: r.amount }));
}

// --- Pace -----------------------------------------------------------------

/** 'closed' and 'not_started' are for completed and pending grants, which are never flagged. */
export type PaceStatus = 'on_track' | 'at_risk' | 'no_dates' | 'closed' | 'not_started';

export interface Pace {
  status: PaceStatus;
  spentPercent: number;
  elapsedPercent: number;
  /** spentPercent minus elapsedPercent. Positive means spending ahead of time. */
  gap: number;
}

/** Spending and elapsed time may differ by up to this many points before a grant is flagged. */
export const PACE_TOLERANCE_POINTS = 10;

export function computePace(
  grant: Pick<Grant, 'amount' | 'spentAmount' | 'startDate' | 'endDate'> & { status?: Grant['status'] },
  today: string = todayYmd()
): Pace {
  const amount = num(grant.amount);
  const spentPercent = amount > 0 ? (num(grant.spentAmount) / amount) * 100 : 0;
  const start = dayNumber(grant.startDate);
  const end = dayNumber(grant.endDate);
  const now = dayNumber(today);
  // A funder-closed grant has no pace to keep, and a pending one has not started: neither raises an alert.
  if (grant.status === 'completed') return { status: 'closed', spentPercent, elapsedPercent: 100, gap: 0 };
  if (grant.status === 'pending') return { status: 'not_started', spentPercent, elapsedPercent: 0, gap: 0 };
  if (start === null || end === null || now === null || end <= start) {
    return { status: 'no_dates', spentPercent, elapsedPercent: 0, gap: 0 };
  }
  const elapsedPercent = Math.min(Math.max(((now - start) / (end - start)) * 100, 0), 100);
  const gap = spentPercent - elapsedPercent;
  return {
    status: Math.abs(gap) > PACE_TOLERANCE_POINTS ? 'at_risk' : 'on_track',
    spentPercent,
    elapsedPercent,
    gap,
  };
}

// --- Over-spend -----------------------------------------------------------

export interface OverspendInfo {
  over: boolean;
  /** Dollars spent beyond the award (0 when not over). */
  amount: number;
}

export function checkOverspend(grant: Pick<Grant, 'amount' | 'spentAmount'>): OverspendInfo {
  const over = num(grant.spentAmount) - num(grant.amount);
  return over > 0 ? { over: true, amount: over } : { over: false, amount: 0 };
}

// --- KPI rollup -----------------------------------------------------------

/** 'closed' is the final result of a completed grant. It is shown, but it is never an alert. */
export type KpiHealth = 'on_track' | 'at_risk' | 'off_track' | 'closed';

export interface RolledKpi {
  id: string;
  name: string;
  grantName: string;
  funder: string;
  current: number;
  target: number;
  unit: string;
  progressPercent: number;
  health: KpiHealth;
}

export interface KpiRollup {
  kpis: RolledKpi[];
  onTrack: number;
  atRisk: number;
  offTrack: number;
  /** Final results from completed grants. Not counted as on track, at risk or off track. */
  closed: number;
  /** KPIs with no target set. They are listed nowhere and never counted. */
  withoutTarget: number;
}

/** A KPI this many points behind the grant's elapsed time is "at risk"; this many more is "off track". */
export const KPI_AT_RISK_POINTS = 10;
export const KPI_OFF_TRACK_POINTS = 30;

export function kpiHealth(progressPercent: number, elapsedPercent: number): KpiHealth {
  if (progressPercent >= 100) return 'on_track';
  const lag = elapsedPercent - progressPercent;
  if (lag > KPI_OFF_TRACK_POINTS) return 'off_track';
  if (lag > KPI_AT_RISK_POINTS) return 'at_risk';
  return 'on_track';
}

/** Health of one KPI on one grant. A completed grant's KPIs are final results, not alerts. */
export function grantKpiHealth(grant: Pick<Grant, 'status'>, progressPercent: number, elapsedPercent: number): KpiHealth {
  return grant.status === 'completed' ? 'closed' : kpiHealth(progressPercent, elapsedPercent);
}

export interface KpiPace {
  /** One plain word for the badge. */
  label: string;
  tone: 'good' | 'warn' | 'neutral' | 'done';
  /** One sentence that says why the badge says what it says. */
  explanation: string;
  progressPercent: number;
}

const pctText = (n: number) => `${Math.round(n)}%`;

/**
 * The status shown on a KPI. It compares progress with how much of the grant period has gone,
 * so 41% done with 28% of the year gone is on track, and 67% done with 90% gone is not.
 * The explanation spells out both numbers so the badge is never a mystery.
 */
export function resolveKpiPace(
  kpi: { current: number; target: number },
  grant: Pick<Grant, 'status' | 'startDate' | 'endDate'>,
  today: string = todayYmd()
): KpiPace {
  const info = resolveKpiStatus(num(kpi.current), num(kpi.target));
  const p = info.progressPercent;
  if (info.status === 'no_target') {
    return { label: 'No target', tone: 'neutral', explanation: 'Set a target to measure progress.', progressPercent: 0 };
  }
  if (info.status === 'not_started') {
    return { label: 'Not started', tone: 'neutral', explanation: 'No progress has been entered yet.', progressPercent: 0 };
  }
  if (info.status === 'exceeded') {
    return { label: 'Exceeded', tone: 'done', explanation: `${pctText(p)} of the target, above 100%.`, progressPercent: p };
  }
  if (info.status === 'met') {
    return { label: 'Met', tone: 'done', explanation: 'The target has been reached.', progressPercent: p };
  }
  if (grant.status === 'completed') {
    return { label: 'Final', tone: 'neutral', explanation: `Final result: ${pctText(p)} of the target when the grant closed.`, progressPercent: p };
  }
  const elapsed = computePace({ amount: 0, spentAmount: 0, startDate: grant.startDate, endDate: grant.endDate }, today);
  if (elapsed.status === 'no_dates' || grant.status === 'pending') {
    return { label: 'In progress', tone: 'neutral', explanation: `${pctText(p)} of the target. Add valid grant dates to compare against the timeline.`, progressPercent: p };
  }
  const e = elapsed.elapsedPercent;
  const health = kpiHealth(p, e);
  const both = `${pctText(p)} of the target with ${pctText(e)} of the grant period gone`;
  if (health === 'on_track') {
    return { label: 'On track', tone: 'good', explanation: `${both}. That is on pace.`, progressPercent: p };
  }
  const behind = Math.round(e - p);
  return {
    label: health === 'off_track' ? 'Off track' : 'At risk',
    tone: 'warn',
    explanation: `${both}. That is ${behind} points behind pace.`,
    progressPercent: p,
  };
}

export function rollUpKpis(grants: Grant[], today: string = todayYmd()): KpiRollup {
  const out: KpiRollup = { kpis: [], onTrack: 0, atRisk: 0, offTrack: 0, closed: 0, withoutTarget: 0 };
  for (const g of grants.filter(countsTowardTotals)) {
    const elapsed = computePace({ amount: 0, spentAmount: 0, startDate: g.startDate, endDate: g.endDate }, today)
      .elapsedPercent;
    for (const k of g.kpis ?? []) {
      const info = resolveKpiStatus(num(k.current), num(k.target));
      if (info.status === 'no_target') {
        out.withoutTarget += 1;
        continue;
      }
      const health = grantKpiHealth(g, info.progressPercent, elapsed);
      out.kpis.push({
        id: `${g.id}:${k.id}`,
        name: k.name,
        grantName: g.name,
        funder: g.funder,
        current: num(k.current),
        target: num(k.target),
        unit: k.unit ?? '',
        progressPercent: info.progressPercent,
        health,
      });
      if (health === 'on_track') out.onTrack += 1;
      else if (health === 'at_risk') out.atRisk += 1;
      else if (health === 'off_track') out.offTrack += 1;
      else out.closed += 1;
    }
  }
  return out;
}

// --- Partner compliance ---------------------------------------------------

export interface PartnerCompliance {
  /** Average KPI progress across all partners with a target, each KPI capped at 100. */
  percent: number;
  partnerCount: number;
  kpiCount: number;
}

/** Null when there are no partners with a measurable KPI, so the screen shows nothing. */
export function computePartnerCompliance(grants: Grant[]): PartnerCompliance | null {
  let sum = 0;
  let kpiCount = 0;
  const partners = new Set<string>();
  for (const g of grants.filter(countsTowardTotals)) {
    for (const s of g.subgrantees ?? []) {
      for (const k of s.kpis ?? []) {
        const info = resolveKpiStatus(num(k.current), num(k.target));
        if (info.status === 'no_target') continue;
        sum += Math.min(info.progressPercent, 100);
        kpiCount += 1;
        partners.add(`${g.id}:${s.id}`);
      }
    }
  }
  if (kpiCount === 0) return null;
  return { percent: Math.round(sum / kpiCount), partnerCount: partners.size, kpiCount };
}
