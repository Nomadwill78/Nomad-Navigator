import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { BillingIssue, BillingRecord, BillingStore, ClaimResult } from './billing';

/**
 * The database side of billing and membership, using the Admin SDK (which is how the server is allowed
 * to write things the browser can never write: the billing document, event records, the member counter).
 */

/** An event stuck "processing" for longer than this is assumed to have died, and may be taken over. */
export const EVENT_STALE_AFTER_MS = 2 * 60_000;

const billingRef = (db: Firestore, orgId: string) => db.doc(`organizations/${orgId}/billing/subscription`);

export function createFirestoreBillingStore(db: Firestore, now: () => number = Date.now): BillingStore {
  return {
    async getBilling(orgId) {
      const snap = await billingRef(db, orgId).get();
      return snap.exists ? (snap.data() as BillingRecord) : null;
    },

    async setBilling(orgId, patch) {
      await billingRef(db, orgId).set({ ...patch, updatedAt: new Date(now()).toISOString() }, { merge: true });
    },

    // One transaction decides who holds the organization's subscription, so two checkouts finishing at the
    // same moment cannot both win.
    async adoptSubscription(orgId, subscriptionId, patch, isRecordedLive) {
      return db.runTransaction(async (tx) => {
        const ref = billingRef(db, orgId);
        const snap = await tx.get(ref);
        const held = snap.exists ? (snap.data() as BillingRecord).stripeSubscriptionId : undefined;
        if (held && held !== subscriptionId && (await isRecordedLive(held))) {
          return { applied: false as const, heldBy: held };
        }
        tx.set(ref, { ...patch, updatedAt: new Date(now()).toISOString() }, { merge: true });
        return { applied: true as const };
      });
    },

    async recordIssue(orgId, issue: BillingIssue) {
      await db.collection(`organizations/${orgId}/billingIssues`).add({ ...issue, at: new Date(now()).toISOString() });
    },

    // Event ledger: the document's existence is the lock.
    async claimEvent(eventId, type): Promise<ClaimResult> {
      return db.runTransaction(async (tx) => {
        const ref = db.doc(`stripeEvents/${eventId}`);
        const snap = await tx.get(ref);
        const startedAt = new Date(now()).toISOString();
        if (!snap.exists) {
          tx.set(ref, { type, status: 'processing', startedAt });
          return 'new';
        }
        const data = snap.data() as { status: string; startedAt?: string };
        if (data.status === 'done') return 'duplicate';
        const age = now() - (data.startedAt ? Date.parse(data.startedAt) : 0);
        if (data.status === 'failed' || age > EVENT_STALE_AFTER_MS) {
          tx.set(ref, { type, status: 'processing', startedAt, retriedFrom: data.status }, { merge: true });
          return 'new';
        }
        return 'in_progress';
      });
    },
    async finishEvent(eventId, outcome) {
      await db.doc(`stripeEvents/${eventId}`).set({ status: 'done', outcome, finishedAt: new Date(now()).toISOString() }, { merge: true });
    },
    async failEvent(eventId, error) {
      await db.doc(`stripeEvents/${eventId}`).set({ status: 'failed', error: error.slice(0, 500), failedAt: new Date(now()).toISOString() }, { merge: true });
    },

    async countMembers(orgId) {
      return (await db.collection(`organizations/${orgId}/members`).select().get()).size;
    },

    async countPendingInvitations(orgId) {
      return (await db.collection('invitations').where('orgId', '==', orgId).where('status', '==', 'pending').select().get()).size;
    },
  };
}

// --- Membership -------------------------------------------------------------------------------

export class MemberError extends Error {
  constructor(public code: 'NOT_FOUND' | 'SELF' | 'OWNER', message: string, public httpStatus = 409) {
    super(message);
    this.name = 'MemberError';
  }
}

/**
 * Removes a member and sets memberCount to the TRUE number of members, in one transaction. Recounting (rather than
 * subtracting 1) means a counter that was ever wrong is put right by the next removal.
 */
export async function removeMemberAndRecount(db: Firestore, args: { orgId: string; userId: string; requesterUid: string }): Promise<{ memberCount: number }> {
  const { orgId, userId, requesterUid } = args;
  if (userId === requesterUid) throw new MemberError('SELF', 'You cannot remove yourself. Ask another administrator.');
  return db.runTransaction(async (tx) => {
    const orgRef = db.doc(`organizations/${orgId}`);
    const orgSnap = await tx.get(orgRef);
    if (!orgSnap.exists) throw new MemberError('NOT_FOUND', 'That organization does not exist.', 404);
    if (orgSnap.data()!.creatorId === userId) throw new MemberError('OWNER', 'The organization owner cannot be removed.');
    const membersSnap = await tx.get(db.collection(`organizations/${orgId}/members`));
    const target = membersSnap.docs.find((d) => d.id === userId);
    if (!target) throw new MemberError('NOT_FOUND', 'That person is not a member of this organization.', 404);

    const remaining = membersSnap.size - 1;
    const profileRef = db.doc(`users/${userId}`);
    const profileSnap = await tx.get(profileRef);

    tx.delete(target.ref);
    tx.update(orgRef, { memberCount: remaining });
    // Point the removed person's profile away from the organization so they are not left looking at one they cannot open.
    if (profileSnap.exists && profileSnap.data()!.currentOrgId === orgId) {
      tx.update(profileRef, { currentOrgId: FieldValue.delete() });
    }
    return { memberCount: remaining };
  });
}

/** Sets memberCount to the true number of members. Safe to run any time; returns what it found. */
export async function reconcileMemberCount(db: Firestore, orgId: string): Promise<{ before: number | undefined; after: number }> {
  return db.runTransaction(async (tx) => {
    const orgRef = db.doc(`organizations/${orgId}`);
    const orgSnap = await tx.get(orgRef);
    if (!orgSnap.exists) throw new MemberError('NOT_FOUND', 'That organization does not exist.', 404);
    const members = await tx.get(db.collection(`organizations/${orgId}/members`));
    const before = orgSnap.data()!.memberCount as number | undefined;
    if (before !== members.size) tx.update(orgRef, { memberCount: members.size });
    return { before, after: members.size };
  });
}
