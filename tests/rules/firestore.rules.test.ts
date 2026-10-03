// Runs against the LOCAL Firestore emulator only:  npm run test:rules
// (needs Java 11+; the emulator downloads on first run). Never touches production data.
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { beforeAll, afterAll, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const ORG = 'org1';
const roles = ['admin', 'grant_coordinator', 'impact_analyst', 'compliance_officer', 'data_entry', 'viewer'] as const;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-nomad',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `organizations/${ORG}`), { name: 'Test', creatorId: 'admin', createdAt: Timestamp.now(), memberCount: roles.length });
    for (const r of roles)
      await setDoc(doc(db, `organizations/${ORG}/members/${r}`), { userId: r, email: `${r}@x.org`, role: r, joinedAt: Timestamp.now() });
  });
});
afterAll(() => env?.cleanup());

const dbAs = (uid: string) => env.authenticatedContext(uid, { email: `${uid}@x.org`, email_verified: true }).firestore();
const metrics = (db: any) => setDoc(doc(db, `organizations/${ORG}/metrics/dashboard`), { totalPeopleServed: 2400 });
const grant = (db: any) =>
  setDoc(doc(db, `organizations/${ORG}/grants/g1`), {
    id: 'g1', name: 'G', funder: 'F', amount: 1000, startDate: '2026-01-01', endDate: '2026-12-31', status: 'active', kpis: [],
  });

describe('metrics/dashboard writes match ROLE_PERMISSIONS.canEditMetrics', () => {
  for (const r of roles) {
    const allowed = ['admin', 'impact_analyst', 'data_entry'].includes(r);
    it(`${r} ${allowed ? 'can' : 'cannot'} write metrics`, () => (allowed ? assertSucceeds(metrics(dbAs(r))) : assertFails(metrics(dbAs(r)))));
  }
  it('a signed-in non-member cannot write metrics', () => assertFails(metrics(dbAs('stranger'))));
  it('an anonymous visitor cannot read metrics', () =>
    assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), `organizations/${ORG}/metrics/dashboard`))));
});

describe('grants writes match canEditGrants', () => {
  for (const r of roles) {
    const allowed = ['admin', 'grant_coordinator'].includes(r);
    it(`${r} ${allowed ? 'can' : 'cannot'} write a grant`, () => (allowed ? assertSucceeds(grant(dbAs(r))) : assertFails(grant(dbAs(r)))));
  }
});
