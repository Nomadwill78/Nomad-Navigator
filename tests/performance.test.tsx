import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { buildAnalysisData, capPoints } from '../src/lib/analysis';
import type { Grant } from '../types';

vi.mock('../src/contexts/AuthContext', () => ({ useAuth: () => ({ role: 'admin' }) }));
vi.mock('../src/lib/firebase', () => ({ db: {}, auth: {} }));

const make = (n: number): Grant[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `g${i}`, name: `Program ${i} water access`, funder: `Funder ${i % 40}`, amount: 10000 + i,
    startDate: '2026-01-01', endDate: '2026-12-31', status: 'active' as const,
    kpis: Array.from({ length: 5 }, (_, k) => ({ id: `k${k}`, name: `KPI ${k}`, target: 100, current: k * 10, unit: 'people' })) as any,
    subgrantees: [], spentAmount: 500,
  }));

const time = (fn: () => void) => { const t = performance.now(); fn(); return performance.now() - t; };

describe('large dataset performance (jsdom, 1,000-5,000 grants)', () => {
  for (const n of [1000, 5000]) {
    it(`aggregates ${n} grants quickly`, () => {
      const grants = make(n);
      const ms = time(() => {
        for (const m of ['impact', 'cost', 'roi'] as const)
          for (const d of ['grant', 'funder'] as const) capPoints(buildAnalysisData({ programs: [] }, grants, m, d));
      });
      console.log(`  aggregate x6 over ${n} grants: ${ms.toFixed(1)} ms`);
      expect(ms).toBeLessThan(250);
    });
  }

  it('renders the Grant Tracking list with 1,000 grants', async () => {
    const { GrantTrackingView } = await import('../components/GrantTrackingView');
    let nodes = 0;
    const ms = time(() => {
      const r = render(<GrantTrackingView grants={make(1000)} onCreateGrant={async () => 'x'} onUpdateGrant={() => {}} onDeleteGrant={() => {}} />);
      nodes = r.container.querySelectorAll('*').length;
    });
    console.log(`  GrantTrackingView, 1000 grants: ${ms.toFixed(0)} ms, ${nodes} DOM nodes`);
    expect(ms).toBeLessThan(15000);
  }, 60000);
});
