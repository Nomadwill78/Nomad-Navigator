import { describe, it, expect } from 'vitest';
import { computeRisks } from '../src/lib/risks';
import type { Grant } from '../types';

const TODAY = '2026-10-06';
const g = (over: Partial<Grant> & { id: string }): Grant => ({
  name: 'G', funder: 'Plough Foundation', amount: 150000, spentAmount: 98500, startDate: '2026-01-01', endDate: '2026-12-31', status: 'active', kpis: [], ...over,
});

describe('task 23: risks', () => {
  it('has no risks for a healthy grant', () => {
    expect(computeRisks([g({ id: 'a', spentAmount: 110000 })], TODAY)).toEqual([]);
  });
  it('ranks overspend first, then late reports, then off track KPIs', () => {
    const risks = computeRisks([
      g({ id: 'a', spentAmount: 200000 }),
      g({ id: 'b', funder: 'City', spentAmount: 110000, reports: [{ id: 'r', title: 'Q3 report', dueDate: '2026-09-30', owner: 'Dana' }] }),
      g({ id: 'c', funder: 'Bank', spentAmount: 110000, kpis: [{ id: 'k', name: 'Coached', target: 80, current: 5, unit: 'people' }] }),
    ], TODAY);
    expect(risks[0].title).toContain('over the award');
    expect(risks[1].title).toContain('late');
    expect(risks[2].title).toContain('off track');
  });
  it('flags the 66% spent vs 77% elapsed pace case', () => {
    const r = computeRisks([g({ id: 'a', amount: 100, spentAmount: 66, kpis: [] })], '2026-10-08');
    expect(r.some((x) => x.title.includes('behind the timeline'))).toBe(true);
  });
  it('flags a match shortfall and an unfunded program', () => {
    const r = computeRisks([g({ id: 'a', spentAmount: 110000, matchRequired: 20000, matchSecured: 5000 })], TODAY, 85000);
    expect(r.map((x) => x.title).join('|')).toMatch(/match not fully secured/);
    expect(r.map((x) => x.title).join('|')).toMatch(/not fully funded/);
  });
  it('ignores pending grants and submitted reports', () => {
    const r = computeRisks([
      g({ id: 'a', status: 'pending', spentAmount: 999999 }),
      g({ id: 'b', spentAmount: 110000, reports: [{ id: 'r', title: 'Done', dueDate: '2026-09-01', owner: '', submittedDate: '2026-08-30' }] }),
    ], TODAY);
    expect(r).toEqual([]);
  });
  it('every risk carries the numbers behind it', () => {
    const r = computeRisks([g({ id: 'a', spentAmount: 200000 })], TODAY);
    expect(r[0].detail).toContain('$200,000');
    expect(r[0].detail).toContain('$150,000');
  });
});
