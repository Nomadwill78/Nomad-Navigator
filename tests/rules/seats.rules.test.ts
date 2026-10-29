// Runs against the LOCAL Firestore emulator only:  npm run test:rules
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, writeBatch, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { PLAN_SEAT_LIMITS, PlanId, Invitation } from '../../types';
import { acceptInvitationTxn, createOrganizationTxn, SeatError } from '../../src/lib/membership';

let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-seats',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env?.cleanup());
beforeEach(() => env.clearFirestore());

const as = (uid: string, email = `${uid}@x.org`) => env.authenticatedContext(uid, { email, email_verified: true }).firestore();
const OWNER = 'owner';
let orgCounter = 0;

/** An organization with `members` joined people (the first is the owner/admin) on the given plan and status. */
async function seedOrg(opts: { plan?: string; status?: string; members: number; billing?: boolean }) {
  const orgId = `org${++orgCounter}`;
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `organizations/${orgId}`), { name: 'Test', creatorId: OWNER, createdAt: Timestamp.now(), memberCount: opts.members });
    for (let i = 0; i < Math.min(opts.members, 30); i++) {
      const uid = i === 0 ? OWNER : `m${i}`;
      await setDoc(doc(db, `organizations/${orgId}/members/${uid}`), { userId: uid, email: `${uid}@x.org`, role: i === 0 ? 'admin' : 'viewer', joinedAt: 'x' });
    }
    if (opts.billing !== false) {
      await setDoc(doc(db, `organizations/${orgId}/billing/subscription`), {
        plan: opts.plan ?? 'trial', status: opts.status ?? 'active', seatLimit: 0, updatedAt: 'x', // stored seatLimit is deliberately WRONG: rules must ignore it
      });
    }
  });
  return orgId;
}

async function seedInvite(orgId: string, email: string, role = 'viewer') {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `invitations/${email}`), {
      email, orgId, orgName: 'Test', role, invitedBy: OWNER, invitedByEmail: 'owner@x.org', status: 'pending', createdAt: 'x',
    });
    await setDoc(doc(db, `users/${email.split('@')[0]}`), { uid: email.split('@')[0], email, displayName: email });
  });
}

/** The three writes a join makes, in one commit, as the real app does. */
const join = (orgId: string, uid: string, countBefore: number, email = `${uid}@x.org`, role = 'viewer') => {
  const db = as(uid, email);
  const batch = writeBatch(db);
  batch.set(doc(db, `organizations/${orgId}/members/${uid}`), { userId: uid, email, role, joinedAt: 'x' });
  batch.update(doc(db, `organizations/${orgId}`), { memberCount: countBefore + 1 });
  batch.delete(doc(db, `invitations/${email}`));
  return batch.commit();
};

const sendInvite = (orgId: string, email: string) =>
  setDoc(doc(as(OWNER), `invitations/${email}`), {
    email, orgId, orgName: 'Test', role: 'viewer', invitedBy: OWNER, invitedByEmail: 'owner@x.org', status: 'pending', createdAt: 'x',
  });

const readCount = async (orgId: string) => {
  let n = -1;
  await env.withSecurityRulesDisabled(async (ctx) => { n = (await getDoc(doc(ctx.firestore(), `organizations/${orgId}`))).data()!.memberCount; });
  return n;
};

