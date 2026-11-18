#!/usr/bin/env node
/**
 * One-off migration: backfills pendingInviteCount for organizations created before
 * the seat-reservation rollout (PR #29). For each organization, counts the invitations
 * with status 'pending' and sets pendingInviteCount to that number. Organizations that
 * already have the field are left alone unless their count is wrong.
 *
 * Run with the rollout described in docs/BILLING.md. The fix mode reads the
 * organization and its pending invitations together before updating the counter.
 *
 *   FIREBASE_SERVICE_ACCOUNT='{...json...}' node scripts/migrate-pending-invite-counts.mjs          # report only
 *   FIREBASE_SERVICE_ACCOUNT='{...json...}' node scripts/migrate-pending-invite-counts.mjs --fix    # backfill
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!process.env.FIREBASE_SERVICE_ACCOUNT) { console.error('Set FIREBASE_SERVICE_ACCOUNT first.'); process.exit(2); }
const fix = process.argv.includes('--fix');
const db = getFirestore(initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) }));

let changed = 0;
const orgs = await db.collection('organizations').get();
for (const org of orgs.docs) {
  const pendingCount = db.collection('invitations')
    .where('orgId', '==', org.id)
    .where('status', '==', 'pending')
    .count();
  const difference = await db.runTransaction(async (tx) => {
    const current = await tx.get(org.ref);
    if (!current.exists) return null;
    const real = (await tx.get(pendingCount)).data().count;
    const stored = current.data().pendingInviteCount;
    if (stored === real) return null;
    if (fix) tx.update(org.ref, { pendingInviteCount: real });
    return { stored, real };
  }, fix ? { readOnly: false } : { readOnly: true });
  if (difference) {
    changed++;
    const { stored, real } = difference;
    console.log(`${org.id}: stored ${stored ?? '(absent)'}, real ${real}${fix ? ' -> fixed' : ''}`);
  }
}
console.log(`${orgs.size} organizations checked, ${changed} needed a backfill${fix || !changed ? '.' : '. Run again with --fix to repair.'}`);
