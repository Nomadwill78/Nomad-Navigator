import { describe, expect, it } from 'vitest';

import {
  findGrantDataIssues,
  formatDataCheck,
  nextDueAfterSubmission,
  nextReportDueAfter,
  percentSpent,
  resolvePace,
  timeElapsedPercent,
} from 'src/lib/grant';

describe('percentSpent', () => {
  it('is null rather than Infinity when there is no award', () => {
    expect(percentSpent(100, 0)).toBeNull();
    expect(percentSpent(100, null)).toBeNull();
    expect(percentSpent(null, 1000)).toBeNull();
  });

  it('computes a percentage and allows overspend to show above 100', () => {
    expect(percentSpent(2500, 10000)).toBe(25);
    expect(percentSpent(12000, 10000)).toBe(120);
  });
});

describe('timeElapsedPercent', () => {
  it('measures progress through the grant period and clamps to 0..100', () => {
    expect(timeElapsedPercent('2026-01-01', '2026-01-11', '2026-01-06')).toBe(50);
    expect(timeElapsedPercent('2026-01-01', '2026-01-11', '2025-12-01')).toBe(0);
    expect(timeElapsedPercent('2026-01-01', '2026-01-11', '2027-01-01')).toBe(100);
  });

  it('is null for missing or backwards dates', () => {
    expect(timeElapsedPercent(null, '2026-01-11', '2026-01-06')).toBeNull();
    expect(timeElapsedPercent('2026-02-01', '2026-01-11', '2026-01-06')).toBeNull();
    expect(timeElapsedPercent('2026-01-01', '2026-01-01', '2026-01-01')).toBeNull();
  });
});

describe('resolvePace', () => {
  const base = { status: 'ACTIVE' as const };

  it('is on pace when progress keeps up with time, or runs ahead', () => {
    expect(resolvePace({ ...base, kpiProgressPercent: 50, elapsedPercent: 55 })).toBe('ON_PACE');
    expect(resolvePace({ ...base, kpiProgressPercent: 80, elapsedPercent: 30 })).toBe('ON_PACE');
  });

  it('flags slipping and off pace at the documented gaps', () => {
    // gap of exactly 10 is still on pace; exactly 25 is still slipping
    expect(resolvePace({ ...base, kpiProgressPercent: 50, elapsedPercent: 60 })).toBe('ON_PACE');
    expect(resolvePace({ ...base, kpiProgressPercent: 49, elapsedPercent: 60 })).toBe('SLIPPING');
    expect(resolvePace({ ...base, kpiProgressPercent: 35, elapsedPercent: 60 })).toBe('SLIPPING');
    expect(resolvePace({ ...base, kpiProgressPercent: 34, elapsedPercent: 60 })).toBe('OFF_PACE');
  });

  it('refuses to judge without data or for grants that are not active', () => {
    expect(resolvePace({ ...base, kpiProgressPercent: null, elapsedPercent: 60 })).toBe('NOT_ENOUGH_DATA');
    expect(resolvePace({ ...base, kpiProgressPercent: 10, elapsedPercent: null })).toBe('NOT_ENOUGH_DATA');
    expect(resolvePace({ status: 'COMPLETED', kpiProgressPercent: 10, elapsedPercent: 90 })).toBe('NOT_ENOUGH_DATA');
  });
});

describe('nextReportDueAfter', () => {
  it('steps quarterly from the anchor without drifting', () => {
    expect(nextReportDueAfter('2026-01-15', '2026-01-15', 'QUARTERLY')).toBe('2026-04-15');
    expect(nextReportDueAfter('2026-01-15', '2026-05-01', 'QUARTERLY')).toBe('2026-07-15');
    expect(nextReportDueAfter('2026-01-15', '2027-02-01', 'QUARTERLY')).toBe('2027-04-15');
  });

  it('keeps month-end anchors on the month end', () => {
    expect(nextReportDueAfter('2026-01-31', '2026-01-31', 'MONTHLY')).toBe('2026-02-28');
    expect(nextReportDueAfter('2026-01-31', '2026-02-28', 'MONTHLY')).toBe('2026-03-31');
  });

  it('supports weekly and annual cycles', () => {
    expect(nextReportDueAfter('2026-01-05', '2026-01-20', 'WEEKLY')).toBe('2026-01-26');
    expect(nextReportDueAfter('2025-06-30', '2026-06-30', 'ANNUAL')).toBe('2027-06-30');
  });

  it('returns null for a malformed date instead of looping', () => {
    expect(nextReportDueAfter('nope', '2026-01-01', 'MONTHLY')).toBeNull();
  });
});

