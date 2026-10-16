// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import type { AddressInfo } from 'node:net';
import Stripe from 'stripe';
import { createApiApp, type ApiDeps } from '../src/server/apiApp';
import { handleStripeWebhookEvent, type WebhookDeps } from '../src/server/stripeAdmin';
import { MemberError } from '../src/server/firestoreStores';
import type { StripeEvent } from '../src/server/billing';
import { FakeStripe, FakeStore, ENV, sub } from './helpers/fakeBilling';

let stripe: FakeStripe;
let store: FakeStore;
const SECRET = 'whsec_test_secret';

// --- webhook signature --------------------------------------------------------------------------------

const realStripe = new Stripe('sk_test_offline'); // only used to sign and verify; it never calls the network here
const payloadFor = (id: string, type: string, object: any) => JSON.stringify({ id, object: 'event', type, data: { object } });
const sign = (payload: string, secret = SECRET) => realStripe.webhooks.generateTestHeaderString({ payload, secret });

const webhookDeps = (): WebhookDeps => ({
  env: { ...ENV, STRIPE_WEBHOOK_SECRET: SECRET },
  verify: (raw, signature, secret) => realStripe.webhooks.constructEvent(raw, signature, secret) as unknown as StripeEvent,
  stripe: () => stripe,
  store: () => store,
});

beforeEach(() => { stripe = new FakeStripe(); store = new FakeStore(); });

describe('webhooks are signature-verified', () => {
  it('a correctly signed event is accepted and applied', async () => {
    stripe.subs.set('sub_1', sub({ id: 'sub_1', items: { data: [{ id: 'si', price: { id: 'price_growth' } }] } }));
    const payload = payloadFor('evt_1', 'customer.subscription.created', { id: 'sub_1' });
    const out = await handleStripeWebhookEvent(Buffer.from(payload), sign(payload), webhookDeps());
    expect(out.status).toBe(200);
    expect(store.billing.get('org1')).toMatchObject({ plan: 'growth', status: 'active' });
  });
  it('no signature header: 400, and nothing is processed', async () => {
    const payload = payloadFor('evt_1', 'customer.subscription.created', { id: 'sub_1' });
    const out = await handleStripeWebhookEvent(Buffer.from(payload), undefined, webhookDeps());
    expect(out.status).toBe(400);
    expect(store.events.size).toBe(0);
    expect(stripe.calls).toHaveLength(0);
  });
  it('a signature made with the wrong secret: 400, and nothing is processed', async () => {
    const payload = payloadFor('evt_1', 'customer.subscription.created', { id: 'sub_1' });
    const out = await handleStripeWebhookEvent(Buffer.from(payload), sign(payload, 'whsec_attacker'), webhookDeps());
    expect(out.status).toBe(400);
    expect(store.events.size).toBe(0);
  });
  it('a body changed after signing: 400 (so a forged "plan: pro" cannot get through)', async () => {
    const payload = payloadFor('evt_1', 'customer.subscription.created', { id: 'sub_1' });
    const header = sign(payload);
    const tampered = payload.replace('sub_1', 'sub_9');
    const out = await handleStripeWebhookEvent(Buffer.from(tampered), header, webhookDeps());
    expect(out.status).toBe(400);
  });
  it('an old, replayed signature (outside Stripe\'s time window) is refused', async () => {
    const payload = payloadFor('evt_1', 'customer.subscription.created', { id: 'sub_1' });
    const old = realStripe.webhooks.generateTestHeaderString({ payload, secret: SECRET, timestamp: Math.floor(Date.now() / 1000) - 3600 });
    const out = await handleStripeWebhookEvent(Buffer.from(payload), old, webhookDeps());
    expect(out.status).toBe(400);
  });
  it('no webhook secret configured: 500, not a silent accept', async () => {
    const deps = webhookDeps();
    delete deps.env.STRIPE_WEBHOOK_SECRET;
    const payload = payloadFor('evt_1', 'x', {});
    expect((await handleStripeWebhookEvent(Buffer.from(payload), sign(payload), deps)).status).toBe(500);
  });
  it('live key without ALLOW_LIVE_BILLING: 503 before anything is read', async () => {
    const deps = webhookDeps();
    deps.env = { ...deps.env, STRIPE_SECRET_KEY: 'sk_live_abc' };
    const payload = payloadFor('evt_1', 'x', {});
    expect((await handleStripeWebhookEvent(Buffer.from(payload), sign(payload), deps)).status).toBe(503);
  });
  it('a repeated delivery is acknowledged (200, duplicate) and does nothing', async () => {
    stripe.subs.set('sub_1', sub({ id: 'sub_1' }));
    const payload = payloadFor('evt_dup', 'customer.subscription.created', { id: 'sub_1' });
    await handleStripeWebhookEvent(Buffer.from(payload), sign(payload), webhookDeps());
    const writes = store.writes;
    const again = await handleStripeWebhookEvent(Buffer.from(payload), sign(payload), webhookDeps());
    expect(again).toMatchObject({ status: 200, body: { duplicate: true } });
    expect(store.writes).toBe(writes);
  });
  it('a processing failure returns 500 so Stripe retries, and the retry works', async () => {
    const payload = payloadFor('evt_retry', 'customer.subscription.updated', { id: 'sub_later' });
    expect((await handleStripeWebhookEvent(Buffer.from(payload), sign(payload), webhookDeps())).status).toBe(500);
    stripe.subs.set('sub_later', sub({ id: 'sub_later' }));
    expect((await handleStripeWebhookEvent(Buffer.from(payload), sign(payload), webhookDeps())).status).toBe(200);
  });
  it('an event still in progress returns 409 so Stripe retries instead of double-processing', async () => {
    store.events.set('evt_busy', { status: 'processing' });
    const payload = payloadFor('evt_busy', 'customer.subscription.updated', { id: 'sub_1' });
    expect((await handleStripeWebhookEvent(Buffer.from(payload), sign(payload), webhookDeps())).status).toBe(409);
  });
});

