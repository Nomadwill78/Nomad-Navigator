import { describe, it, expect } from 'vitest';
import { reportStatus, listDueSoon, planReminders, buildReminderEmail, describeDue, reminderKey } from '../src/lib/reporting';
import { withEntry, withoutEntry, trendPoints, changeFromBaseline, aggregateBreakdown, breakdownProblem } from '../src/lib/kpiHistory';
import type { Grant, GrantKPI } from '../types';

const TODAY = '2026-10-06';
const g = (over: Partial<Grant> & { id: string }): Grant => ({
  name: 'Plough', funder: 'Plough Foundation', amount: 1, startDate: '2026-01-01', endDate: '2026-12-31', status: 'active', kpis: [], ...over,
});
const rep = (id: string, dueDate: string, extra = {}) => ({ id, title: `Report ${id}`, dueDate, owner: 'Dana', ...extra });

describe('task 17: reporting calendar', () => {
  it('status is upcoming, submitted or late from the dates', () => {
    expect(reportStatus({ dueDate: '2026-10-20' }, TODAY)).toBe('upcoming');
    expect(reportStatus({ dueDate: '2026-10-05' }, TODAY)).toBe('late');
    expect(reportStatus({ dueDate: '2026-10-06' }, TODAY)).toBe('upcoming'); // due today is not late yet
    expect(reportStatus({ dueDate: '2026-10-05', submittedDate: '2026-10-04' }, TODAY)).toBe('submitted');
  });
  it('a report due in 14 days appears on Due Soon', () => {
    const list = listDueSoon([g({ id: 'a', reports: [rep('r1', '2026-10-20')] })], TODAY);
    expect(list).toHaveLength(1);
    expect(list[0].daysUntil).toBe(14);
  });
  it('late reports show first, submitted and far-off ones are left out', () => {
    const list = listDueSoon([g({ id: 'a', reports: [rep('far', '2027-03-01'), rep('done', '2026-10-01', { submittedDate: '2026-10-01' }), rep('soon', '2026-10-10'), rep('late', '2026-09-30')] })], TODAY);
    expect(list.map((i) => i.report.id)).toEqual(['late', 'soon']);
    expect(list[0].status).toBe('late');
  });
  it('pending grants and broken dates are ignored', () => {
    expect(listDueSoon([g({ id: 'a', status: 'pending', reports: [rep('r', '2026-10-10')] }), g({ id: 'b', reports: [rep('x', 'oops')] })], TODAY)).toEqual([]);
  });
  it('describes days in plain words', () => {
    expect(describeDue(-3)).toBe('3 days late');
    expect(describeDue(0)).toBe('Due today');
    expect(describeDue(14)).toBe('Due in 14 days');
  });
});

describe('task 18: reminders at 14 and 3 days', () => {
  const grants = [g({ id: 'a', reports: [rep('r1', '2026-10-20')] })];
  it('sends the 14 day reminder when 14 days out', () => {
    const p = planReminders('org', grants, TODAY, new Set());
    expect(p).toHaveLength(1);
    expect(p[0].kind).toBe('14');
  });
  it('sends the 3 day reminder when 3 days out', () => {
    const p = planReminders('org', grants, '2026-10-17', new Set());
    expect(p[0].kind).toBe('3');
  });
  it('never sends the same reminder twice', () => {
    const sent = new Set([reminderKey('org', 'a', 'r1', '14')]);
    expect(planReminders('org', grants, TODAY, sent)).toEqual([]);
    expect(planReminders('org', grants, '2026-10-08', sent)).toEqual([]); // still in the 14 day range
  });
  it('a missed day does not skip the reminder', () => {
    expect(planReminders('org', grants, '2026-10-07', new Set())[0].kind).toBe('14'); // 13 days out
  });
  it('a report already inside 3 days gets only the 3 day reminder', () => {
    const p = planReminders('org', grants, '2026-10-18', new Set());
    expect(p.map((x) => x.kind)).toEqual(['3']);
  });
  it('sends nothing for submitted, late, far-off or pending-grant reports', () => {
    const none = [
      g({ id: 'a', reports: [rep('s', '2026-10-10', { submittedDate: '2026-10-01' }), rep('l', '2026-10-01'), rep('f', '2026-12-01')] }),
      g({ id: 'p', status: 'pending', reports: [rep('x', '2026-10-10')] }),
    ];
    expect(planReminders('org', none, TODAY, new Set())).toEqual([]);
  });
  it('email names the report, funder and date', () => {
    const e = buildReminderEmail(planReminders('org', grants, TODAY, new Set())[0]);
    expect(e.subject).toContain('Report r1');
    expect(e.subject).toContain('14 days');
    expect(e.text).toContain('2026-10-20');
    expect(e.text).toContain('Plough Foundation');
  });
});

