/**
 * Collision-resistant id generator for entities that live *inside* a Firestore
 * document (grant KPIs, subgrantees, subgrantee KPIs) rather than as their own
 * document — so there's no `doc(collection)` auto-id to reach for. `Date.now()`
 * is not enough on its own: two adds firing in the same millisecond (a
 * double-click, or two rapid "Add Metric" clicks) previously produced the same
 * id within one grant's arrays.
 *
 * Top-level grant ids are still Firestore-generated (see createGrant in
 * src/lib/orgData.ts) — this is only for the nested, non-document entities.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