// --- API routes --------------------------------------------------------------------------------------

const ADMIN = 'Bearer admin-token';
let removed: any[];
let reconciled: string[];
const apiDeps = (): Partial<ApiDeps> => ({
  env: ENV,
  stripe: () => stripe,
  store: () => store,
  requireOrgAdmin: async (header, orgId) => {
    if (header === ADMIN && orgId === 'org1') return 'admin_uid';
    throw new Error(header ? 'FORBIDDEN' : 'UNAUTHENTICATED');
  },
  removeMember: async (args) => {
    removed.push(args);
    if (args.userId === 'owner') throw new MemberError('OWNER', 'The organization owner cannot be removed.');
    return { memberCount: 2 };
  },
  reconcileMembers: async (orgId) => { reconciled.push(orgId); return { before: 9, after: 3 }; },
});

async function call(path: string, body: any, headers: Record<string, string> = {}, method = 'POST') {
  const server = createApiApp(apiDeps()).listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers: { 'content-type': 'application/json', origin: 'https://app.example.org', ...headers }, body: JSON.stringify(body) });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  } finally { server.close(); }
}
beforeEach(() => { removed = []; reconciled = []; });

describe('API routes require a signed-in admin of that organization', () => {
  const routes: [string, any][] = [
    ['/api/create-subscription-checkout', { orgId: 'org1', plan: 'starter' }],
    ['/api/change-plan', { orgId: 'org1', plan: 'growth' }],
    ['/api/create-portal-session', { orgId: 'org1' }],
    ['/api/remove-member', { orgId: 'org1', userId: 'm1' }],
    ['/api/reconcile-members', { orgId: 'org1' }],
  ];
  for (const [path, body] of routes) {
    it(`${path}: 401 with no sign-in, 403 for a non-admin or another organization`, async () => {
      expect((await call(path, body)).status).toBe(401);
      expect((await call(path, body, { authorization: 'Bearer someone-else' })).status).toBe(403);
      expect((await call(path, { ...body, orgId: 'org2' }, { authorization: ADMIN })).status).toBe(403);
    });
  }
  it('nothing reached Stripe or the database while unauthorized', async () => {
    await call('/api/change-plan', { orgId: 'org1', plan: 'growth' });
    await call('/api/remove-member', { orgId: 'org1', userId: 'm1' }, { authorization: 'nope' });
    expect(stripe.calls).toHaveLength(0);
    expect(removed).toHaveLength(0);
  });
});