describe('seat limits are exact for every plan (driven by PLAN_SEAT_LIMITS)', () => {
  for (const plan of Object.keys(PLAN_SEAT_LIMITS) as PlanId[]) {
    const limit = PLAN_SEAT_LIMITS[plan];
    if (limit !== null) {
      it(`${plan}: the ${limit}th member can join, the ${limit + 1}th cannot`, async () => {
        const full = await seedOrg({ plan, members: limit });
        await seedInvite(full, 'late@x.org');
        await assertFails(join(full, 'late', limit, 'late@x.org')); // already at the limit

        const oneLeft = await seedOrg({ plan, members: limit - 1 });
        await seedInvite(oneLeft, 'last@x.org');
        await assertSucceeds(join(oneLeft, 'last', limit - 1, 'last@x.org')); // fills the last seat exactly
        expect(await readCount(oneLeft)).toBe(limit);
      });
      it(`${plan}: an admin can send an invitation while a seat is free, and not once the plan is full`, async () => {
        const oneLeft = await seedOrg({ plan, members: limit - 1 });
        await assertSucceeds(sendInvite(oneLeft, 'new@x.org'));
        const full = await seedOrg({ plan, members: limit });
        await assertFails(sendInvite(full, 'new@x.org'));
      });
    } else {
      it(`${plan}: unlimited. A 25th, 100th and 500th member can all join`, async () => {
        for (const already of [24, 99, 499]) {
          const org = await seedOrg({ plan, members: already });
          await seedInvite(org, 'more@x.org');
          await assertSucceeds(join(org, 'more', already, 'more@x.org'));
          expect(await readCount(org)).toBe(already + 1);
        }
      });
      it(`${plan}: an admin can keep sending invitations at any size`, async () => {
        await assertSucceeds(sendInvite(await seedOrg({ plan, members: 300 }), 'new@x.org'));
      });
    }
  }

  it('the limit comes from the plan name, not the stored seatLimit number (which these tests set wrongly to 0)', async () => {
    const org = await seedOrg({ plan: 'growth', members: 5 });
    await seedInvite(org, 'a@x.org');
    await assertSucceeds(join(org, 'a', 5, 'a@x.org'));
  });
  it('an organization with no billing document yet is on the 5 seat trial', async () => {
    const four = await seedOrg({ members: 4, billing: false });
    await seedInvite(seven, 'a@x.org');
    await assertSucceeds(join(four, 'a', 4, 'a@x.org'));
    const five = await seedOrg({ members: 5, billing: false });
    await seedInvite(eight, 'b@x.org');
    await assertFails(join(five, 'b', 5, 'b@x.org'));
  });
  it('an unknown plan name never gets unlimited seats', async () => {
    const org = await seedOrg({ plan: 'enterprise-typo', members: 2 });
    await seedInvite(org, 'a@x.org');
    await assertFails(join(org, 'a', 2, 'a@x.org'));
    await assertFails(sendInvite(org, 'b@x.org'));
  });
});

describe('an invitee can read the plan before joining, and nobody else outside can', () => {
  it('a pending invitee can read billing; a stranger cannot', async () => {
    const org = await seedOrg({ plan: 'starter', members: 2 });
    await seedInvite(org, 'a@x.org');
    await assertSucceeds(getDoc(doc(as('a', 'a@x.org'), `organizations/${org}/billing/subscription`)));
    await assertFails(getDoc(doc(as('stranger'), `organizations/${org}/billing/subscription`)));
  });
});

describe('failed payments and cancellations (policy: keep access, add no new members)', () => {
  for (const status of ['past_due', 'canceled']) {
    it(`${status}: cannot join or be invited even with seats free`, async () => {
      const org = await seedOrg({ plan: 'growth', status, members: 2 });
      await seedInvite(org, 'a@x.org');
      await assertFails(join(org, 'a', 2, 'a@x.org'));
      await assertFails(sendInvite(org, 'b@x.org'));
    });
    it(`${status}: existing members keep their access and data`, async () => {
      const org = await seedOrg({ plan: 'growth', status, members: 3 });
      await assertSucceeds(getDoc(doc(as('m1'), `organizations/${org}`)));
      await assertSucceeds(getDocs(collection(as('m1'), `organizations/${org}/members`)));
      await assertSucceeds(setDoc(doc(as(OWNER), `organizations/${org}/grants/g1`), {
        id: 'g1', name: 'G', funder: 'F', amount: 100, startDate: '2026-01-01', endDate: '2026-12-31', status: 'active', kpis: [],
      }));
    });
  }
  for (const status of ['trialing', 'active']) {
    it(`${status}: can join and be invited`, async () => {
      const org = await seedOrg({ plan: 'growth', status, members: 2 });
      await seedInvite(org, 'a@x.org');
      await assertSucceeds(join(org, 'a', 2, 'a@x.org'));
      await assertSucceeds(sendInvite(org, 'b@x.org'));
    });
  }
  it('clients cannot touch the billing document to escape any of this', async () => {
    const org = await seedOrg({ plan: 'starter', status: 'past_due', members: 3 });
    await assertFails(setDoc(doc(as(OWNER), `organizations/${org}/billing/subscription`), { plan: 'pro', status: 'active', seatLimit: null, updatedAt: 'x' }));
    await assertFails(updateDoc(doc(as(OWNER), `organizations/${org}/billing/subscription`), { plan: 'pro', status: 'active' }));
    await assertFails(deleteDoc(doc(as(OWNER), `organizations/${org}/billing/subscription`)));
  });
});

