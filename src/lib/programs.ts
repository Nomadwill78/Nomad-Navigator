import { BudgetCategory, BudgetLine, Grant, GrantKPI, Program } from '../../types';
import { resolveKpiStatus } from './kpiStatus';
import { computeGrantTotals, dayNumber, computePace, kpiHealth, KpiHealth } from './overview';

/**
 * Program-level calculations. Same rule as overview.ts: every figure is
 * computed from entered grants, and anything that cannot be computed is null
 * or empty rather than guessed.
 */

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const counted = (g: Grant) => g.status !== 'pending';

// --- Filtering (task 16) ---------------------------------------------------

export const ALL = 'all';
export const UNASSIGNED = 'none';

export interface GrantFilter {
  /** 'all', 'none' (grants with no program), or a program id. */
  programId: string;
  /** 'all' or a calendar year such as 2026. */
  year: number | 'all';
}

export const NO_FILTER: GrantFilter = { programId: ALL, year: 'all' };

/** True when the grant's dates touch the calendar year at all. */
export function grantTouchesYear(grant: Pick<Grant, 'startDate' | 'endDate'>, year: number): boolean {
  const start = dayNumber(grant.startDate);
  const end = dayNumber(grant.endDate);
  const first = dayNumber(`${year}-01-01`);
  const last = dayNumber(`${year}-12-31`);
  if (start === null || end === null || first === null || last === null) return false;
  return start <= last && end >= first;
}

export function filterGrants(grants: Grant[], filter: GrantFilter): Grant[] {
  return grants.filter((g) => {
    if (filter.programId === UNASSIGNED && g.programId) return false;
    if (filter.programId !== ALL && filter.programId !== UNASSIGNED && g.programId !== filter.programId) return false;
    if (filter.year !== 'all' && !grantTouchesYear(g, filter.year)) return false;
    return true;
  });
}

