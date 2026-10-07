import { describe, it, expect } from 'vitest';
import {
  dayNumber, formatYmd, computeGrantTotals, computeFundingDiversity, computePace,
  checkOverspend, rollUpKpis, computePartnerCompliance, kpiHealth,
} from '../src/lib/overview';
import type { Grant } from '../types';

const grant = (over: Partial<Grant> & { id: string }): Grant => ({
  name: 'Youth Workforce', funder: 'Plough Foundation', amount: 150000, spentAmount: 98500,
  startDate: '2026-01-01', endDate: '2026-12-31', status: 'active',
  kpis: [{ id: 'k1', name: 'Youth in paid work experience', target: 120, current: 74, unit: 'youth' }],
  subgrantees: [], ...over,
});

describe('Phase 1 task 1: grant totals', () => {
  it('test scenario shows $150,000 awarded, $98,500 spent, 1 funder', () => {
    expect(computeGrantTotals([grant({ id: 'a' })])).toMatchObject({ totalAwarded: 150000, totalSpent: 98500, activeFunders: 1 });
  });
  it('all four Memphis grants total $315,000 across 4 funders', () => {
    const g = [
      grant({ id: '1' }),
      grant({ id: '2', funder: 'City of Memphis', amount: 90000, spentAmount: 0 }),
      grant({ id: '3', funder: 'Community bank foundation', amount: 40000, spentAmount: 0 }),
      grant({ id: '4', funder: 'Individual donors', amount: 35000, spentAmount: 0 }),
    ];
    const t = computeGrantTotals(g);
    expect(t.totalAwarded).toBe(315000);
    expect(t.activeFunders).toBe(4);
  });
  it('is all zeros for no grants and ignores pending grants and bad numbers', () => {
    expect(computeGrantTotals([])).toEqual({ totalAwarded: 0, totalSpent: 0, activeFunders: 0, grantCount: 0 });
    const t = computeGrantTotals([grant({ id: 'p', status: 'pending' }), grant({ id: 'n', amount: NaN as any })]);
    expect(t.totalAwarded).toBe(0);
  });
  it('counts one funder once even with different capitalization', () => {
    const t = computeGrantTotals([grant({ id: '1' }), grant({ id: '2', funder: 'plough foundation ' })]);
    expect(t.activeFunders).toBe(1);
  });
});

describe('Phase 1 task 2: funding diversity', () => {
  it('two funders sum to exactly 100%', () => {
    const d = computeFundingDiversity([grant({ id: '1' }), grant({ id: '2', funder: 'City', amount: 90000 })]);
    expect(d.map((x) => x.value).reduce((a, b) => a + b, 0)).toBe(100);
    expect(d[0].name).toBe('Plough Foundation');
  });
  it('thirds still add to 100', () => {
    const g = ['A', 'B', 'C'].map((f, i) => grant({ id: String(i), funder: f, amount: 100 }));
    expect(computeFundingDiversity(g).reduce((a, x) => a + x.value, 0)).toBe(100);
  });
  it('is empty with no money, never NaN', () => {
    expect(computeFundingDiversity([])).toEqual([]);
    expect(computeFundingDiversity([grant({ id: '1', amount: 0 })])).toEqual([]);
  });
});

describe('Phase 1 task 3: KPI rollup', () => {
  it('shows the 74 of 120 KPI', () => {
    const r = rollUpKpis([grant({ id: '1' })], '2026-10-06');
    expect(r.kpis).toHaveLength(1);
    expect(r.kpis[0]).toMatchObject({ current: 74, target: 120 });
  });
  it('counts on track, at risk and off track', () => {
    expect(kpiHealth(100, 50)).toBe('on_track');
    expect(kpiHealth(50, 55)).toBe('on_track');
    expect(kpiHealth(40, 55)).toBe('at_risk');
    expect(kpiHealth(10, 55)).toBe('off_track');
  });
  it('skips KPIs with no target and counts them separately', () => {
    const r = rollUpKpis([grant({ id: '1', kpis: [{ id: 'x', name: 'n', target: 0, current: 5, unit: '' }] })], '2026-10-06');
    expect(r.kpis).toHaveLength(0);
    expect(r.withoutTarget).toBe(1);
  });
});

describe('Phase 1 task 4: partner compliance', () => {
  const partner = (cur: number, tgt: number) => ({
    id: 's', name: 'Orange Mound Tech Collective', allocatedAmount: 35000, status: 'active' as const,
    kpis: [{ id: 'sk', name: 'Trained', target: tgt, current: cur, unit: '' }],
  });
  it('partner at 45% shows 45%', () => {
    expect(computePartnerCompliance([grant({ id: '1', subgrantees: [partner(18, 40)] })])?.percent).toBe(45);
  });
  it('0 partners shows nothing', () => {
    expect(computePartnerCompliance([grant({ id: '1' })])).toBeNull();
  });
});

describe('Phase 1 task 6: dates never shift', () => {
  it('displays exactly what was entered', () => {
    expect(formatYmd('2026-01-01')).toBe('01/01/2026');
    expect(formatYmd('2026-12-31')).toBe('12/31/2026');
  });
  it('rejects impossible dates', () => {
    expect(dayNumber('2026-02-30')).toBeNull();
    expect(dayNumber('not a date')).toBeNull();
  });
  it('consecutive days are exactly 1 apart', () => {
    expect(dayNumber('2026-03-02')! - dayNumber('2026-03-01')!).toBe(1);
  });
});

describe('Phase 1 task 7: over-spend', () => {
  it('flags $200,000 spent on a $150,000 award and reports the excess', () => {
    expect(checkOverspend({ amount: 150000, spentAmount: 200000 })).toEqual({ over: true, amount: 50000 });
  });
  it('does not flag spending equal to or under the award', () => {
    expect(checkOverspend({ amount: 150000, spentAmount: 150000 }).over).toBe(false);
  });
});

describe('Phase 1 task 9: pace rule', () => {
  // 2026-01-01 to 2026-12-31 is 364 days; day 280 is about 77% elapsed.
  const dates = { startDate: '2026-01-01', endDate: '2026-12-31' };
  it('66% spent vs 77% elapsed is at risk', () => {
    const p = computePace({ amount: 100, spentAmount: 66, ...dates }, '2026-10-08');
    expect(Math.round(p.elapsedPercent)).toBe(77);
    expect(p.status).toBe('at_risk');
  });
  it('within 10 points is on track', () => {
    expect(computePace({ amount: 100, spentAmount: 70, ...dates }, '2026-10-08').status).toBe('on_track');
  });
  it('bad dates degrade to no_dates, not NaN', () => {
    const p = computePace({ amount: 100, spentAmount: 50, startDate: '', endDate: '' });
    expect(p.status).toBe('no_dates');
    expect(Number.isFinite(p.gap)).toBe(true);
  });
});
