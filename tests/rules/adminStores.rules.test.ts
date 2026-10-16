// Runs against the LOCAL Firestore emulator only:  npm run test:rules
// Exercises the server's Admin-SDK code (billing store, member removal) against a real database.
import { readFileSync } from 'node:fs';
import { initializeApp, deleteApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { initializeTestEnvironment, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, writeBatch } from 'firebase/firestore';
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { createFirestoreBillingStore, removeMemberAndRecount, reconcileMemberCount, MemberError, EVENT_STALE_AFTER_MS } from '../../src/server/firestoreStores';

const PROJECT = 'demo-admin-stores';
let env: RulesTestEnvironment;
let app: App;
let db: Firestore;

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  app = initializeApp({ projectId: PROJECT }, 'admin-stores-test');
  db = getFirestore(app);
});
afterAll(async () => { await deleteApp(app); await env?.cleanup(); });
beforeEach(() => env.clearFirestore());

async function seed(orgId: string, memberIds: string[], storedCount: number, plan = 'starter') {
  await db.doc(`organizations/${orgId}`).set({ name: 'T', creatorId: memberIds[0], createdAt: new Date(), memberCount: storedCount });
  for (const id of memberIds) {
    await db.doc(`organizations/${orgId}/members/${id}`).set({ userId: id, email: `${id}@x.org`, role: id === memberIds[0] ? 'admin' : 'viewer', joinedAt: 'x' });
    await db.doc(`users/${id}`).set({ uid: id, email: `${id}@x.org`, currentOrgId: orgId });
  }
  await db.doc(`organizations/${orgId}/billing/subscription`).set({ plan, status: 'active', seatLimit: 3, updatedAt: 'x' });
}

describe('event ledger (idempotency)', () => {
  it('ten deliveries of the same event at once: exactly one runs', async () => {
    const store = createFirestoreBillingStore(db);
    const claims = await Promise.all(Array.from({ length: 10 }, () => store.claimEvent('evt_race', 'customer.subscription.updated')));
    expect(claims.filter((c) => c === 'new')).toHaveLength(1);
    expect(claims.filter((c) => c !== 'new').every((c) => c === 'in_progress')).toBe(true);
  });
  it('after it finishes a repeat is a duplicate; after a failure the retry is allowed', async () => {
    const store = createFirestoreBillingStore(db);
    expect(await store.claimEvent('evt_a', 't')).toBe('new');
    await store.finishEvent('evt_a', 'applied');
    expect(await store.claimEvent('evt_a', 't')).toBe('duplicate');
    expect(await store.claimEvent('evt_b', 't')).toBe('new');
    await store.failEvent('evt_b', 'boom');
    expect(await store.claimEvent('evt_b', 't')).toBe('new');
  });
  it('an event stuck processing for too long can be taken over; a fresh one cannot', async () => {
    let clock = 1_700_000_000_000;
    const store = createFirestoreBillingStore(db, () => clock);
    expect(await store.claimEvent('evt_stuck', 't')).toBe('new');
    clock += 30_000;
    expect(await store.claimEvent('evt_stuck', 't')).toBe('in_progress');
    clock += EVENT_STALE_AFTER_MS;
    expect(await store.claimEvent('evt_stuck', 't')).toBe('new');
  });
});

describe('subscription adoption (one subscription per organization)', () => {
  it('two different subscriptions racing for the same organization: exactly one is adopted', async () => {
    const store = createFirestoreBillingStore(db);
    await db.doc('organizations/org1/billing/subscription').set({ plan: 'trial', status: 'trialing', seatLimit: 8, updatedAt: 'x' });
    const live = async () => true;
    const results = await Promise.all([
      store.adoptSubscription('org1', 'sub_a', { plan: 'starter', stripeSubscriptionId: 'sub_a', status: 'active' }, live),
      store.adoptSubscription('org1', 'sub_b', { plan: 'pro', stripeSubscriptionId: 'sub_b', status: 'active' }, live),
    ]);
    expect(results.filter((r) => r.applied)).toHaveLength(1);
    const winner = results.findIndex((r) => r.applied) === 0 ? 'sub_a' : 'sub_b';
    const final = (await db.doc('organizations/org1/billing/subscription').get()).data()!;
    expect(final.stripeSubscriptionId).toBe(winner);
    const loser = results.find((r) => !r.applied) as { heldBy: string };
    expect(loser.heldBy).toBe(winner);
  });
  it('the recorded subscription can be replaced once it is no longer live', async () => {
    const store = createFirestoreBillingStore(db);
    await db.doc('organizations/org1/billing/subscription').set({ plan: 'starter', status: 'canceled', stripeSubscriptionId: 'sub_old', seatLimit: 3, updatedAt: 'x' });
    const r = await store.adoptSubscription('org1', 'sub_new', { plan: 'growth', stripeSubscriptionId: 'sub_new', status: 'active', seatLimit: null }, async () => false);
    expect(r.applied).toBe(true);
    expect((await db.doc('organizations/org1/billing/subscription').get()).data()).toMatchObject({ plan: 'growth', stripeSubscriptionId: 'sub_new', seatLimit: null });
  });
  it('the same subscription can always update itself', async () => {
    const store = createFirestoreBillingStore(db);
    await db.doc('organizations/org1/billing/subscription').set({ plan: 'starter', status: 'active', stripeSubscriptionId: 'sub_1', updatedAt: 'x' });
    expect((await store.adoptSubscription('org1', 'sub_1', { status: 'past_due' }, async () => { throw new Error('should not be asked'); })).applied).toBe(true);
  });
  it('records issues and counts real members', async () => {
    const store = createFirestoreBillingStore(db);
    await seed('org1', ['owner', 'm1', 'm2'], 99);
    expect(await store.countMembers('org1')).toBe(3); // the stored counter says 99, the truth is 3
    await store.recordIssue('org1', { kind: 'duplicate_subscription', detail: 'x', subscriptionId: 'sub_z' });
    expect((await db.collection('organizations/org1/billingIssues').get()).size).toBe(1);
  });
});

