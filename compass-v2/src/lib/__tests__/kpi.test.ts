import { describe, expect, it } from 'vitest';

import { resolveKpiStatus, summarizeKpis } from 'src/lib/kpi';

describe('resolveKpiStatus (ported from v1)', () => {
  it('never produces Infinity or NaN for missing or zero targets', () => {
    for (const target of [0, null, undefined, '', 'abc', -5, NaN]) {
      const info = resolveKpiStatus(50, target);

      expect(info.status).toBe('NO_TARGET');
      expect(Number.isFinite(info.progressPercent)).toBe(true);
    }
  });

  it('reports not started when there is a target but no progress', () => {
    expect(resolveKpiStatus(0, 100).status).toBe('NOT_STARTED');
    expect(resolveKpiStatus(null, 100).status).toBe('NOT_STARTED');
    expect(resolveKpiStatus(-10, 100).status).toBe('NOT_STARTED');
  });

  it('classifies progress bands exactly as v1 did', () => {
    expect(resolveKpiStatus(49, 100)).toMatchObject({ status: 'BEHIND', progressPercent: 49 });
    expect(resolveKpiStatus(50, 100)).toMatchObject({ status: 'ON_TRACK', progressPercent: 50 });
    expect(resolveKpiStatus(99, 100)).toMatchObject({ status: 'ON_TRACK', progressPercent: 99 });
    expect(resolveKpiStatus(100, 100)).toMatchObject({ status: 'MET', progressPercent: 100 });
    expect(resolveKpiStatus(150, 100)).toMatchObject({ status: 'EXCEEDED', progressPercent: 150 });
  });

  it('never rounds a near miss up to Met', () => {
    const info = resolveKpiStatus(9996, 10000);

    expect(info.status).toBe('ON_TRACK');
    expect(info.progressPercent).toBe(99.9);
  });

  it('is not thrown off by floating point noise', () => {
    expect(resolveKpiStatus(0.3, 1).progressPercent).toBe(30);
    expect(resolveKpiStatus(0.7, 1).progressPercent).toBe(70);
  });

  it('accepts numbers sent as strings', () => {
    expect(resolveKpiStatus('75', '100').status).toBe('ON_TRACK');
  });
});

describe('summarizeKpis', () => {
  it('returns no average when nothing has a target', () => {
    const summary = summarizeKpis([{ current: 5, target: 0 }, { current: 1 }]);

    expect(summary.averageProgressPercent).toBeNull();
    expect(summary.measuredCount).toBe(0);
    expect(summary.countsByStatus.NO_TARGET).toBe(2);
  });

  it('caps each KPI at 100 so one overachiever cannot hide a laggard', () => {
    const summary = summarizeKpis([
      { current: 500, target: 100 },
      { current: 10, target: 100 },
    ]);

    expect(summary.averageProgressPercent).toBe(55);
  });

  it('ignores untargeted KPIs in the average but counts them', () => {
    const summary = summarizeKpis([
      { current: 50, target: 100 },
      { current: 99, target: 0 },
    ]);

    expect(summary).toMatchObject({ kpiCount: 2, measuredCount: 1, averageProgressPercent: 50 });
  });

  it('handles an empty list', () => {
    expect(summarizeKpis([])).toMatchObject({ kpiCount: 0, averageProgressPercent: null });
  });
});