describe('memberCount cannot be corrupted', () => {
  it('an invitee cannot raise memberCount without joining (the seat-inflation attack)', async () => {
    const org = await seedOrg({ plan: 'starter', members: 1 });
    await seedInvite(org, 'a@x.org');
    await assertFails(updateDoc(doc(as('a', 'a@x.org'), `organizations/${org}`), { memberCount: 2 }));
  });
  it('an invitee cannot add more than 1, or lower it', async () => {
    const org = await seedOrg({ plan: 'growth', members: 5 });
    await seedInvite(org, 'a@x.org');
    const db = as('a', 'a@x.org');
    for (const bad of [7, 4, 0, 5]) {
      const batch = writeBatch(db);
      batch.set(doc(db, `organizations/${org}/members/a`), { userId: 'a', email: 'a@x.org', role: 'viewer', joinedAt: 'x' });
      batch.update(doc(db, `organizations/${org}`), { memberCount: bad });
      await assertFails(batch.commit());
    }
  });
  it('joining without raising memberCount is refused', async () => {
    const org = await seedOrg({ plan: 'growth', members: 2 });
    await seedInvite(org, 'a@x.org');
    const db = as('a', 'a@x.org');
    await assertFails(setDoc(doc(db, `organizations/${org}/members/a`), { userId: 'a', email: 'a@x.org', role: 'viewer', joinedAt: 'x' }));
  });
  it('an invitee cannot join with a different role than the one invited', async () => {
    const org = await seedOrg({ plan: 'growth', members: 2 });
    await seedInvite(org, 'a@x.org', 'viewer');
    await assertFails(join(org, 'a', 2, 'a@x.org', 'admin'));
  });
  it('someone without an invitation cannot join', async () => {
    const org = await seedOrg({ plan: 'growth', members: 2 });
    await assertFails(join(org, 'stranger', 2));
  });
  it('an admin cannot set memberCount directly, up or down', async () => {
    const org = await seedOrg({ plan: 'growth', members: 4 });
    const ref = doc(as(OWNER), `organizations/${org}`);
    await assertFails(updateDoc(ref, { memberCount: 1 }));
    await assertFails(updateDoc(ref, { memberCount: 99 }));
    await assertSucceeds(updateDoc(ref, { name: 'Renamed' })); // other edits still work
    expect(await readCount(org)).toBe(4);
  });
  it('a client cannot remove a member, not even an admin; removal is server-only', async () => {
    const org = await seedOrg({ plan: 'growth', members: 3 });
    const db = as(OWNER);
    await assertFails(deleteDoc(doc(db, `organizations/${org}/members/m1`)));
    const batch = writeBatch(db);
    batch.delete(doc(db, `organizations/${org}/members/m1`));
    batch.update(doc(db, `organizations/${org}`), { memberCount: 2 });
    await assertFails(batch.commit());
  });
  it('an admin cannot add a member directly, bypassing invitations', async () => {
    const org = await seedOrg({ plan: 'growth', members: 2 });
    const db = as(OWNER);
    const batch = writeBatch(db);
    batch.set(doc(db, `organizations/${org}/members/ghost`), { userId: 'ghost', email: 'g@x.org', role: 'viewer', joinedAt: 'x' });
    batch.update(doc(db, `organizations/${org}`), { memberCount: 3 });
    await assertFails(batch.commit());
  });
  it('an admin cannot change the owner role, or their own', async () => {
    const org = await seedOrg({ plan: 'growth', members: 3 });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `organizations/${org}/members/m2`), { userId: 'm2', email: 'm2@x.org', role: 'admin', joinedAt: 'x' });
    });
    await assertFails(setDoc(doc(as('m2'), `organizations/${org}/members/${OWNER}`), { userId: OWNER, email: 'owner@x.org', role: 'viewer', joinedAt: 'x' }));
    await assertFails(setDoc(doc(as('m2'), `organizations/${org}/members/m2`), { userId: 'm2', email: 'm2@x.org', role: 'viewer', joinedAt: 'x' }));
    await assertSucceeds(setDoc(doc(as('m2'), `organizations/${org}/members/m1`), { userId: 'm1', email: 'm1@x.org', role: 'data_entry', joinedAt: 'x' }));
  });
  it('a new organization must start with exactly one member, its creator', async () => {
    const uid = 'founder';
    const make = (count: number, withMember: boolean) => {
      const db = as(uid);
      const batch = writeBatch(db);
      batch.set(doc(db, 'organizations/orgNew'), { name: 'N', creatorId: uid, createdAt: Timestamp.now(), memberCount: count });
      if (withMember) batch.set(doc(db, `organizations/orgNew/members/${uid}`), { userId: uid, email: `${uid}@x.org`, role: 'admin', joinedAt: 'x' });
      return batch.commit();
    };
    await assertFails(make(0, true));
    await assertFails(make(5, true));
    await assertFails(make(1, false));
    await assertSucceeds(make(1, true));
  });
});