/** Years that at least one grant touches, newest first. */
export function availableYears(grants: Grant[]): number[] {
  const years = new Set<number>();
  for (const g of grants) {
    if (dayNumber(g.startDate) === null || dayNumber(g.endDate) === null) continue;
    const s = Number(g.startDate.slice(0, 4));
    const e = Number(g.endDate.slice(0, 4));
    if (e < s || e - s > 30) continue;
    for (let y = s; y <= e; y++) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

export function isFilterActive(filter: GrantFilter): boolean {
  return filter.programId !== ALL || filter.year !== 'all';
}

// --- Budget lines (task 12) -------------------------------------------------

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  personnel: 'Personnel',
  supplies: 'Supplies',
  partner_pass_through: 'Partner pass-through',
  other: 'Other',
};

export interface BudgetCheck {
  hasLines: boolean;
  budgetedTotal: number;
  spentTotal: number;
  /** Lines budgeted minus the award. Zero when they match. */
  difference: number;
  mismatch: boolean;
  /** True when line spending disagrees with the grant's spent amount. */
  spentMismatch: boolean;
}

export function checkBudgetLines(grant: Pick<Grant, 'amount' | 'spentAmount' | 'budgetLines'>): BudgetCheck {
  const lines: BudgetLine[] = grant.budgetLines ?? [];
  const budgetedTotal = lines.reduce((a, l) => a + num(l.budgeted), 0);
  const spentTotal = lines.reduce((a, l) => a + num(l.spent), 0);
  const difference = Math.round((budgetedTotal - num(grant.amount)) * 100) / 100;
  const hasLines = lines.length > 0;
  return {
    hasLines,
    budgetedTotal,
    spentTotal,
    difference,
    mismatch: hasLines && difference !== 0,
    spentMismatch: hasLines && Math.round((spentTotal - num(grant.spentAmount)) * 100) !== 0,
  };
}

// --- Match (task 11 and 13) -------------------------------------------------

export interface MatchStatus {
  required: number;
  secured: number;
  shortfall: number;
  /** 'none' when no grant requires a match. */
  status: 'none' | 'met' | 'short';
}

export function computeMatch(grants: Grant[]): MatchStatus {
  const list = grants.filter(counted);
  const required = list.reduce((a, g) => a + num(g.matchRequired), 0);
  // Secured match only counts up to what each grant requires, so a surplus on one
  // grant cannot hide a shortfall on another.
  const secured = list.reduce((a, g) => a + Math.min(num(g.matchSecured), num(g.matchRequired)), 0);
  if (required <= 0) return { required: 0, secured: 0, shortfall: 0, status: 'none' };
  const shortfall = required - secured;
  return { required, secured, shortfall, status: shortfall > 0 ? 'short' : 'met' };
}

// --- Shared KPIs (task 14) ---------------------------------------------------

export interface KpiRef { grantId: string; kpiId: string; }

/**
 * Links the KPI at `target` to the one at `source` so both are the same outcome.
 * Returns the grant changes to save; the target takes the source's current value.
 * The two KPIs keep their own targets, because each funder asks for its own number.
 */
export function linkSharedKpi(grants: Grant[], source: KpiRef, target: KpiRef): Record<string, Partial<Grant>> {
  const sg = grants.find((g) => g.id === source.grantId);
  const tg = grants.find((g) => g.id === target.grantId);
  const sk = sg?.kpis.find((k) => k.id === source.kpiId);
  const tk = tg?.kpis.find((k) => k.id === target.kpiId);
  if (!sg || !tg || !sk || !tk) return {};
  if (sg.id === tg.id) return {};

  const sharedId = sk.sharedKpiId ?? `shared-${sk.id}`;
  const out: Record<string, Partial<Grant>> = {};
  out[sg.id] = { kpis: sg.kpis.map((k) => (k.id === sk.id ? { ...k, sharedKpiId: sharedId } : k)) };
  const shared = pickSharedFields(sk);
  out[tg.id] = {
    kpis: tg.kpis.map((k) => (k.id === tk.id ? { ...k, ...shared, sharedKpiId: sharedId } : k)),
  };
  return out;
}

/** Removes the link from one KPI. The others in the group keep theirs (a group of one is simply unshared). */
export function unlinkSharedKpi(grants: Grant[], ref: KpiRef): Record<string, Partial<Grant>> {
  const g = grants.find((x) => x.id === ref.grantId);
  if (!g) return {};
  return { [g.id]: { kpis: g.kpis.map((k) => (k.id === ref.kpiId ? { ...k, sharedKpiId: undefined } : k)) } };
}

/** The parts of a KPI that describe the real-world outcome itself, so they are the same for every funder. */
export const SHARED_KPI_FIELDS = ['current', 'history', 'ageBreakdown', 'ethnicityBreakdown'] as const;
export type SharedKpiPatch = Partial<Pick<GrantKPI, (typeof SHARED_KPI_FIELDS)[number]>>;

export function pickSharedFields(kpi: GrantKPI): SharedKpiPatch {
  const out: SharedKpiPatch = {};
  for (const f of SHARED_KPI_FIELDS) if (kpi[f] !== undefined) (out as Record<string, unknown>)[f] = kpi[f];
  return out;
}

/**
 * When a shared KPI's value, history or breakdowns change, every KPI sharing its outcome
 * must change with it. Funder-specific fields (target, definition, required by) are untouched.
 * Returns changes for the OTHER grants only (the caller saves the edited grant itself).
 */
export function syncSharedFields(grants: Grant[], edited: KpiRef, patch: SharedKpiPatch): Record<string, Partial<Grant>> {
  const eg = grants.find((g) => g.id === edited.grantId);
  const ek = eg?.kpis.find((k) => k.id === edited.kpiId);
  if (!eg || !ek?.sharedKpiId) return {};
  const out: Record<string, Partial<Grant>> = {};
  for (const g of grants) {
    if (g.id === eg.id) continue;
    if (!g.kpis.some((k) => k.sharedKpiId === ek.sharedKpiId)) continue;
    out[g.id] = { kpis: g.kpis.map((k) => (k.sharedKpiId === ek.sharedKpiId ? { ...k, ...patch } : k)) };
  }
  return out;
}

/**
 * When a KPI's current value changes, every KPI sharing its outcome must change with it.
 * Returns changes for the OTHER grants only (the caller saves the edited grant itself).
 */
export function syncSharedCurrent(
  grants: Grant[],
  edited: KpiRef,
  newCurrent: number
): Record<string, Partial<Grant>> {
  return syncSharedFields(grants, edited, { current: newCurrent });
}

export interface OutcomeTarget {
  grantId: string;
  grantName: string;
  funder: string;
  target: number;
  progressPercent: number;
  health: KpiHealth;
}

export interface Outcome {
  key: string;
  name: string;
  unit: string;
  /** Counted once, however many funders report it. */
  current: number;
  shared: boolean;
  targets: OutcomeTarget[];
}

/** One row per real-world outcome. A shared KPI is one row with one target per funder. */
export function listOutcomes(grants: Grant[], today?: string): Outcome[] {
  const byKey = new Map<string, Outcome>();
  for (const g of grants.filter(counted)) {
    const elapsed = computePace({ amount: 0, spentAmount: 0, startDate: g.startDate, endDate: g.endDate }, today).elapsedPercent;
    for (const k of g.kpis ?? []) {
      const key = k.sharedKpiId ?? `${g.id}:${k.id}`;
      const info = resolveKpiStatus(num(k.current), num(k.target));
      const entry =
        byKey.get(key) ?? { key, name: k.name, unit: k.unit ?? '', current: num(k.current), shared: !!k.sharedKpiId, targets: [] };
      if (info.status !== 'no_target') {
        entry.targets.push({
          grantId: g.id,
          grantName: g.name,
          funder: g.funder,
          target: num(k.target),
          progressPercent: info.progressPercent,
          health: kpiHealth(info.progressPercent, elapsed),
        });
      }
      byKey.set(key, entry);
    }
  }
  return [...byKey.values()];
}

// --- Partners (task 15) ------------------------------------------------------

export interface PartnerSpend {
  allocated: number;
  drawn: number;
  /** Null when nothing is allocated. */
  drawnPercent: number | null;
  late: number;
  notStarted: number;
  partnerCount: number;
}

export function computePartnerSpend(grants: Grant[]): PartnerSpend {
  let allocated = 0;
  let drawn = 0;
  let late = 0;
  let notStarted = 0;
  let partnerCount = 0;
  for (const g of grants.filter(counted)) {
    for (const s of g.subgrantees ?? []) {
      partnerCount += 1;
      allocated += num(s.allocatedAmount);
      drawn += num(s.drawnAmount);
      if (s.reportingStatus === 'late') late += 1;
      if (s.reportingStatus === 'not_started') notStarted += 1;
    }
  }
  return {
    allocated,
    drawn,
    drawnPercent: allocated > 0 ? Math.round((drawn / allocated) * 100) : null,
    late,
    notStarted,
    partnerCount,
  };
}

// --- Program rollup (task 13) ------------------------------------------------

export interface FunderLine {
  grantId: string;
  funder: string;
  grantName: string;
  amount: number;
  spent: number;
  restriction: Grant['restriction'];
  match: MatchStatus;
  outcomes: Outcome[];
}

export interface ProgramRollup {
  grantCount: number;
  totalBudget: number;
  totalSpent: number;
  /** Cost to run the program minus total awarded. Null when no cost was entered. Never negative. */
  fundingGap: number | null;
  match: MatchStatus;
  funders: FunderLine[];
  outcomes: Outcome[];
  partners: PartnerSpend;
}

export function rollUpProgram(program: Pick<Program, 'budgetNeed'>, grantsInProgram: Grant[], today?: string): ProgramRollup {
  const list = grantsInProgram.filter(counted);
  const totals = computeGrantTotals(list);
  const need = program.budgetNeed;
  return {
    grantCount: list.length,
    totalBudget: totals.totalAwarded,
    totalSpent: totals.totalSpent,
    fundingGap: typeof need === 'number' && need > 0 ? Math.max(0, need - totals.totalAwarded) : null,
    match: computeMatch(list),
    funders: list.map((g) => ({
      grantId: g.id,
      funder: g.funder,
      grantName: g.name,
      amount: num(g.amount),
      spent: num(g.spentAmount),
      restriction: g.restriction,
      match: computeMatch([g]),
      outcomes: listOutcomes([g], today),
    })),
    outcomes: listOutcomes(list, today),
    partners: computePartnerSpend(list),
  };
}