describe('findGrantDataIssues', () => {
  const asOf = '2026-10-06';
  const healthy = {
    name: 'Clean Water 2026',
    status: 'ACTIVE',
    funderId: 'f1',
    awardUnits: 50000,
    spentUnits: 10000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    reportFrequency: 'QUARTERLY',
  };
  const freshKpi = { name: 'Households', target: 100, asOfDate: '2026-09-30' };

  it('finds nothing wrong with a healthy grant', () => {
    expect(findGrantDataIssues(healthy, [freshKpi], asOf)).toEqual([]);
    expect(formatDataCheck([])).toBe('No problems found.');
  });

  it('carries over v1 rules: end after start, amounts, names', () => {
    const issues = findGrantDataIssues(
      { ...healthy, name: ' ', funderId: null, awardUnits: 0, endDate: '2025-12-31' },
      [freshKpi],
      asOf,
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        'The grant has no name.',
        'No funder is linked to this grant.',
        'The award amount is missing or zero.',
        'The end date is before the start date.',
      ]),
    );
  });

  it('flags overspending without blocking the save', () => {
    expect(findGrantDataIssues({ ...healthy, spentUnits: 60000 }, [freshKpi], asOf)).toContain(
      'Spent is more than the award amount. Check the numbers.',
    );
  });

  it('flags active grants missing a schedule, KPIs, targets or fresh measurements', () => {
    const issues = findGrantDataIssues({ ...healthy, reportFrequency: null }, [], asOf);

    expect(issues.join(' ')).toContain('no reporting frequency');
    expect(issues.join(' ')).toContain('No KPIs are tracked');

    const kpiIssues = findGrantDataIssues(
      healthy,
      [{ name: 'A', target: 0, asOfDate: '2026-09-30' }, { name: 'B', target: 10, asOfDate: '2026-01-01' }],
      asOf,
    );

    expect(kpiIssues.join(' ')).toContain('1 KPI has no target: A');
    expect(kpiIssues.join(' ')).toContain('1 KPI has no measurement date or a result older than 90 days');
  });

  it('does not nag about prospects that have no award yet', () => {
    expect(findGrantDataIssues({ name: 'Idea', status: 'PROSPECT', funderId: 'f', awardUnits: null, spentUnits: null }, [], asOf)).toEqual([]);
  });

  it('formats issues as a bulleted list', () => {
    expect(formatDataCheck(['One.', 'Two.'])).toBe('• One.\n• Two.');
  });
});

describe('nextDueAfterSubmission', () => {
  const quarterly = { frequency: 'QUARTERLY' as const, startDate: '2026-01-01' };

  it('moves to the next cycle when a report is filed early', () => {
    expect(nextDueAfterSubmission({ ...quarterly, currentDue: '2026-10-15', submittedOn: '2026-10-10' })).toBe('2027-01-15');
  });

  it('moves to the next cycle when it is filed on the day', () => {
    expect(nextDueAfterSubmission({ ...quarterly, currentDue: '2026-10-15', submittedOn: '2026-10-15' })).toBe('2027-01-15');
  });

  it('skips a missed cycle when a report is filed very late, rather than leaving a past date', () => {
    expect(nextDueAfterSubmission({ ...quarterly, currentDue: '2026-04-15', submittedOn: '2026-10-20' })).toBe('2027-01-15');
  });

  it('starts from the grant start date when no due date was set', () => {
    expect(nextDueAfterSubmission({ ...quarterly, currentDue: null, submittedOn: '2026-02-10' })).toBe('2026-04-01');
  });
});
