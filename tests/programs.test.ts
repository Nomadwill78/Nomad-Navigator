import { describe, it, expect } from 'vitest';
import {
  filterGrants, availableYears, checkBudgetLines, computeMatch, linkSharedKpi, syncSharedCurrent,
  listOutcomes, computePartnerSpend, rollUpProgram, grantTouchesYear, UNASSIGNED,
} from '../src/lib/programs';
import type { Grant } from '../types';

const g = (over: Partial<Grant> & { id: string }): Grant => ({
  name: 'Grant', funder: 'F', amount: 100000, spentAmount: 0, startDate: '2026-01-01', endDate: '2026-12-31',
  status: 'active', kpis: [], subgrantees: [], ...over,
});

// The four-grant Memphis scenario from the plan.
const memphis = (): Grant[] => [
  g({ id: 'plough', name: 'Plough', funder: 'Plough Foundation', amount: 150000, spentAmount: 98500, programId: 'p1', startDate: '2026-01-01', endDate: '2026-12-31',
      kpis: [{ id: 'a', name: 'Youth in paid work experience', target: 120, current: 74, unit: 'youth' }] }),
  g({ id: 'city', name: 'City workforce', funder: 'City of Memphis', amount: 90000, programId: 'p1', startDate: '2026-07-01', endDate: '2027-06-30',
      kpis: [{ id: 'b', name: 'Youth placed in unsubsidized jobs at 90 days', target: 45, current: 20, unit: 'youth' }] }),
  g({ id: 'bank', name: 'Bank', funder: 'Community bank foundation', amount: 40000, programId: 'p1', startDate: '2026-03-01', endDate: '2027-02-28',
      kpis: [{ id: 'c', name: 'Participants completing financial coaching', target: 80, current: 30, unit: 'people' }] }),
  g({ id: 'ind', name: 'Individual', funder: 'Individual donors and events', amount: 35000, programId: 'p1', restriction: 'unrestricted' }),
];

describe('task 10: program holds 4 grants', () => {
  it('filters to a program', () => {
    expect(filterGrants(memphis(), { programId: 'p1', year: 'all' })).toHaveLength(4);
    expect(filterGrants(memphis(), { programId: 'other', year: 'all' })).toHaveLength(0);
  });
  it('finds grants with no program', () => {
    const list = [...memphis(), g({ id: 'x' })];
    expect(filterGrants(list, { programId: UNASSIGNED, year: 'all' }).map((x) => x.id)).toEqual(['x']);
  });
});

describe('task 16: year filter', () => {
  it('keeps grants whose dates touch the year', () => {
    expect(grantTouchesYear({ startDate: '2026-07-01', endDate: '2027-06-30' }, 2027)).toBe(true);
    expect(grantTouchesYear({ startDate: '2026-07-01', endDate: '2027-06-30' }, 2028)).toBe(false);
    expect(filterGrants(memphis(), { programId: 'all', year: 2027 }).map((x) => x.id)).toEqual(['city', 'bank']);
  });
  it('lists years newest first', () => {
    expect(availableYears(memphis())).toEqual([2027, 2026]);
  });
  it('ignores grants with broken dates', () => {
    expect(availableYears([g({ id: 'z', startDate: '', endDate: '' })])).toEqual([]);
  });
});

describe('task 12: budget lines', () => {
  it('matching lines show no warning', () => {
    const c = checkBudgetLines({ amount: 100, spentAmount: 30, budgetLines: [
      { id: '1', category: 'personnel', budgeted: 70, spent: 20 },
      { id: '2', category: 'supplies', budgeted: 30, spent: 10 },
    ] });
    expect(c.mismatch).toBe(false);
    expect(c.spentMismatch).toBe(false);
  });
  it('mismatch warns and reports the difference', () => {
    const c = checkBudgetLines({ amount: 100, spentAmount: 0, budgetLines: [{ id: '1', category: 'other', budgeted: 80, spent: 0 }] });
    expect(c.mismatch).toBe(true);
    expect(c.difference).toBe(-20);
  });
  it('no lines means no warning', () => {
    expect(checkBudgetLines({ amount: 100, spentAmount: 0 }).mismatch).toBe(false);
  });
});