describe('concurrent invitations cannot exceed capacity', () => {
  it('two people racing for the last Starter seat: exactly one wins, memberCount ends at 3', async () => {
    const org = await seedOrg({ plan: 'starter', members: 2 });
    await seedInvite(org, 'a@x.org');
    await seedInvite(org, 'b@x.org');
    // Both read memberCount = 2 and both try to write 3 at the same moment (raw writes, no client-side retry logic).
    const results = await Promise.allSettled([join(org, 'a', 2, 'a@x.org'), join(org, 'b', 2, 'b@x.org')]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await readCount(org)).toBe(3);
  });

  it('the real app code (acceptInvitationTxn): 5 people racing for 2 free Starter seats, exactly 2 get in', async () => {
    const org = await seedOrg({ plan: 'starter', members: 1 });
    const people = ['a', 'b', 'c', 'd', 'e'];
    for (const p of people) await seedInvite(org, `${p}@x.org`);
    const results = await Promise.allSettled(
      people.map((p) => {
        const invitation = { id: `${p}@x.org`, email: `${p}@x.org`, orgId: org, orgName: 'Test', role: 'viewer', invitedBy: OWNER, invitedByEmail: 'owner@x.org', status: 'pending', createdAt: 'x' } as Invitation;
        return acceptInvitationTxn(as(p, `${p}@x.org`) as any, { uid: p, email: `${p}@x.org`, invitation });
      })
    );
    const won = results.filter((r) => r.status === 'fulfilled').length;
    expect(won).toBe(2);
    expect(await readCount(org)).toBe(3);
    // and every loser was told why, in plain words, not with a database error
    const losers = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(losers.length).toBe(3);
    for (const l of losers) expect(l.reason).toBeInstanceOf(SeatError);
  });

  it('memberCount always equals the real number of members after the race', async () => {
    const org = await seedOrg({ plan: 'trial', members: 6 });
    const people = ['a', 'b', 'c', 'd'];
    for (const p of people) await seedInvite(org, `${p}@x.org`);
    await Promise.allSettled(people.map((p) => join(org, p, 4, `${p}@x.org`)));
    let real = 0;
    await env.withSecurityRulesDisabled(async (ctx) => { real = (await getDocs(collection(ctx.firestore(), `organizations/${org}/members`))).size; });
    expect(await readCount(org)).toBe(real);
    expect(real).toBeLessThanOrEqual(5);
  });
});

describe('creating an organization with the real app code', () => {
  it('createOrganizationTxn makes a trial org with one admin and memberCount 1', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'users/founder'), { uid: 'founder', email: 'founder@x.org', displayName: 'F' }); });
    await createOrganizationTxn(as('founder') as any, { orgId: 'org_new', name: 'New Org', uid: 'founder', email: 'founder@x.org' });
    expect(await readCount('org_new')).toBe(1);
    let billing: any;
    await env.withSecurityRulesDisabled(async (ctx) => { billing = (await getDoc(doc(ctx.firestore(), 'organizations/org_new/billing/subscription'))).data(); });
    expect(billing).toMatchObject({ plan: 'trial', status: 'trialing' });
  });
});

describe('the rules table matches PLAN_SEAT_LIMITS in types.ts', () => {
  it('lists the same limit for every plan', () => {
    const rules = readFileSync('firestore.rules', 'utf8');
    const fn = /function seatLimitOf\(plan\) \{([\s\S]*?)\n    \}/.exec(rules)![1];
    expect(fn).toContain("plan == 'trial' ? 5");
    expect(fn).toContain("plan == 'starter' ? 3");
    expect(fn).toContain("plan == 'growth' ? 10");
    expect(fn).toContain("plan == 'pro' ? 25");
    expect(PLAN_SEAT_LIMITS).toEqual({ trial: 5, starter: 3, growth: 10, pro: 25 });
  });
});
