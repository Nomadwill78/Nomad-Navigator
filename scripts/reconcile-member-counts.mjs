#!/usr/bin/env node
/**
 * One-off repair: sets every organization's memberCount to its TRUE number of members.
 * Older versions of the app could leave this counter wrong (for example after a removal), which could
 * wrongly block or allow invitations. Safe to run any time; it only changes counters that are wrong.
 *
 *   FIREBASE_SERVICE_ACCOUNT='{...json...}' node scripts/reconcile-member-counts.mjs          # report only
 *   FIREBASE_SERVICE_ACCOUNT='{...json...}' node scripts/reconcile-member-counts.mjs --fix    # repair
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
const DB_ID = JSON.parse(readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8')).firestoreDatabaseId;

if (!process.env.FIREBASE_SERVICE_ACCOUNT) { console.error('Set FIREBASE_SERVICE_ACCOUNT first.'); process.exit(2); }
const fix = process.argv.includes('--fix');
const db = getFirestore(initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) }), DB_ID);

let wrong = 0;
const orgs = await db.collection('organizations').get();
for (const org of orgs.docs) {
  const real = (await db.collection(`organizations/${org.id}/members`).select().get()).size;
  const stored = org.data().memberCount;
  if (stored !== real) {
    wrong++;
    console.log(`${org.id} (${org.data().name}): stored ${stored}, real ${real}${fix ? ' -> fixed' : ''}`);
    if (fix) await org.ref.update({ memberCount: real });
  }
}
console.log(`${orgs.size} organizations checked, ${wrong} ${wrong === 1 ? 'had' : 'had'} a wrong counter${fix || !wrong ? '.' : '. Run again with --fix to repair.'}`);
