import { describe, it, expect } from 'vitest';
import { fiscalYearOf, fiscalYearRange, fiscalYearLabel, grantTouchesFiscalYear, isValidStartMonth } from '../src/lib/fiscalYear';
import { filterGrants, availableYears } from '../src/lib/programs';
import type { Grant } from '../types';

const g = (id: string, startDate: string, endDate: string): Grant => ({
  id, name: id, funder: 'F', amount: 1, startDate, endDate, status: 'active', kpis: [],
});

describe('issue 2: fiscal year (Harborlight starts in July)', () => {
  it('names a July start year for the year it ends in', () => {
    expect(fiscalYearOf('2026-07-01', 7)).toBe(2027);
    expect(fiscalYearOf('2026-06-30', 7)).toBe(2026);
    expect(fiscalYearOf('2027-06-30', 7)).toBe(2027);
    expect(fiscalYearOf('2027-07-01', 7)).toBe(2028);
  });
  it('a calendar fiscal year is just the calendar year', () => {
    expect(fiscalYearOf('2026-01-01', 1)).toBe(2026);
    expect(fiscalYearOf('2026-12-31', 1)).toBe(2026);
  });
  it('gives the exact first and last day', () => {
    expect(fiscalYearRange(2027, 7)).toEqual({ start: '2026-07-01', end: '2027-06-30' });
    expect(fiscalYearRange(2026, 1)).toEqual({ start: '2026-01-01', end: '2026-12-31' });
    expect(fiscalYearRange(2025, 10)).toEqual({ start: '2024-10-01', end: '2025-09-30' });
    expect(fiscalYearRange(2025, 3)).toEqual({ start: '2024-03-01', end: '2025-02-28' }); // 2025 is not a leap year
    expect(fiscalYearRange(2025, 3)).not.toEqual({ start: '2024-03-01', end: '2025-02-29' });
    expect(fiscalYearRange(2025, 4).end).toBe('2025-03-31');
  });
  it('labels the year with its dates so it cannot be misread', () => {
    expect(fiscalYearLabel(2027, 7)).toBe('FY2027 (Jul 2026 to Jun 2027)');
    expect(fiscalYearLabel(2026, 1)).toBe('FY2026');
    expect(fiscalYearLabel(2025, 10)).toBe('FY2025 (Oct 2024 to Sep 2025)');
  });
  it('a Jul 2026 to Jun 2027 grant counts in FY2027 only, not in two years', () => {
    const grant = { startDate: '2026-07-01', endDate: '2027-06-30' };
    expect(grantTouchesFiscalYear(grant, 2027, 7)).toBe(true);
    expect(grantTouchesFiscalYear(grant, 2026, 7)).toBe(false);
    expect(grantTouchesFiscalYear(grant, 2028, 7)).toBe(false);
    // The old calendar behaviour is what double counted it:
    expect(grantTouchesFiscalYear(grant, 2026, 1)).toBe(true);
    expect(grantTouchesFiscalYear(grant, 2027, 1)).toBe(true);
  });
  it('a grant that really spans two fiscal years appears in both, and only those', () => {
    const grant = { startDate: '2026-01-01', endDate: '2026-12-31' };
    expect(grantTouchesFiscalYear(grant, 2026, 7)).toBe(true);
    expect(grantTouchesFiscalYear(grant, 2027, 7)).toBe(true);
    expect(grantTouchesFiscalYear(grant, 2028, 7)).toBe(false);
    expect(grantTouchesFiscalYear(grant, 2025, 7)).toBe(false);
  });
  it('the boundary days belong to the right year', () => {
    expect(grantTouchesFiscalYear({ startDate: '2027-07-01', endDate: '2027-07-01' }, 2027, 7)).toBe(false);
    expect(grantTouchesFiscalYear({ startDate: '2027-07-01', endDate: '2027-07-01' }, 2028, 7)).toBe(true);
    expect(grantTouchesFiscalYear({ startDate: '2027-06-30', endDate: '2027-06-30' }, 2027, 7)).toBe(true);
  });
  it('filters grants and lists fiscal years using the start month', () => {
    const grants = [g('a', '2026-07-01', '2027-06-30'), g('b', '2027-07-01', '2028-06-30')];
    expect(filterGrants(grants, { programId: 'all', year: 2027 }, 7).map((x) => x.id)).toEqual(['a']);
    expect(filterGrants(grants, { programId: 'all', year: 2027 }).map((x) => x.id)).toEqual(['a', 'b']); // calendar 2027 touches both
    expect(availableYears(grants, 7)).toEqual([2028, 2027]);
    expect(availableYears(grants, 1)).toEqual([2028, 2027, 2026]);
  });
  it('bad dates are ignored and months are validated', () => {
    expect(fiscalYearOf('nope', 7)).toBeNull();
    expect(availableYears([g('x', '', '')], 7)).toEqual([]);
    expect(isValidStartMonth(7)).toBe(true);
    expect(isValidStartMonth(0)).toBe(false);
    expect(isValidStartMonth(13)).toBe(false);
    expect(isValidStartMonth(6.5)).toBe(false);
  });
});
