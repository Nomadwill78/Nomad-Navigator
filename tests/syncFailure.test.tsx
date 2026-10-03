import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { EMPTY_STATS } from '../src/lib/orgData';

const h = vi.hoisted(() => ({
  statsListener: null as null | ((s: any) => void),
  persistStats: vi.fn(),
}));

vi.mock('../src/lib/orgData', async (orig) => ({
  ...(await orig<typeof import('../src/lib/orgData')>()),
  readCachedStats: () => ({}) as any,
  readCachedGrants: () => [],
  subscribeToStats: (_o: string, cb: (s: any) => void) => ((h.statsListener = cb), () => {}),
  subscribeToGrants: () => () => {},
  persistStats: h.persistStats,
}));
vi.mock('../src/lib/firebase', () => ({ db: {}, auth: {} }));

import { useOrgData } from '../src/hooks/useOrgData';

const edited = { ...EMPTY_STATS, totalPeopleServed: 2400 };

describe('useOrgData save failures', () => {
  beforeEach(() => h.persistStats.mockReset());

  it('reports the failure and keeps the edit instead of silently reverting it', async () => {
    h.persistStats.mockRejectedValueOnce(new Error('permission-denied'));
    const { result } = renderHook(() => useOrgData('org1', false, EMPTY_STATS, []));

    act(() => result.current.setStats(edited));
    await waitFor(() => expect(result.current.syncStatus).toBe('error'), { timeout: 3000 });
    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(result.current.syncError).toMatch(/role|member/i);

    // the server snapshot (old data) arrives after the failure
    act(() => h.statsListener!(EMPTY_STATS));
    expect(result.current.stats.totalPeopleServed).toBe(2400);
  });

  it('retrySync re-sends the held edit and clears the error when it succeeds', async () => {
    h.persistStats.mockRejectedValueOnce(new Error('unavailable')).mockResolvedValue(undefined);
    const { result } = renderHook(() => useOrgData('org1', false, EMPTY_STATS, []));

    act(() => result.current.setStats(edited));
    await waitFor(() => expect(result.current.syncStatus).toBe('error'), { timeout: 3000 });

    act(() => result.current.retrySync());
    await waitFor(() => expect(result.current.syncStatus).toBe('live'), { timeout: 3000 });
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(h.persistStats).toHaveBeenLastCalledWith('org1', edited);
  });
});
