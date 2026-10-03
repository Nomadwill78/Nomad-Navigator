import { describe, it, expect } from 'vitest';
import { buildAnalysisData, capPoints, sharePercent, MAX_CHART_POINTS } from '../src/lib/analysis';
import type { Grant } from '../types';

const grant = (over: Partial<Grant> & { id: string }): Grant => ({
  name: 'Water Access', funder: 'Gates', amount: 100000, startDate: '2026-01-01', endDate: '2026-12-31',
  status: 'active', kpis: [{ id: 'k1', name: 'People', target: 1000, current: 250 } as any], ...over,
});
const stats = { programs: [{ name: 'A', month: 'Jan', peopleServed: 10, totalCost: 100, costPerPerson: 10 }] } as any;

describe('analysis calculations', () => {
  it('impact sums KPI currents, cost is the grant amount, roi is a number (cost per unit)', () => {
    const g = [grant({ id: '1', kpis: [{ id: 'a', current: 100 }, { id: 'b', current: 50 }] as any })];
    expect(buildAnalysisData(stats, g, 'impact', 'grant')[0].value).toBe(150);
    expect(buildAnalysisData(stats, g, 'cost', 'grant')[0].value).toBe(100000);
    const roi = buildAnalysisData(stats, [grant({ id: '1' })], 'roi', 'grant')[0].value;
    expect(typeof roi).toBe('number');
    expect(roi).toBe(400);
  });

  it('never produces NaN/Infinity for empty, zero or malformed grants', () => {
    const bad = [grant({ id: '1', kpis: [] as any, amount: NaN as any }), grant({ id: '2', kpis: undefined as any })];
    for (const m of ['impact', 'cost', 'roi'] as const)
      for (const d of ['grant', 'funder', 'time'] as const)
        for (const p of buildAnalysisData(stats, bad, m, d)) expect(Number.isFinite(p.value)).toBe(true);
  });

  it('gives grants sharing a first word distinct chart labels', () => {
    const names = buildAnalysisData(stats, [grant({ id: '1' }), grant({ id: '2' }), grant({ id: '3' })], 'cost', 'grant').map(p => p.name);
    expect(new Set(names).size).toBe(3);
  });

  it('groups by funder and sums', () => {
    const g = [grant({ id: '1', funder: 'A' }), grant({ id: '2', funder: 'A' }), grant({ id: '3', funder: 'B' })];
    const out = Object.fromEntries(buildAnalysisData(stats, g, 'cost', 'funder').map(p => [p.name, p.value]));
    expect(out).toEqual({ A: 200000, B: 100000 });
  });

  it('share percent is 0 (not NaN) when the total is 0', () => {
    expect(sharePercent(5, 0)).toBe(0);
    expect(sharePercent(25, 100)).toBe(25);
  });

  it('caps chart points, keeps the largest, and preserves the total via "Other"', () => {
    const pts = Array.from({ length: 1200 }, (_, i) => ({ name: `g${i}`, value: i + 1 }));
    const capped = capPoints(pts);
    expect(capped).toHaveLength(MAX_CHART_POINTS);
    expect(capped[0].value).toBe(1200);
    expect(capped.at(-1)!.name).toMatch(/^Other/);
    expect(capped.reduce((a, p) => a + p.value, 0)).toBe(pts.reduce((a, p) => a + p.value, 0));
  });
});
