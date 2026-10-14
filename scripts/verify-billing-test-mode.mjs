#!/usr/bin/env node
/**
 * Verifies the DEPLOYED billing against Stripe TEST mode, end to end, using a throwaway organization.
 * Read docs/BILLING_TEST_MODE.md first. It refuses to run against live keys.
 *
 *   node scripts/verify-billing-test-mode.mjs --check     # only checks your settings, touches nothing
 *   node scripts/verify-billing-test-mode.mjs             # runs the whole verification
 *
 * Needs (as environment variables): STRIPE_SECRET_KEY (sk_test_...), STRIPE_PRICE_STARTER / _GROWTH / _PRO,
 * APP_URL (the deployed address whose Stripe webhook is set up in TEST mode), FIREBASE_SERVICE_ACCOUNT (the JSON),
 * FIREBASE_API_KEY (the web API key, used to sign the throwaway admin in).
 */
import Stripe from 'stripe';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
const DB_ID = JSON.parse(readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8')).firestoreDatabaseId;

const need = ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_STARTER', 'STRIPE_PRICE_GROWTH', 'STRIPE_PRICE_PRO', 'APP_URL', 'FIREBASE_SERVICE_ACCOUNT', 'FIREBASE_API_KEY'];
const checkOnly = process.argv.includes('--check');
if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
  console.error('REFUSING TO RUN: STRIPE_SECRET_KEY is not a test key (it must start with sk_test_). This script never touches live billing.');
  process.exit(2);
}
const missing = need.filter((k) => !process.env[k]);
if (missing.length) { console.error(`Missing settings: ${missing.join(', ')}`); process.exit(2); }
const APP = process.env.APP_URL.replace(/\/+$/, '');
if (checkOnly) { console.log('Settings look right: test key, all prices, app address, Firebase credentials. Nothing was changed.'); process.exit(0); }

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const fb = initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) }, 'verify');
const db = getFirestore(fb, DB_ID);
const auth = getAuth(fb);

const RUN = Date.now();
const ORG = `org_stripetest_${RUN}`;
const UID = `stripetest_admin_${RUN}`;
const results = [];
const created = { subs: [], customers: [], clocks: [] };

const pass = (name) => { results.push({ name, ok: true }); console.log(`  PASS  ${name}`); };
const fail = (name, why) => { results.push({ name, ok: false, why }); console.log(`  FAIL  ${name}\n        ${why}`); };
const check = (name, cond, why = '') => (cond ? pass(name) : fail(name, why));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(label, fn, timeoutMs = 120_000) {
  const end = Date.now() + timeoutMs;
  let last;
  while (Date.now() < end) { last = await fn(); if (last) return last; await sleep(2500); }
  return null;
}
const billing = async () => (await db.doc(`organizations/${ORG}/billing/subscription`).get()).data() ?? {};