describe('API routes: billing flows', () => {
  it('checkout for an org with no subscription returns a Stripe address', async () => {
    const r = await call('/api/create-subscription-checkout', { orgId: 'org1', plan: 'growth' }, { authorization: ADMIN });
    expect(r.status).toBe(200);
    expect(r.json.url).toContain('checkout.stripe.test');
  });
  it('checkout for an org that already subscribed is a 409 with a clear message and a code', async () => {
    store.billing.set('org1', { stripeCustomerId: 'cus_1' });
    stripe.subs.set('sub_1', sub({ id: 'sub_1' }));
    const r = await call('/api/create-subscription-checkout', { orgId: 'org1', plan: 'pro' }, { authorization: ADMIN });
    expect(r.status).toBe(409);
    expect(r.json.code).toBe('ALREADY_SUBSCRIBED');
    expect(r.json.error).toMatch(/Change plan/);
  });
  it('change-plan upgrades the existing subscription', async () => {
    store.billing.set('org1', { plan: 'starter', status: 'active', stripeSubscriptionId: 'sub_1' });
    stripe.subs.set('sub_1', sub({ id: 'sub_1' }));
    const r = await call('/api/change-plan', { orgId: 'org1', plan: 'growth' }, { authorization: ADMIN });
    expect(r.status).toBe(200);
    expect(r.json.plan).toBe('growth');
    expect(store.billing.get('org1')!.plan).toBe('growth');
  });
  it('change-plan: a downgrade that would not fit is a 409 naming the problem', async () => {
    store.billing.set('org1', { plan: 'growth', status: 'active', stripeSubscriptionId: 'sub_1' });
    stripe.subs.set('sub_1', sub({ id: 'sub_1', items: { data: [{ id: 'si_1', price: { id: 'price_growth' } }] } }));
    store.memberCounts.set('org1', 6);
    const r = await call('/api/change-plan', { orgId: 'org1', plan: 'starter' }, { authorization: ADMIN });
    expect(r.status).toBe(409);
    expect(r.json.error).toMatch(/6 team members.*allows 3/);
  });
  it('bad input is a 400, and server errors never leak internals', async () => {
    expect((await call('/api/change-plan', { orgId: 'org1' }, { authorization: ADMIN })).status).toBe(400);
    expect((await call('/api/change-plan', { orgId: 'org1', plan: 'platinum' }, { authorization: ADMIN })).status).toBe(400);
    stripe.subscriptions.retrieve = async () => { throw new Error('secret internal stack detail sk_test_123'); };
    store.billing.set('org1', { plan: 'starter', status: 'active', stripeSubscriptionId: 'sub_1' });
    const r = await call('/api/change-plan', { orgId: 'org1', plan: 'growth' }, { authorization: ADMIN });
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.json)).not.toContain('sk_test');
  });
  it('donation amounts are checked (whole cents, $1 to $10,000)', async () => {
    for (const bad of [0, 99, -5, 1.5, 1_000_001, 'abc']) {
      expect((await call('/api/create-checkout-session', { amount: bad })).status).toBe(400);
    }
    expect((await call('/api/create-checkout-session', { amount: 5000 })).status).toBe(200);
    expect((await call('/api/create-checkout-session', {})).status).toBe(200); // default $25
    const created = stripe.calls.filter((c) => c.method === 'checkout.create');
    expect(created[0].args[0].line_items[0].price_data.unit_amount).toBe(5000);
    expect(created[1].args[0].line_items[0].price_data.unit_amount).toBe(2500);
  });
});

describe('API routes: membership', () => {
  it('remove-member passes the verified admin as the requester', async () => {
    const r = await call('/api/remove-member', { orgId: 'org1', userId: 'm1' }, { authorization: ADMIN });
    expect(r.status).toBe(200);
    expect(removed[0]).toEqual({ orgId: 'org1', userId: 'm1', requesterUid: 'admin_uid' });
  });
  it('removing the owner is refused with the reason', async () => {
    const r = await call('/api/remove-member', { orgId: 'org1', userId: 'owner' }, { authorization: ADMIN });
    expect(r.status).toBe(409);
    expect(r.json.error).toMatch(/owner/);
  });
  it('reconcile-members reports what it found', async () => {
    const r = await call('/api/reconcile-members', { orgId: 'org1' }, { authorization: ADMIN });
    expect(r.json).toEqual({ before: 9, after: 3 });
    expect(reconciled).toEqual(['org1']);
  });
});