describe('member removal keeps memberCount true', () => {
  it('removes the member and sets memberCount to the real number', async () => {
    await seed('org1', ['owner', 'm1', 'm2', 'm3'], 4);
    expect(await removeMemberAndRecount(db, { orgId: 'org1', userId: 'm2', requesterUid: 'owner' })).toEqual({ memberCount: 3 });
    expect((await db.doc('organizations/org1').get()).data()!.memberCount).toBe(3);
    expect((await db.doc('organizations/org1/members/m2').get()).exists).toBe(false);
  });
  it('heals a counter that was already wrong', async () => {
    await seed('org1', ['owner', 'm1', 'm2'], 17); // corrupted
    await removeMemberAndRecount(db, { orgId: 'org1', userId: 'm1', requesterUid: 'owner' });
    expect((await db.doc('organizations/org1').get()).data()!.memberCount).toBe(2);
  });
  it('points the removed person away from the organization', async () => {
    await seed('org1', ['owner', 'm1'], 2);
    await removeMemberAndRecount(db, { orgId: 'org1', userId: 'm1', requesterUid: 'owner' });
    expect((await db.doc('users/m1').get()).data()!.currentOrgId).toBeUndefined();
  });
  it('refuses to remove yourself, the owner, or someone who is not a member, and changes nothing', async () => {
    await seed('org1', ['owner', 'm1'], 2);
    await db.doc('organizations/org1/members/m9').set({ userId: 'm9', email: 'm9@x.org', role: 'admin', joinedAt: 'x' });
    await db.doc('organizations/org1').update({ memberCount: 3 });
    await expect(removeMemberAndRecount(db, { orgId: 'org1', userId: 'm9', requesterUid: 'm9' })).rejects.toMatchObject({ code: 'SELF' });
    await expect(removeMemberAndRecount(db, { orgId: 'org1', userId: 'owner', requesterUid: 'm9' })).rejects.toMatchObject({ code: 'OWNER' });
    await expect(removeMemberAndRecount(db, { orgId: 'org1', userId: 'ghost', requesterUid: 'm9' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(removeMemberAndRecount(db, { orgId: 'nope', userId: 'm1', requesterUid: 'm9' })).rejects.toBeInstanceOf(MemberError);
    expect((await db.doc('organizations/org1').get()).data()!.memberCount).toBe(3);
  });
  it('two removals at once leave the counter equal to the real number of members', async () => {
    await seed('org1', ['owner', 'm1', 'm2', 'm3', 'm4'], 5);
    await Promise.all(['m1', 'm2', 'm3'].map((u) => removeMemberAndRecount(db, { orgId: 'org1', userId: u, requesterUid: 'owner' })));
    const real = (await db.collection('organizations/org1/members').get()).size;
    expect(real).toBe(2);
    expect((await db.doc('organizations/org1').get()).data()!.memberCount).toBe(real);
  });
  it('reconcile fixes a wrong counter and leaves a right one alone', async () => {
    await seed('org1', ['owner', 'm1'], 40);
    expect(await reconcileMemberCount(db, 'org1')).toEqual({ before: 40, after: 2 });
    expect(await reconcileMemberCount(db, 'org1')).toEqual({ before: 2, after: 2 });
  });
  it('a seat freed by removal can be taken by an invitee (end to end through the rules)', async () => {
    await seed('org1', ['owner', 'm1', 'm2'], 3, 'starter'); // Starter, full at 3
    await db.doc('invitations/new@x.org').set({ email: 'new@x.org', orgId: 'org1', orgName: 'T', role: 'viewer', invitedBy: 'owner', invitedByEmail: 'o@x.org', status: 'pending', createdAt: 'x' });
    // full: refused
    const c1 = env.authenticatedContext('new', { email: 'new@x.org', email_verified: true }).firestore();
    const full = writeBatch(c1);
    full.set(doc(c1, 'organizations/org1/members/new'), { userId: 'new', email: 'new@x.org', role: 'viewer', joinedAt: 'x' });
    full.update(doc(c1, 'organizations/org1'), { memberCount: 4 });
    await expect(full.commit()).rejects.toBeTruthy();
    // the server removes someone, freeing a seat
    await removeMemberAndRecount(db, { orgId: 'org1', userId: 'm2', requesterUid: 'owner' });
    const ok = writeBatch(c1);
    ok.set(doc(c1, 'organizations/org1/members/new'), { userId: 'new', email: 'new@x.org', role: 'viewer', joinedAt: 'x' });
    ok.update(doc(c1, 'organizations/org1'), { memberCount: 3 });
    await assertSucceeds(ok.commit());
  });
});