async function idToken() {
  const custom = await auth.createCustomToken(UID);
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.FIREBASE_API_KEY}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: custom, returnSecureToken: true }),
  });
  const json = await res.json();
  if (!json.idToken) throw new Error(`Could not sign in the throwaway admin: ${JSON.stringify(json).slice(0, 200)}`);
  return json.idToken;
}
async function api(path, body, token) {
  const res = await fetch(`${APP}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, origin: APP }, body: JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function main() {
  console.log(`Verifying ${APP} against Stripe TEST mode with throwaway organization ${ORG}\n`);

  // --- set up: a throwaway organization with one admin, on the trial ------------------------------------
  await auth.createUser({ uid: UID, email: `${UID}@example.test`, emailVerified: true });
  await db.doc(`organizations/${ORG}`).set({ name: 'Stripe test org', creatorId: UID, createdAt: new Date(), memberCount: 1 });
  await db.doc(`organizations/${ORG}/members/${UID}`).set({ userId: UID, email: `${UID}@example.test`, role: 'admin', joinedAt: new Date().toISOString() });
  await db.doc(`organizations/${ORG}/billing/subscription`).set({ plan: 'trial', status: 'trialing', seatLimit: 8, updatedAt: new Date().toISOString() });
  const token = await idToken();

  console.log('1. Webhook security');
  const forged = await fetch(`${APP}/api/stripe-webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=forged' }, body: JSON.stringify({ id: 'evt_forged', type: 'customer.subscription.updated', data: { object: { id: 'sub_forged' } } }) });
  check('a forged webhook is refused with 400', forged.status === 400, `got ${forged.status}`);
  const unsigned = await fetch(`${APP}/api/stripe-webhook`, { method: 'POST', body: '{}' });
  check('a webhook with no signature is refused with 400', unsigned.status === 400, `got ${unsigned.status}`);

  console.log('\n2. Checkout creates the customer and a real Stripe checkout address');
  const co = await api('/api/create-subscription-checkout', { orgId: ORG, plan: 'starter' }, token);
  check('checkout address returned', co.status === 200 && String(co.json.url).includes('checkout.stripe.com'), `status ${co.status} ${JSON.stringify(co.json)}`);
  const customerId = (await billing()).stripeCustomerId;
  check('one Stripe customer is saved on the organization', Boolean(customerId), 'no stripeCustomerId saved');
  if (customerId) created.customers.push(customerId);
  const co2 = await api('/api/create-subscription-checkout', { orgId: ORG, plan: 'starter' }, token);
  check('asking again does not create a second customer', (await billing()).stripeCustomerId === customerId, 'customer changed');

  console.log('\n3. Paying (simulated with the test card pm_card_visa) activates the plan through the webhook');
  const pm = await stripe.paymentMethods.attach((await stripe.paymentMethods.create({ type: 'card', card: { token: 'tok_visa' } })).id, { customer: customerId });
  await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: pm.id } });
  const sub1 = await stripe.subscriptions.create({ customer: customerId, items: [{ price: process.env.STRIPE_PRICE_STARTER }], metadata: { orgId: ORG, plan: 'starter' } });
  created.subs.push(sub1.id);
  const active = await waitFor('starter active', async () => { const b = await billing(); return b.plan === 'starter' && b.status === 'active' ? b : null; });
  check('organization becomes Starter / active (webhook delivered and applied)', Boolean(active), `billing is ${JSON.stringify(await billing())}. Is the TEST-mode webhook endpoint set to ${APP}/api/stripe-webhook?`);
  check('the stored subscription id matches', active?.stripeSubscriptionId === sub1.id, `stored ${active?.stripeSubscriptionId}`);

  console.log('\n4. Only one subscription per organization');
  const again = await api('/api/create-subscription-checkout', { orgId: ORG, plan: 'pro' }, token);
  check('a second checkout is refused (409 ALREADY_SUBSCRIBED)', again.status === 409 && again.json.code === 'ALREADY_SUBSCRIBED', `status ${again.status} ${JSON.stringify(again.json)}`);
  const dup = await stripe.subscriptions.create({ customer: customerId, items: [{ price: process.env.STRIPE_PRICE_PRO }], metadata: { orgId: ORG, plan: 'pro' } });
  created.subs.push(dup.id);
  const cancelledDup = await waitFor('duplicate cancelled', async () => ((await stripe.subscriptions.retrieve(dup.id)).status === 'canceled' ? true : null));
  check('a stray second subscription is cancelled automatically', Boolean(cancelledDup), 'it is still live in Stripe');
  check('the organization still points at the first subscription', (await billing()).stripeSubscriptionId === sub1.id, `points at ${(await billing()).stripeSubscriptionId}`);
  const issues = await db.collection(`organizations/${ORG}/billingIssues`).get();
  check('the duplicate was recorded as an issue', issues.docs.some((d) => d.data().kind === 'duplicate_subscription'), 'no issue recorded');

  console.log('\n5. Upgrade and downgrade update the same subscription');
  const up = await api('/api/change-plan', { orgId: ORG, plan: 'growth' }, token);
  check('upgrade to Growth succeeds', up.status === 200, `status ${up.status} ${JSON.stringify(up.json)}`);
  const afterUp = await waitFor('growth', async () => { const b = await billing(); return b.plan === 'growth' ? b : null; });
  check('organization is Growth with unlimited seats (seatLimit null)', afterUp && afterUp.seatLimit === null, JSON.stringify(afterUp));
  const live = (await stripe.subscriptions.list({ customer: customerId, status: 'active' })).data;
  check('still exactly one active subscription in Stripe', live.length === 1 && live[0].id === sub1.id, `${live.length} active`);
  for (let i = 1; i <= 4; i++) await db.doc(`organizations/${ORG}/members/extra${i}`).set({ userId: `extra${i}`, email: `e${i}@example.test`, role: 'viewer', joinedAt: 'x' });
  const tooMany = await api('/api/change-plan', { orgId: ORG, plan: 'starter' }, token);
  check('downgrade to Starter with 5 members is refused (409)', tooMany.status === 409 && tooMany.json.code === 'TOO_MANY_MEMBERS', `status ${tooMany.status} ${JSON.stringify(tooMany.json)}`);
  for (let i = 1; i <= 2; i++) await api('/api/remove-member', { orgId: ORG, userId: `extra${i}` }, token);
  const fits = await api('/api/change-plan', { orgId: ORG, plan: 'starter' }, token); // 3 members left
  check('after removing 2 members (3 left) the downgrade to Starter works', fits.status === 200, `status ${fits.status} ${JSON.stringify(fits.json)}`);
  const org = (await db.doc(`organizations/${ORG}`).get()).data();
  check('memberCount matches the real member list after removals', org.memberCount === (await db.collection(`organizations/${ORG}/members`).get()).size, `memberCount ${org.memberCount}`);

  console.log('\n6. Cancellation');
  await stripe.subscriptions.update(sub1.id, { cancel_at_period_end: true });
  const flagged = await waitFor('flag', async () => ((await billing()).cancelAtPeriodEnd === true ? true : null));
  check('cancel-at-period-end is shown, and the plan stays active until then', Boolean(flagged) && (await billing()).status === 'active', JSON.stringify(await billing()));
  await stripe.subscriptions.cancel(sub1.id);
  const ended = await waitFor('ended', async () => ((await billing()).status === 'canceled' ? true : null));
  check('when the subscription ends the status becomes canceled', Boolean(ended), JSON.stringify(await billing()));

  console.log('\n7. After cancellation a new subscription can be started');
  const restart = await api('/api/create-subscription-checkout', { orgId: ORG, plan: 'growth' }, token);
  check('checkout is allowed again (200)', restart.status === 200, `status ${restart.status} ${JSON.stringify(restart.json)}`);

  console.log('\n8. Failed payment (Stripe test clock, card that always declines)');
  const clock = await stripe.testHelpers.testClocks.create({ frozen_time: Math.floor(Date.now() / 1000), name: `billing verify ${RUN}` });
  created.clocks.push(clock.id);
  const failCustomer = await stripe.customers.create({ test_clock: clock.id, metadata: { orgId: ORG } });
  created.customers.push(failCustomer.id);
  const good = await stripe.paymentMethods.attach((await stripe.paymentMethods.create({ type: 'card', card: { token: 'tok_visa' } })).id, { customer: failCustomer.id });
  await stripe.customers.update(failCustomer.id, { invoice_settings: { default_payment_method: good.id } });
  await db.doc(`organizations/${ORG}/billing/subscription`).set({ plan: 'trial', status: 'trialing', seatLimit: 8, stripeCustomerId: failCustomer.id, stripeSubscriptionId: null, updatedAt: new Date().toISOString() });
  const failSub = await stripe.subscriptions.create({ customer: failCustomer.id, items: [{ price: process.env.STRIPE_PRICE_GROWTH }], metadata: { orgId: ORG, plan: 'growth' } });
  created.subs.push(failSub.id);
  await waitFor('growth active', async () => ((await billing()).status === 'active' ? true : null));
  const bad = await stripe.paymentMethods.attach((await stripe.paymentMethods.create({ type: 'card', card: { token: 'tok_chargeCustomerFail' } })).id, { customer: failCustomer.id });
  await stripe.customers.update(failCustomer.id, { invoice_settings: { default_payment_method: bad.id } });
  await stripe.subscriptions.update(failSub.id, { default_payment_method: bad.id });
  await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: Math.floor(Date.now() / 1000) + 35 * 86400 });
  const pastDue = await waitFor('past_due', async () => ((await billing()).status === 'past_due' ? true : null), 180_000);
  check('a failed renewal payment makes the organization past_due, keeping its plan', Boolean(pastDue) && (await billing()).plan === 'growth', JSON.stringify(await billing()));
  const blocked = await api('/api/change-plan', { orgId: ORG, plan: 'pro' }, token);
  check('while payment is failing, changing plans is refused (409 PAYMENT_NEEDED)', blocked.status === 409 && blocked.json.code === 'PAYMENT_NEEDED', `status ${blocked.status} ${JSON.stringify(blocked.json)}`);

  console.log('\n9. Every Stripe event was recorded once');
  const events = await db.collection('stripeEvents').get();
  const stuck = events.docs.filter((d) => d.data().status === 'processing' || d.data().status === 'failed');
  check('no event is stuck or failed', stuck.length === 0, `${stuck.length} stuck: ${stuck.map((d) => d.id).join(', ')}`);
}