const kpi = (over: Partial<GrantKPI> = {}): GrantKPI => ({ id: 'k', name: 'Youth placed', target: 100, current: 0, unit: 'youth', ...over });

describe('tasks 19-20: KPI fields, history and trend', () => {
  it('3 quarterly entries draw a trend line and the latest becomes current', () => {
    let k = kpi();
    k = withEntry(k, { id: '1', date: '2026-03-31', value: 20 });
    k = withEntry(k, { id: '2', date: '2026-09-30', value: 74 });
    k = withEntry(k, { id: '3', date: '2026-06-30', value: 45 });
    expect(trendPoints(k)!.map((p) => p.value)).toEqual([20, 45, 74]);
    expect(k.current).toBe(74);
  });
  it('one entry is not a trend', () => {
    expect(trendPoints(withEntry(kpi(), { id: '1', date: '2026-03-31', value: 20 }))).toBeNull();
  });
  it('removing the latest entry rolls current back', () => {
    let k = withEntry(withEntry(kpi(), { id: '1', date: '2026-03-31', value: 20 }), { id: '2', date: '2026-06-30', value: 45 });
    k = withoutEntry(k, '2');
    expect(k.current).toBe(20);
  });
  it('shows change from baseline, and none without a baseline', () => {
    expect(changeFromBaseline(kpi({ baseline: 40, current: 74 }))).toEqual({ change: 34, percent: 85 });
    expect(changeFromBaseline(kpi({ baseline: 0, current: 10 }))).toEqual({ change: 10, percent: null });
    expect(changeFromBaseline(kpi())).toBeNull();
  });
});

describe('task 22: demographic breakdowns', () => {
  const rows = (...r: [string, number][]) => r.map(([label, count], i) => ({ id: String(i), label, count }));
  it('pools counts into percents that sum to 100', () => {
    const grants = [g({ id: 'a', kpis: [kpi({ ageBreakdown: rows(['16-24', 60], ['25-34', 40]) })] })];
    const out = aggregateBreakdown(grants, 'age');
    expect(out.map((s) => s.value)).toEqual([60, 40]);
  });
  it('a shared KPI counts its people once', () => {
    const a = g({ id: 'a', kpis: [kpi({ id: 'k1', sharedKpiId: 's', ageBreakdown: rows(['16-24', 50]) })] });
    const b = g({ id: 'b', kpis: [kpi({ id: 'k2', sharedKpiId: 's', ageBreakdown: rows(['16-24', 50]) })] });
    expect(aggregateBreakdown([a, b], 'age')[0].count).toBe(50);
  });
  it('merges labels ignoring case and returns empty with no data', () => {
    const grants = [g({ id: 'a', kpis: [kpi({ id: '1', ethnicityBreakdown: rows(['Black', 30]) }), kpi({ id: '2', ethnicityBreakdown: rows(['black', 10]) })] })];
    expect(aggregateBreakdown(grants, 'ethnicity')).toHaveLength(1);
    expect(aggregateBreakdown([g({ id: 'x' })], 'age')).toEqual([]);
  });
  it('warns when the counts do not add up to the KPI value', () => {
    expect(breakdownProblem(kpi({ current: 74, ageBreakdown: rows(['16-24', 70]) }), 'age')).toMatch(/70.*74/);
    expect(breakdownProblem(kpi({ current: 70, ageBreakdown: rows(['16-24', 70]) }), 'age')).toBeNull();
  });
});

import { validateGrant } from '../src/lib/grantValidation';
describe('validation of Phase 3 fields', () => {
  it('accepts good reports and KPI details', () => {
    expect(validateGrant({ reports: [rep('r', '2026-10-20', { ownerEmail: 'dana@org.org' })] })).toBeNull();
    expect(validateGrant({ kpis: [kpi({ baseline: 5, reportingPeriod: 'quarterly', history: [{ id: 'h', date: '2026-03-31', value: 2 }], ageBreakdown: [{ id: 'a', label: '16-24', count: 3 }] })] })).toBeNull();
  });
  it('rejects bad dates, emails, periods and negative counts', () => {
    expect(validateGrant({ reports: [rep('r', '10/20/2026')] })).toMatch(/due date/);
    expect(validateGrant({ reports: [rep('r', '2026-10-20', { ownerEmail: 'nope' })] })).toMatch(/email/);
    expect(validateGrant({ kpis: [kpi({ reportingPeriod: 'weekly' as any, baseline: 1 })] })).toMatch(/period/);
    expect(validateGrant({ kpis: [kpi({ ageBreakdown: [{ id: 'a', label: 'x', count: -1 }] })] })).toMatch(/breakdown/);
  });
});
