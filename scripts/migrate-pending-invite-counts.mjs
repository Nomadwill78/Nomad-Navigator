#!/usr/bin/env node
/**
 * One-off migration: backfills pendingInviteCount for organizations created before
 * the seat-reservation rollout (PR #29). For each organization, counts the invitations
 * with status 'pending' and sets pendingInviteCount to that number. Organizations that
 * already have the field are left alone unless their count is wrong.
 *
 * Run this BEFORE deploying the firestore.rules from PR #29, so that invitees with
 * outstanding invitations can accept through the normal flow. Safe to run any time;
 * it only writes when the stored value differs from the true pending count.
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
  const pending = await db.collection('invitations')
    .where('orgId', '==', org.id)
    .where('status', '==', 'pending')
    .count()
    .get();
  const real = pending.data().count;
  const stored = org.data().pendingInviteCount;
  if (stored !== real) {
    changed++;
    console.log(`${org.id} (${org.data().name}): stored ${stored === undefined ? '(absent)' : stored}, real ${real}${fix ? ' -> fixed' : ''}`);
    if (fix) await org.ref.update({ pendingInviteCount: real });
  }
}
console.log(`${orgs.size} organizations checked, ${changed} needed a backfill${fix || !changed ? '.' : '. Run again with --fix to repair.'}`);