describe('task 11/13: match', () => {
  it('short when secured is below required', () => {
    const m = computeMatch([g({ id: '1', matchRequired: 20000, matchSecured: 5000 })]);
    expect(m).toMatchObject({ status: 'short', shortfall: 15000 });
  });
  it('a surplus on one grant does not hide a shortfall on another', () => {
    const m = computeMatch([g({ id: '1', matchRequired: 10, matchSecured: 100 }), g({ id: '2', matchRequired: 10, matchSecured: 0 })]);
    expect(m.status).toBe('short');
    expect(m.secured).toBe(10);
  });
  it('none when nothing is required', () => {
    expect(computeMatch(memphis()).status).toBe('none');
  });
});

describe('task 14: shared KPI counts once, reports against two targets', () => {
  const two = () => [
    g({ id: 'A', funder: 'City', kpis: [{ id: 'k1', name: 'Youth placed in jobs', target: 45, current: 40, unit: 'youth' }] }),
    g({ id: 'B', funder: 'Plough', kpis: [{ id: 'k2', name: 'Youth placed in jobs', target: 60, current: 0, unit: 'youth' }] }),
  ];
  it('linking copies the value and keeps each target', () => {
    const grants = two();
    const changes = linkSharedKpi(grants, { grantId: 'A', kpiId: 'k1' }, { grantId: 'B', kpiId: 'k2' });
    const a = { ...grants[0], ...changes.A };
    const b = { ...grants[1], ...changes.B };
    expect(a.kpis[0].sharedKpiId).toBe(b.kpis[0].sharedKpiId);
    expect(b.kpis[0].current).toBe(40);
    expect(b.kpis[0].target).toBe(60);
  });
  it('lists one outcome, value 40 counted once, with 2 funder targets', () => {
    const grants = two();
    const ch = linkSharedKpi(grants, { grantId: 'A', kpiId: 'k1' }, { grantId: 'B', kpiId: 'k2' });
    const linked = grants.map((x) => ({ ...x, ...(ch[x.id] ?? {}) }));
    const outcomes = listOutcomes(linked, '2026-10-06');
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].current).toBe(40);
    expect(outcomes[0].targets.map((t) => t.target).sort()).toEqual([45, 60]);
  });
  it('editing one updates the other', () => {
    const grants = two();
    const ch = linkSharedKpi(grants, { grantId: 'A', kpiId: 'k1' }, { grantId: 'B', kpiId: 'k2' });
    const linked = grants.map((x) => ({ ...x, ...(ch[x.id] ?? {}) }));
    const sync = syncSharedCurrent(linked, { grantId: 'A', kpiId: 'k1' }, 44);
    expect(sync.B.kpis![0].current).toBe(44);
    expect(sync.A).toBeUndefined();
  });
  it('unlinked KPIs do not sync', () => {
    expect(syncSharedCurrent(two(), { grantId: 'A', kpiId: 'k1' }, 5)).toEqual({});
  });
});

describe('task 15: partner spend', () => {
  it('shows $12,000 drawn of $35,000', () => {
    const p = computePartnerSpend([g({ id: '1', subgrantees: [
      { id: 's', name: 'Orange Mound Tech Collective', allocatedAmount: 35000, drawnAmount: 12000, status: 'active', kpis: [], reportingStatus: 'late' },
    ] })]);
    expect(p).toMatchObject({ allocated: 35000, drawn: 12000, drawnPercent: 34, late: 1 });
  });
  it('null percent with no partners', () => {
    expect(computePartnerSpend(memphis()).drawnPercent).toBeNull();
  });
});

describe('task 13: program rollup equals the sum of the 4 grants', () => {
  it('totals', () => {
    const r = rollUpProgram({ budgetNeed: 400000 }, memphis(), '2026-10-06');
    expect(r.totalBudget).toBe(315000);
    expect(r.totalSpent).toBe(98500);
    expect(r.fundingGap).toBe(85000);
    expect(r.funders).toHaveLength(4);
  });
  it('gap is null when no cost entered and never negative', () => {
    expect(rollUpProgram({}, memphis()).fundingGap).toBeNull();
    expect(rollUpProgram({ budgetNeed: 1000 }, memphis()).fundingGap).toBe(0);
  });
  it('each funder carries its own KPIs', () => {
    const r = rollUpProgram({}, memphis(), '2026-10-06');
    expect(r.funders.find((f) => f.grantId === 'city')!.outcomes[0].targets[0].target).toBe(45);
  });
});
