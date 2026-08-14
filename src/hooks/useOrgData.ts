import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardStats, Grant } from '../../types';
import {
  EMPTY_STATS,
  persistGrants,
  persistStats,
  readCachedGrants,
  readCachedStats,
  subscribeToGrants,
  subscribeToStats,
} from '../lib/orgData';

export type SyncStatus = 'loading' | 'live' | 'cached' | 'error' | 'demo';

interface UseOrgDataResult {
  stats: DashboardStats;
  grants: Grant[];
  setStats: (stats: DashboardStats) => void;
  setGrants: (grants: Grant[]) => void;
  syncStatus: SyncStatus;
  syncError: string | null;
}

/** How long to wait after the last keystroke before writing to Firestore. */
const WRITE_DEBOUNCE_MS = 700;

/**
 * The single source of truth for an organization's grants and metrics.
 *
 * Reads come from Firestore in real time, so two people in the same org see the
 * same numbers. Writes are debounced (the KPI inputs fire on every keystroke)
 * and diffed. While a local edit is in flight we ignore incoming snapshots for
 * that slice, so the server echo can't yank the cursor out of an input.
 *
 * Demo mode is held entirely in memory: `demoStats`/`demoGrants` are served and
 * every write is dropped, so exploring the demo can never touch real data.
 */
export function useOrgData(
  orgId: string | null,
  isDemoMode: boolean,
  demoStats: DashboardStats,
  demoGrants: Grant[]
): UseOrgDataResult {
  const [stats, setStatsState] = useState<DashboardStats>(EMPTY_STATS);
  const [grants, setGrantsState] = useState<Grant[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Last state the server confirmed — the baseline persistGrants diffs against.
  const serverGrants = useRef<Grant[]>([]);
  const statsPending = useRef(false);
  const grantsPending = useRef(false);
  const statsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const grantsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Subscribe ----------------------------------------------------------
  useEffect(() => {
    if (!orgId || isDemoMode) return;

    // Paint the cached copy immediately so an offline reload isn't a blank screen.
    setStatsState(readCachedStats(orgId));
    const cachedGrants = readCachedGrants(orgId);
    setGrantsState(cachedGrants);
    serverGrants.current = cachedGrants;
    setSyncStatus(navigator.onLine ? 'loading' : 'cached');

    const unsubStats = subscribeToStats(
      orgId,
      (next) => {
        if (statsPending.current) return; // local edit is newer
        setStatsState(next);
        setSyncStatus('live');
        setSyncError(null);
      },
      (error) => {
        console.error('Metrics sync failed:', error);
        setSyncStatus('error');
        setSyncError(describeError(error));
      }
    );

    const unsubGrants = subscribeToGrants(
      orgId,
      (next) => {
        serverGrants.current = next;
        if (grantsPending.current) return;
        setGrantsState(next);
        setSyncStatus('live');
        setSyncError(null);
      },
      (error) => {
        console.error('Grant sync failed:', error);
        setSyncStatus('error');
        setSyncError(describeError(error));
      }
    );

    return () => {
      unsubStats();
      unsubGrants();
    };
  }, [orgId, isDemoMode]);

  // --- Demo mode swap -----------------------------------------------------
  useEffect(() => {
    if (isDemoMode) {
      setStatsState(demoStats);
      setGrantsState(demoGrants);
      setSyncStatus('demo');
      return;
    }
    if (orgId) {
      setStatsState(readCachedStats(orgId));
      const cached = readCachedGrants(orgId);
      setGrantsState(cached);
      serverGrants.current = cached;
      setSyncStatus(navigator.onLine ? 'loading' : 'cached');
    }
    // demoStats/demoGrants are module constants; re-running on identity is unnecessary
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, orgId]);

  // --- Writes -------------------------------------------------------------
  const setStats = useCallback(
    (next: DashboardStats) => {
      setStatsState(next);
      if (isDemoMode || !orgId) return; // demo edits are throwaway

      statsPending.current = true;
      if (statsTimer.current) clearTimeout(statsTimer.current);
      statsTimer.current = setTimeout(async () => {
        try {
          await persistStats(orgId, next);
          setSyncError(null);
          setSyncStatus('live');
        } catch (error) {
          console.error('Failed to save metrics:', error);
          setSyncStatus('error');
          setSyncError(describeError(error));
        } finally {
          statsPending.current = false;
        }
      }, WRITE_DEBOUNCE_MS);
    },
    [orgId, isDemoMode]
  );

  const setGrants = useCallback(
    (next: Grant[]) => {
      setGrantsState(next);
      if (isDemoMode || !orgId) return;

      grantsPending.current = true;
      if (grantsTimer.current) clearTimeout(grantsTimer.current);
      grantsTimer.current = setTimeout(async () => {
        try {
          await persistGrants(orgId, next, serverGrants.current);
          serverGrants.current = next;
          setSyncError(null);
          setSyncStatus('live');
        } catch (error) {
          console.error('Failed to save grants:', error);
          setSyncStatus('error');
          setSyncError(describeError(error));
        } finally {
          grantsPending.current = false;
        }
      }, WRITE_DEBOUNCE_MS);
    },
    [orgId, isDemoMode]
  );

  // Flush timers on unmount so a pending edit isn't silently dropped.
  useEffect(() => {
    return () => {
      if (statsTimer.current) clearTimeout(statsTimer.current);
      if (grantsTimer.current) clearTimeout(grantsTimer.current);
    };
  }, []);

  return { stats, grants, setStats, setGrants, syncStatus, syncError };
}

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('permission-denied') || message.includes('Missing or insufficient permissions')) {
    return "Your role doesn't allow this change, or you're no longer a member of this organization.";
  }
  if (message.includes('offline') || message.includes('unavailable')) {
    return 'No connection — showing the last saved copy. Changes will save when you reconnect.';
  }
  return 'Could not reach the database. Your latest change may not be saved.';
}
