import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { DashboardStats, Grant } from '../../types';

/**
 * Organization-scoped data access.
 *
 * Everything lives under `organizations/{orgId}/…`, which is what makes tenant
 * isolation structural rather than a matter of remembering to filter:
 *
 *   organizations/{orgId}/grants/{grantId}     one document per grant
 *   organizations/{orgId}/metrics/dashboard    one document, the whole DashboardStats
 *
 * `firestore.rules` gates both on org membership, so a query for another org's
 * data is rejected by the database, not merely hidden by the UI.
 *
 * localStorage is used ONLY as an offline mirror of what the server last sent,
 * keyed per organization. It is never the source of truth.
 */

/** A brand-new organization starts empty. No sample numbers are ever seeded into real orgs. */
export const EMPTY_STATS: DashboardStats = {
  totalPeopleServed: 0,
  totalBudgetSpent: 0,
  avgCostPerPerson: 0,
  programs: [],
  demographics: { age: [], race: [], gender: [], disabilityPercent: 0 },
  geographic: { neighborhoods: [], urbanRural: [] },
  outcomesDetails: { householdsWaterAccess: 0, healthImprovements: 0, behaviorChanges: 0 },
  theoryOfChange: { activities: '—', outputs: '—', outcomes: '—', impact: '—' },
  financials: { spending: [], sources: [], operatingReserveMonths: 0 },
  dataQuality: { level: 'Not set', method: 'Not set', lastUpdated: '—' },
  sroi: 0,
  benchmarkComparison: '—',
  saasKpis: [],
};

const grantsCollection = (orgId: string) => collection(db, `organizations/${orgId}/grants`);
const grantDoc = (orgId: string, grantId: string) => doc(db, `organizations/${orgId}/grants`, grantId);
const statsDoc = (orgId: string) => doc(db, `organizations/${orgId}/metrics`, 'dashboard');

// --- Offline mirror -------------------------------------------------------

const statsCacheKey = (orgId: string) => `nomad_compass_stats_${orgId}`;
const grantsCacheKey = (orgId: string) => `nomad_compass_grants_${orgId}`;

function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to cache org data locally:', e);
  }
}

export const readCachedStats = (orgId: string) => readCache<DashboardStats>(statsCacheKey(orgId), EMPTY_STATS);
export const readCachedGrants = (orgId: string) => readCache<Grant[]>(grantsCacheKey(orgId), []);

/**
 * Removes the pre-org localStorage keys. Their contents were seeded from the
 * bundled sample dataset, so they are deliberately NOT migrated into a real
 * organization — importing sample numbers as if they were an org's own would
 * violate the product's "never inflate" principle.
 */
export function clearLegacyLocalData() {
  try {
    localStorage.removeItem('nomad_compass_stats');
    localStorage.removeItem('nomad_compass_grants');
  } catch {
    /* storage unavailable — nothing to clean up */
  }
}

// --- Normalisation --------------------------------------------------------

/** Firestore rejects `undefined`. Fill the optional fields before every write. */
function sanitizeGrant(grant: Grant): Grant {
  return {
    ...grant,
    spentAmount: grant.spentAmount ?? 0,
    subgrantees: (grant.subgrantees ?? []).map((sub) => ({
      ...sub,
      kpis: sub.kpis ?? [],
    })),
    kpis: grant.kpis ?? [],
  };
}

/** Merge a server document over the empty shape so a partial doc can't crash a chart. */
function hydrateStats(raw: Partial<DashboardStats> | undefined): DashboardStats {
  if (!raw) return EMPTY_STATS;
  return {
    ...EMPTY_STATS,
    ...raw,
    demographics: { ...EMPTY_STATS.demographics, ...(raw.demographics ?? {}) },
    geographic: { ...EMPTY_STATS.geographic, ...(raw.geographic ?? {}) },
    outcomesDetails: { ...EMPTY_STATS.outcomesDetails, ...(raw.outcomesDetails ?? {}) },
    theoryOfChange: { ...EMPTY_STATS.theoryOfChange, ...(raw.theoryOfChange ?? {}) },
    financials: { ...EMPTY_STATS.financials, ...(raw.financials ?? {}) },
    dataQuality: { ...EMPTY_STATS.dataQuality, ...(raw.dataQuality ?? {}) },
    programs: raw.programs ?? [],
    saasKpis: raw.saasKpis ?? [],
  };
}

// --- Subscriptions --------------------------------------------------------

export function subscribeToGrants(
  orgId: string,
  onData: (grants: Grant[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    grantsCollection(orgId),
    (snap) => {
      const grants = snap.docs.map((d) => ({ ...(d.data() as Grant), id: d.id }));
      writeCache(grantsCacheKey(orgId), grants);
      onData(grants);
    },
    (error) => onError(error)
  );
}

export function subscribeToStats(
  orgId: string,
  onData: (stats: DashboardStats) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    statsDoc(orgId),
    (snap) => {
      const stats = hydrateStats(snap.exists() ? (snap.data() as DashboardStats) : undefined);
      writeCache(statsCacheKey(orgId), stats);
      onData(stats);
    },
    (error) => onError(error)
  );
}

// --- Writes ---------------------------------------------------------------

export async function persistStats(orgId: string, stats: DashboardStats): Promise<void> {
  await setDoc(statsDoc(orgId), hydrateStats(stats));
}

/**
 * Writes only what actually changed between `previous` and `next`, and deletes
 * grants that disappeared. The views hand us the whole array, so diffing here
 * keeps them unchanged while avoiding a full rewrite on every keystroke.
 */
export async function persistGrants(orgId: string, next: Grant[], previous: Grant[]): Promise<void> {
  const batch = writeBatch(db);
  const previousById = new Map(previous.map((g) => [g.id, g]));
  let writes = 0;

  for (const grant of next) {
    const before = previousById.get(grant.id);
    if (!before || JSON.stringify(before) !== JSON.stringify(grant)) {
      batch.set(grantDoc(orgId, grant.id), sanitizeGrant(grant) as unknown as Record<string, unknown>);
      writes++;
    }
  }

  const nextIds = new Set(next.map((g) => g.id));
  for (const grant of previous) {
    if (!nextIds.has(grant.id)) {
      batch.delete(grantDoc(orgId, grant.id));
      writes++;
    }
  }

  if (writes > 0) await batch.commit();
}
