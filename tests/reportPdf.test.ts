import { describe, it, expect } from 'vitest';
import { renderFunderReport, renderBoardSummary, buildFunderReport, buildBoardSummary } from '../src/lib/reportPdf';
import type { Grant } from '../types';

const TODAY = '2026-10-06';
const kpi = (id: string, name: string, target: number, current: number, extra = {}) => ({ id, name, target, current, unit: 'youth', ...extra });

const plough: Grant = {
  id: 'plough', name: 'Youth Workforce', funder: 'Plough Foundation', amount: 150000, spentAmount: 98500,
  startDate: '2026-01-01', endDate: '2026-12-31', status: 'active', programId: 'p1', restriction: 'restricted',
  allowedUses: 'Youth wages and coaching only', matchRequired: 20000, matchSecured: 5000,
  kpis: [kpi('k1', 'Youth in paid work experience', 120, 74, { baseline: 40, definition: 'A paid placement of 4 weeks or more', ageBreakdown: [{ id: 'a', label: '16-24', count: 74 }] })],
  subgrantees: [{ id: 's', name: 'Orange Mound Tech Collective', allocatedAmount: 35000, drawnAmount: 12000, status: 'active', kpis: [], reportingStatus: 'late' }],
  budgetLines: [{ id: 'b', category: 'personnel', budgeted: 150000, spent: 98500 }],
  reports: [{ id: 'r', title: 'Q3 progress report', dueDate: '2026-10-20', owner: 'Dana' }],
};
const memphis: Grant[] = [
  plough,
  { ...plough, id: 'city', name: 'City workforce', funder: 'City of Memphis', amount: 90000, spentAmount: 0, matchRequired: undefined, kpis: [kpi('k2', 'Youth placed at 90 days', 45, 20)], subgrantees: [], reports: [] },
  { ...plough, id: 'bank', name: 'Bank', funder: 'Community bank foundation', amount: 40000, spentAmount: 0, matchRequired: undefined, kpis: [kpi('k3', 'Coaching completed', 80, 30)], subgrantees: [], reports: [] },
  { ...plough, id: 'ind', name: 'Individual', funder: 'Individual donors and events', amount: 35000, spentAmount: 0, matchRequired: undefined, kpis: [], subgrantees: [], reports: [], restriction: 'unrestricted' },
];
const text = (doc: any) => doc.output() as string;

describe('task 21: funder report', () => {
  it('shows award, spending, KPI results and the narrative', () => {
    const r = buildFunderReport({ grant: plough, orgName: 'Nomad Test Org', narrative: 'We placed 74 youth.', today: TODAY });
    expect(r.awarded).toBe(150000);
    expect(r.spent).toBe(98500);
    expect(r.kpis[0].result).toBe('74 of 120 youth');
    expect(r.kpis[0].progress).toBe('62% of target');
    expect(r.kpis[0].baseline).toContain('+34');
  });
  it('renders a real PDF that contains the numbers, in well under a minute', () => {
    const t0 = Date.now();
    const doc = renderFunderReport({ grant: plough, orgName: 'Nomad Test Org', narrative: 'We placed 74 youth.', today: TODAY });
    const out = text(doc);
    expect(Date.now() - t0).toBeLessThan(5000);
    expect(out.startsWith('%PDF')).toBe(true);
    for (const needle of ['Plough Foundation', '$150,000', '$98,500', '74 of 120 youth', 'We placed 74 youth.', 'Orange Mound Tech Collective', 'Q3 progress report']) {
      expect(out).toContain(needle);
    }
  });
  it('flags overspend plainly and prints no NaN or undefined', () => {
    const doc = renderFunderReport({ grant: { ...plough, spentAmount: 200000 }, orgName: 'Org', today: TODAY });
    const out = text(doc);
    expect(out).toContain('over the award');
    expect(out).not.toMatch(/NaN|undefined|Infinity/);
  });
  it('still renders for a bare grant with nothing but the basics', () => {
    const bare: Grant = { id: 'x', name: 'Bare', funder: 'F', amount: 0, startDate: '', endDate: '', status: 'active', kpis: [] };
    const out = text(renderFunderReport({ grant: bare, orgName: 'Org', today: TODAY }));
    expect(out).not.toMatch(/NaN|undefined|Infinity/);
    expect(out).toContain('No KPIs have been entered');
  });
});

describe('task 23: board summary', () => {
  it('is one page with program totals and the top 3 risks', () => {
    const input = { title: 'Youth Workforce and Family Stability', orgName: 'Nomad Test Org', grants: memphis, program: { budgetNeed: 400000 }, today: TODAY };
    const doc = renderBoardSummary(input);
    expect(doc.getNumberOfPages()).toBe(1);
    const out = text(doc);
    expect(out).toContain('$315,000');
    expect(out).toContain('$85,000'); // funding gap: 400,000 cost minus 315,000 awarded
    expect(out).toContain('Top risks');
  });
  it('totals equal the sum of the grants and risks are capped at 3', () => {
    const { rollup, risks } = buildBoardSummary({ title: 'P', orgName: 'O', grants: memphis.map((g) => ({ ...g, spentAmount: (g.amount ?? 0) + 1 })), today: TODAY });
    expect(rollup.totalBudget).toBe(memphis.reduce((a, g) => a + g.amount, 0));
    expect(risks).toHaveLength(3);
    expect(risks[0].title).toContain('over the award');
  });
  it('stays on one page even with many funders and outcomes', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ ...plough, id: `g${i}`, funder: `Funder ${i}`, kpis: [kpi(`k${i}`, `Outcome ${i}`, 10, 1)] }));
    expect(renderBoardSummary({ title: 'Big', orgName: 'O', grants: many, today: TODAY }).getNumberOfPages()).toBe(1);
  });
  it('says so plainly when there is nothing to report', () => {
    const out = text(renderBoardSummary({ title: 'Empty', orgName: 'O', grants: [], today: TODAY }));
    expect(out).toContain('No active or completed grants');
    expect(out).not.toMatch(/NaN|undefined|Infinity/);
  });
});
