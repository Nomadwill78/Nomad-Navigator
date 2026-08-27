import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardStats, Grant } from '../../types';
import {
  EMPTY_STATS,
  createGrant as createGrantRemote,
  deleteGrant as deleteGrantRemote,
  persistStats,
  readCachedGrants,
  readCachedStats,
  subscribeToGrants,
  subscribeToStats,
  updateGrant as updateGrantRemote,
} from '../lib/orgData';
import { generateId } from '../lib/id';

export type SyncStatus = 'loading' | 'live' | 'cached' | 'error' | 'demo';

interface UseOrgDataResult {
  stats: DashboardStats;
  grants: Grant[];
  setStats: (stats: DashboardStats) => void;
  /** Writes a brand-new grant immediately (not debounced) and returns its id. */
  createGrant: (grant: Omit<Grant, 'id'>) => Promise<string>;
  /** Debounced partial write scoped to exactly one grant. */
  updateGrant: (grantId: string, changes: Partial<Grant>) => void;
  /** Removes exactly one grant. Never touches any other grant. */
  deleteGrant: (grantId: string) => void;
  syncStatus: SyncStatus;
  syncError: string | null;
}

/** How long to wait after the last keystroke before writing to Firestore. */
const WRITE_DEBOUNCE_MS = 700;

/**
 * The single source of truth for an organization's grants and metrics.
 *
 * Reads come from Firestore in real time, so two people in the same org see the
 * same numbers. Grant writes are entity-scoped: each grant has its own debounce
 * timer and its own "pending" flag, so an in-flight edit to Grant A can never
 * suppress or clobber an incoming update to Grant B — the failure mode of the
 * old whole-array diff-and-batch design.
 *
 * Demo mode is held entirely in memory: `demoStats`/`demoGrants` are served and
 * every write is applied to local state only, so exploring the demo can never
 * touch real data.
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

  const statsPending = useRef(false);
  const statsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Grant ids with an edit in flight (debounce pending or write in progress) —
  // per-grant, not global, so a snapshot echo for a DIFFERENT grant is never held back.
  const pendingGrantIds = useRef<Set<string>>(new Set());
  // Changes queued per grant, merged shallowly across rapid successive edits so a
  // fast KPI keystroke followed immediately by a spentAmount edit doesn't drop one.
  const pendingChanges = useRef<Map<string, Partial<Grant>>>(new Map());
  const grantTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearAllGrantTimers = () => {
    grantTimers.current.forEach((t) => clearTimeout(t));
    grantTimers.current.clear();
    pendingChanges.current.clear();
    pendingGrantIds.current.clear();
  };

  // --- Subscribe ----------------------------------------------------------
  useEffect(() => {
    if (!orgId || isDemoMode) return;

    // Paint the cached copy immediately so an offline reload isn't a blank screen.
    setStatsState(readCachedStats(orgId));
    setGrantsState(readCachedGrants(orgId));
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
        setGrantsState((current) => {
          if (pendingGrantIds.current.size === 0) return next;
          // Keep the in-progress local version of any grant with an edit in
          // flight; take the server's version of everything else. This is what
          // lets another user's concurrent edit to a different grant come
          // straight through instead of being blocked by our own pending edit.
          const currentById = new Map(current.map((g) => [g.id, g]));
          return next.map((g) => (pendingGrantIds.current.has(g.id) ? currentById.get(g.id) ?? g : g));
        });
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
      setGrantsState(readCachedGrants(orgId));
      setSyncStatus(navigator.onLine ? 'loading' : 'cached');
    }
    // demoStats/demoGrants are module constants; re-running on identity is unnecessary
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, orgId]);

  // --- Stats write ----------------------------------------------------------
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

  // --- Grant writes -----------------------------------------------------
  const createGrant = useCallback(
    async (grant: Omit<Grant, 'id'>): Promise<string> => {
      if (isDemoMode) {
        const id = generateId();
        setGrantsState((cur) => [...cur, { ...grant, id }]);
        return id;
      }
      if (!orgId) throw new Error('No active organization.');

      try {
        const id = await createGrantRemote(orgId, grant);
        setSyncError(null);
        setSyncStatus('live');
        return id;
      } catch (error) {
        console.error('Failed to create grant:', error);
        setSyncStatus('error');
        setSyncError(describeError(error));
        throw error;
      }
    },
    [orgId, isDemoMode]
  );

  const updateGrant = useCallback(
    (grantId: string, changes: Partial<Grant>) => {
      setGrantsState((cur) => cur.map((g) => (g.id === grantId ? { ...g, ...changes } : g)));
      if (isDemoMode || !orgId) return; // demo edits are throwaway, already applied above

      pendingGrantIds.current.add(grantId);
      pendingChanges.current.set(grantId, { ...pendingChanges.current.get(grantId), ...changes });

      const existingTimer = grantTimers.current.get(grantId);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(async () => {
        grantTimers.current.delete(grantId);
        const toWrite = pendingChanges.current.get(grantId);
        pendingChanges.current.delete(grantId);
        if (!toWrite) return;
        try {
          await updateGrantRemote(orgId, grantId, toWrite);
          setSyncError(null);
          setSyncStatus('live');
        } catch (error) {
          console.error('Failed to save grant:', error);
          setSyncStatus('error');
          setSyncError(describeError(error));
        } finally {
          pendingGrantIds.current.delete(grantId);
        }
      }, WRITE_DEBOUNCE_MS);
      grantTimers.current.set(grantId, timer);
    },
    [orgId, isDemoMode]
  );

  const deleteGrant = useCallback(
    (grantId: string) => {
      setGrantsState((cur) => cur.filter((g) => g.id !== grantId));
      if (isDemoMode || !orgId) return;

      const existingTimer = grantTimers.current.get(grantId);
      if (existingTimer) clearTimeout(existingTimer);
      grantTimers.current.delete(grantId);
      pendingChanges.current.delete(grantId);
      pendingGrantIds.current.delete(grantId);

      deleteGrantRemote(orgId, grantId).catch((error) => {
        console.error('Failed to delete grant:', error);
        setSyncStatus('error');
        setSyncError(describeError(error));
      });
    },
    [orgId, isDemoMode]
  );

  // Clear timers on unmount so nothing fires against an org the component has left.
  useEffect(() => {
    return () => {
      if (statsTimer.current) clearTimeout(statsTimer.current);
      clearAllGrantTimers();
    };
  }, []);

  return { stats, grants, setStats, createGrant, updateGrant, deleteGrant, syncStatus, syncError };
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
