import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { DashboardStats, Grant, Program } from '../../types';
import { validateGrant, validateProgram } from './grantValidation';

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
 *
 * Grants are written one document at a time (createGrant/updateGrant/deleteGrant)
 * rather than as a diffed whole-array batch. That's what makes "editing Grant A"
 * and "editing Grant B" independent operations instead of two writers racing to
 * rewrite the same collection snapshot.
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
const programsCollection = (orgId: string) => collection(db, `organizations/${orgId}/programs`);
const programDoc = (orgId: string, programId: string) => doc(db, `organizations/${orgId}/programs`, programId);
const statsDoc = (orgId: string) => doc(db, `organizations/${orgId}/metrics`, 'dashboard');

// --- Offline mirror -------------------------------------------------------

const statsCacheKey = (orgId: string) => `nomad_compass_stats_${orgId}`;
const grantsCacheKey = (orgId: string) => `nomad_compass_grants_${orgId}`;
const programsCacheKey = (orgId: string) => `nomad_compass_programs_${orgId}`;

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
export const readCachedPrograms = (orgId: string) => readCache<Program[]>(programsCacheKey(orgId), []);
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
    subgrantees: (grant.subgrantees ?? []).map((sub) => stripUndefined({ ...sub, kpis: sub.kpis ?? [] }) as typeof sub),
    kpis: (grant.kpis ?? []).map((k) => stripUndefined(k as unknown as Record<string, unknown>) as unknown as typeof k),
    budgetLines: grant.budgetLines ?? [],
  };
}

/**
 * `updateDoc` rejects `undefined` the same way `setDoc` does, but a partial
 * update legitimately has no reason to touch every key — so unlike
 * `sanitizeGrant`, this drops absent keys instead of defaulting them.
 */
/** Removes `undefined` at every depth, including inside lists, which Firestore also rejects. */
export function deepStripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => deepStripUndefined(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = deepStripUndefined(v);
    }
    return out as T;
  }
  return value;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
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

export function subscribeToPrograms(
  orgId: string,
  onData: (programs: Program[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    programsCollection(orgId),
    (snap) => {
      const programs = snap.docs.map((d) => ({ ...(d.data() as Program), id: d.id }));
      writeCache(programsCacheKey(orgId), programs);
      onData(programs);
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
 * Creates one new grant document with a Firestore-generated id — never a
 * client-side timestamp, which can collide across two rapid adds or two users
 * adding at once. Throws (without writing) if `grant` fails runtime validation.
 */
export async function createGrant(orgId: string, grant: Omit<Grant, 'id'>): Promise<string> {
  const invalid = validateGrant(grant);
  if (invalid) throw new Error(invalid);

  const ref = doc(grantsCollection(orgId));
  await setDoc(ref, deepStripUndefined(sanitizeGrant({ ...grant, id: ref.id })) as unknown as Record<string, unknown>);
  return ref.id;
}

/**
 * Updates exactly one grant document with exactly the keys in `changes`.
 * Because this touches only `grantId`'s document, two people editing two
 * different grants never contend, and neither write can clobber the other's
 * grant the way the old whole-array diff could.
 */
export async function updateGrant(orgId: string, grantId: string, changes: Partial<Grant>): Promise<void> {
  const invalid = validateGrant(changes);
  if (invalid) throw new Error(invalid);

  await updateDoc(grantDoc(orgId, grantId), deepStripUndefined(stripUndefined(changes as Record<string, unknown>)));
}

/** Deletes exactly one grant document. Never touches any other grant. */
export async function deleteGrant(orgId: string, grantId: string): Promise<void> {
  await deleteDoc(grantDoc(orgId, grantId));
}

// --- Programs -------------------------------------------------------------

export async function createProgram(orgId: string, program: Omit<Program, 'id'>): Promise<string> {
  const invalid = validateProgram(program) ?? (program.name?.trim() ? null : 'Program name is required.');
  if (invalid) throw new Error(invalid);
  const ref = doc(programsCollection(orgId));
  await setDoc(ref, stripUndefined({ ...program, id: ref.id }) as Record<string, unknown>);
  return ref.id;
}

export async function updateProgram(orgId: string, programId: string, changes: Partial<Omit<Program, 'id'>>): Promise<void> {
  const invalid = validateProgram(changes);
  if (invalid) throw new Error(invalid);
  await updateDoc(programDoc(orgId, programId), stripUndefined(changes as Record<string, unknown>));
}

export async function deleteProgram(orgId: string, programId: string): Promise<void> {
  await deleteDoc(programDoc(orgId, programId));
}