async function cleanup() {
  console.log('\nCleaning up the throwaway data...');
  for (const id of created.subs) await stripe.subscriptions.cancel(id).catch(() => {});
  for (const id of created.customers) await stripe.customers.del(id).catch(() => {});
  for (const id of created.clocks) await stripe.testHelpers.testClocks.del(id).catch(() => {});
  const members = await db.collection(`organizations/${ORG}/members`).get();
  for (const d of members.docs) await d.ref.delete();
  const issues = await db.collection(`organizations/${ORG}/billingIssues`).get();
  for (const d of issues.docs) await d.ref.delete();
  await db.doc(`organizations/${ORG}/billing/subscription`).delete().catch(() => {});
  await db.doc(`organizations/${ORG}`).delete().catch(() => {});
  await auth.deleteUser(UID).catch(() => {});
}

try { await main(); } catch (e) { fail('the verification ran without crashing', e.message); }
finally { await cleanup().catch((e) => console.error('Cleanup problem:', e.message)); }

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} of ${results.length} checks passed.`);
if (failed.length) { console.log('NOT SAFE to enable live billing. Fix the failures above and run again.'); process.exit(1); }
console.log('Everything passed in test mode. You can now follow step 5 of docs/BILLING_TEST_MODE.md to enable live billing.');
