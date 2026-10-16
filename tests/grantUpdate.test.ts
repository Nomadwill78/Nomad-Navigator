import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/lib/firebase', () => ({ db: {}, auth: {} }));

import { buildGrantUpdate, deepStripUndefined } from '../src/lib/orgData';

describe('grant updates to Firestore', () => {
  it('turns a cleared field into an explicit delete instead of dropping it', () => {
    const payload = buildGrantUpdate({ programId: undefined, restriction: undefined, amount: 5 });
    expect(Object.keys(payload).sort()).toEqual(['amount', 'programId', 'restriction']);
    expect(payload.amount).toBe(5);
    expect(payload.programId).toBeDefined(); // the deleteField() marker, not undefined
    expect(payload.programId).not.toBe(undefined);
  });

  it('strips undefined nested inside lists, which Firestore rejects', () => {
    const cleaned = deepStripUndefined({ kpis: [{ id: 'a', sharedKpiId: undefined, current: 1 }] });
    expect(cleaned).toEqual({ kpis: [{ id: 'a', current: 1 }] });
    expect('sharedKpiId' in cleaned.kpis[0]).toBe(false);
  });
});
