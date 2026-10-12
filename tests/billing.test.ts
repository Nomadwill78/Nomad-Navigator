// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import {
  mapSubscriptionStatus, deriveBillingPatch, applySubscription, processStripeEvent, createCheckout, changePlan,
  assertBillingAllowed, resolveReturnBase, subscriptionIdFromInvoice, BillingError,
} from '../src/server/billing';
import { FakeStripe, FakeStore, ENV, sub, evt } from './helpers/fakeBilling';

let stripe: FakeStripe;
let store: FakeStore;
const deps = () => ({ stripe, store, env: ENV });
beforeEach(() => { stripe = new FakeStripe(); store = new FakeStore(); });

describe('cancellation and failed-payment policy (status by status)', () => {
  const cases: [string, string, boolean, boolean][] = [
    ['active', 'active', true, true],
    ['trialing', 'trialing', true, true],
    ['past_due', 'past_due', true, true],    // payment failed: plan kept, no NEW seats (see plans.ts)
    ['unpaid', 'past_due', true, true],
    ['paused', 'past_due', true, true],
    ['incomplete', 'past_due', false, true], // first payment not made: the plan must NOT change
    ['incomplete_expired', 'canceled', false, false],
    ['canceled', 'canceled', false, false],
    ['something_new_from_stripe', 'canceled', false, false], // unknown never grants anything
  ];
  for (const [stripeStatus, status, grantsPlan, live] of cases) {
    it(`${stripeStatus} -> ${status} (plan in force: ${grantsPlan}, live: ${live})`, () => {
      expect(mapSubscriptionStatus(stripeStatus)).toEqual({ status, grantsPlan, live });
    });
  }

  it('a failed payment keeps the plan and blocks new seats; paying again restores it', async () => {
    store.billing.set('org1', { plan: 'growth', status: 'active', stripeSubscriptionId: 'sub_1' });
    stripe.subs.set('sub_1', sub({ id: 'sub_1', items: { data: [{ id: 'si_1', price: { id: 'price_growth' }, current_period_end: 1_800_000_000 }] }, status: 'past_due' }));
    await processStripeEvent(deps(), evt('e1', 'invoice.payment_failed', { parent: { subscription_details: { subscription: 'sub_1' } } }));
    expect(store.billing.get('org1')).toMatchObject({ plan: 'growth', status: 'past_due' });
    stripe.subs.get('sub_1')!.status = 'active';
    await processStripeEvent(deps(), evt('e2', 'invoice.paid', { subscription: 'sub_1' }));
    expect(store.billing.get('org1')).toMatchObject({ plan: 'growth', status: 'active' });
  });

  it('cancel at the end of the period: stays active with a flag and an end date, then ends on deletion', async () => {
    store.billing.set('org1', { plan: 'starter', status: 'active', stripeSubscriptionId: 'sub_1' });
    stripe.subs.set('sub_1', sub({ id: 'sub_1', cancel_at_period_end: true }));
    await processStripeEvent(deps(), evt('e1', 'customer.subscription.updated', { id: 'sub_1' }));
    expect(store.billing.get('org1')).toMatchObject({ status: 'active', cancelAtPeriodEnd: true });
    expect(store.billing.get('org1')!.currentPeriodEnd).toBeTruthy();
    stripe.subs.get('sub_1')!.status = 'canceled';
    await processStripeEvent(deps(), evt('e2', 'customer.subscription.deleted', { id: 'sub_1' }));
    expect(store.billing.get('org1')).toMatchObject({ status: 'canceled', plan: 'starter' }); // plan kept as history; seats blocked by status
  });

  it('after cancellation the organization can subscribe again and the new subscription takes over', async () => {
    store.billing.set('org1', { plan: 'starter', status: 'canceled', stripeSubscriptionId: 'sub_old', stripeCustomerId: 'cus_1' });
    stripe.subs.set('sub_old', sub({ id: 'sub_old', status: 'canceled' }));
    const checkout = await createCheckout(deps(), { orgId: 'org1', plan: 'growth' });
    expect(checkout.url).toContain('price_growth');
    stripe.subs.set('sub_new', sub({ id: 'sub_new', items: { data: [{ id: 'si_9', price: { id: 'price_growth' }, current_period_end: 1_800_000_000 }] } }));
    await processStripeEvent(deps(), evt('e1', 'checkout.session.completed', { mode: 'subscription', subscription: 'sub_new' }));
    expect(store.billing.get('org1')).toMatchObject({ plan: 'growth', status: 'active', stripeSubscriptionId: 'sub_new' });
  });

  it('an unpaid first checkout changes nothing: not the plan, not the status, not the recorded subscription', async () => {
    store.billing.set('org1', { plan: 'trial', status: 'trialing' });
    stripe.subs.set('sub_1', sub({ id: 'sub_1', status: 'incomplete' }));
    await processStripeEvent(deps(), evt('e1', 'checkout.session.completed', { mode: 'subscription', subscription: 'sub_1' }));
    expect(store.billing.get('org1')).toEqual({ plan: 'trial', status: 'trialing' });
  });
  it('once that first payment succeeds, the same subscription is adopted', async () => {
    store.billing.set('org1', { plan: 'trial', status: 'trialing' });
    stripe.subs.set('sub_1', sub({ id: 'sub_1', status: 'incomplete' }));
    await processStripeEvent(deps(), evt('e1', 'checkout.session.completed', { mode: 'subscription', subscription: 'sub_1' }));
    stripe.subs.get('sub_1')!.status = 'active';
    await processStripeEvent(deps(), evt('e2', 'customer.subscription.updated', { id: 'sub_1' }));
    expect(store.billing.get('org1')).toMatchObject({ plan: 'starter', status: 'active', stripeSubscriptionId: 'sub_1' });
  });
  it('a person whose first payment failed at checkout can try again straight away', async () => {
    store.billing.set('org1', { stripeCustomerId: 'cus_1' });
    stripe.subs.set('sub_stuck', sub({ id: 'sub_stuck', status: 'incomplete' }));
    await expect(createCheckout(deps(), { orgId: 'org1', plan: 'starter' })).resolves.toHaveProperty('url');
  });
});

describe('deriveBillingPatch', () => {
  it('maps prices to plans and uses unlimited for Growth and Pro', () => {
    const g = deriveBillingPatch(sub({ id: 's', items: { data: [{ id: 'i', price: { id: 'price_growth' } }] } }), ENV) as any;
    expect(g.patch).toMatchObject({ plan: 'growth', seatLimit: null, status: 'active', stripeSubscriptionId: 's' });
    const p = deriveBillingPatch(sub({ id: 's', items: { data: [{ id: 'i', price: { id: 'price_pro' } }] } }), ENV) as any;
    expect(p.patch).toMatchObject({ plan: 'pro', seatLimit: null });
    const s = deriveBillingPatch(sub({ id: 's' }), ENV) as any;
    expect(s.patch).toMatchObject({ plan: 'starter', seatLimit: 3 });
  });
  it('reports a price that is not ours instead of guessing', () => {
    const r = deriveBillingPatch(sub({ id: 's', items: { data: [{ id: 'i', price: { id: 'price_mystery' } }] } }), ENV) as any;
    expect(r.issue.kind).toBe('unknown_price');
  });
});

describe('webhook idempotency', () => {
  it('the same event delivered twice changes things once', async () => {
    stripe.subs.set('sub_1', sub({ id: 'sub_1' }));
    const e = evt('evt_dup', 'customer.subscription.created', { id: 'sub_1' });
    expect((await processStripeEvent(deps(), e)).handled).toBe(true);
    const writesAfterFirst = store.writes;
    const again = await processStripeEvent(deps(), e);
    expect(again.duplicate).toBe(true);
    expect(store.writes).toBe(writesAfterFirst);
    expect(stripe.count('retrieve')).toBe(1);
  });
  it('an event still being processed asks Stripe to retry instead of running twice', async () => {
    store.events.set('evt_x', { status: 'processing' });
    await expect(processStripeEvent(deps(), evt('evt_x', 'customer.subscription.updated', { id: 'sub_1' }))).rejects.toMatchObject({ code: 'IN_PROGRESS' });
  });
  it('a failed attempt is retried on the next delivery and then succeeds', async () => {
    const e = evt('evt_retry', 'customer.subscription.updated', { id: 'sub_missing' });
    await expect(processStripeEvent(deps(), e)).rejects.toThrow(); // Stripe cannot find it yet
    expect(store.events.get('evt_retry')!.status).toBe('failed');
    stripe.subs.set('sub_missing', sub({ id: 'sub_missing' }));
    expect((await processStripeEvent(deps(), e)).handled).toBe(true);
    expect(store.events.get('evt_retry')!.status).toBe('done');
  });
  it('events that are not about subscriptions are recorded and ignored', async () => {
    const out = await processStripeEvent(deps(), evt('evt_other', 'charge.succeeded', { id: 'ch_1' }));
    expect(out.handled).toBe(false);
    expect(store.events.get('evt_other')!.status).toBe('done');
  });
});

describe('webhook event ordering', () => {
  it('delivering updates in the wrong order still ends at what Stripe says now', async () => {
    store.billing.set('org1', { plan: 'starter', status: 'active', stripeSubscriptionId: 'sub_1' });
    // Stripe's current truth: upgraded to Growth.
    stripe.subs.set('sub_1', sub({ id: 'sub_1', items: { data: [{ id: 'si_1', price: { id: 'price_growth' } }] } }));
    // The OLD "starter" update event arrives AFTER the newer one. Its payload says starter, but we ignore payloads.
    await processStripeEvent(deps(), evt('e_new', 'customer.subscription.updated', { id: 'sub_1', items: { data: [{ price: { id: 'price_growth' } }] } }));
    await processStripeEvent(deps(), evt('e_old', 'customer.subscription.updated', { id: 'sub_1', status: 'active', items: { data: [{ price: { id: 'price_starter' } }] } }));
    expect(store.billing.get('org1')!.plan).toBe('growth');
  });
  it('checkout.session.completed, subscription.created and invoice.paid in any order give the same result', async () => {
    stripe.subs.set('sub_1', sub({ id: 'sub_1', items: { data: [{ id: 'si_1', price: { id: 'price_pro' } }] } }));
    const evs = [
      evt('a', 'invoice.paid', { subscription: 'sub_1' }),
      evt('b', 'customer.subscription.created', { id: 'sub_1' }),
      evt('c', 'checkout.session.completed', { mode: 'subscription', subscription: 'sub_1' }),
    ];
    const orders = [[0, 1, 2], [2, 1, 0], [1, 0, 2]];
    for (const order of orders) {
      store = new FakeStore();
      for (const i of order) await processStripeEvent(deps(), evs[i]);
      expect(store.billing.get('org1')).toMatchObject({ plan: 'pro', status: 'active', stripeSubscriptionId: 'sub_1' });
    }
  });
  it('a late "deleted" event for an old subscription does not cancel the current one', async () => {
    store.billing.set('org1', { plan: 'growth', status: 'active', stripeSubscriptionId: 'sub_current' });
    stripe.subs.set('sub_current', sub({ id: 'sub_current' }));
    stripe.subs.set('sub_old', sub({ id: 'sub_old', status: 'canceled' }));
    await processStripeEvent(deps(), evt('e1', 'customer.subscription.deleted', { id: 'sub_old' }));
    expect(store.billing.get('org1')).toMatchObject({ status: 'active', stripeSubscriptionId: 'sub_current', plan: 'growth' });
    expect(store.issues.map((i) => i.issue.kind)).toContain('stale_subscription_event');
  });
  it('a subscription with no organization on it is recorded and does not crash', async () => {
    stripe.subs.set('sub_x', sub({ id: 'sub_x', metadata: {} }));
    const out = await processStripeEvent(deps(), evt('e1', 'customer.subscription.created', { id: 'sub_x' }));
    expect(out.handled).toBe(false);
  });
  it('a price that is not ours is recorded as an issue and the organization is not changed', async () => {
    store.billing.set('org1', { plan: 'starter', status: 'active', stripeSubscriptionId: 'sub_1' });
    stripe.subs.set('sub_1', sub({ id: 'sub_1', items: { data: [{ id: 'si_1', price: { id: 'price_mystery' } }] } }));
    await processStripeEvent(deps(), evt('e1', 'customer.subscription.updated', { id: 'sub_1' }));
    expect(store.billing.get('org1')!.plan).toBe('starter');
    expect(store.issues[0].issue.kind).toBe('unknown_price');
  });
  it('reads the subscription id from both the old and the new invoice shape', () => {
    expect(subscriptionIdFromInvoice({ subscription: 'sub_a' })).toBe('sub_a');
    expect(subscriptionIdFromInvoice({ parent: { subscription_details: { subscription: 'sub_b' } } })).toBe('sub_b');
    expect(subscriptionIdFromInvoice({})).toBeUndefined();
  });
});

describe('one managed subscription per organization', () => {
  it('a second live subscription is cancelled, credited, recorded, and the first stays in charge', async () => {
    store.billing.set('org1', { plan: 'starter', status: 'active', stripeSubscriptionId: 'sub_first' });
    stripe.subs.set('sub_first', sub({ id: 'sub_first' }));
    stripe.subs.set('sub_second', sub({ id: 'sub_second', items: { data: [{ id: 'si_2', price: { id: 'price_pro' } }] } }));
    const result = await applySubscription(deps(), 'org1', stripe.subs.get('sub_second')!);
    expect(result).toBe('duplicate_cancelled');
    expect(stripe.subs.get('sub_second')!.status).toBe('canceled');
    expect(stripe.calls.find((c) => c.method === 'cancel')!.args[1]).toMatchObject({ prorate: true, invoice_now: true });
    expect(store.billing.get('org1')).toMatchObject({ stripeSubscriptionId: 'sub_first', plan: 'starter' });
    expect(store.issues[0].issue.kind).toBe('duplicate_subscription');
  });
  it('two checkouts completing at the same moment end with exactly one live subscription', async () => {
    stripe.subs.set('sub_a', sub({ id: 'sub_a' }));
    stripe.subs.set('sub_b', sub({ id: 'sub_b' }));
    await Promise.all([
      processStripeEvent(deps(), evt('ea', 'checkout.session.completed', { mode: 'subscription', subscription: 'sub_a' })),
      processStripeEvent(deps(), evt('eb', 'checkout.session.completed', { mode: 'subscription', subscription: 'sub_b' })),
    ]);
    const live = [...stripe.subs.values()].filter((s) => s.status === 'active');
    expect(live).toHaveLength(1);
    expect(store.billing.get('org1')!.stripeSubscriptionId).toBe(live[0].id);
  });
  it('checkout is refused while Stripe shows a live subscription, even if our records have not caught up', async () => {
    stripe.subs.set('sub_1', sub({ id: 'sub_1', customer: 'cus_known' }));
    store.billing.set('org1', { stripeCustomerId: 'cus_known' }); // no stripeSubscriptionId recorded yet
    await expect(createCheckout(deps(), { orgId: 'org1', plan: 'pro' })).rejects.toMatchObject({ code: 'ALREADY_SUBSCRIBED' });
    expect(stripe.count('checkout.create')).toBe(0);
  });
  it('a past_due subscription also counts as live, so it cannot be doubled up', async () => {
    stripe.subs.set('sub_1', sub({ id: 'sub_1', customer: 'cus_known', status: 'past_due' }));
    store.billing.set('org1', { stripeCustomerId: 'cus_known' });
    await expect(createCheckout(deps(), { orgId: 'org1', plan: 'pro' })).rejects.toMatchObject({ code: 'ALREADY_SUBSCRIBED' });
  });
  it('creates one Stripe customer per organization and reuses it', async () => {
    await createCheckout(deps(), { orgId: 'org1', plan: 'starter' });
    await createCheckout(deps(), { orgId: 'org1', plan: 'growth' });
    expect(stripe.count('customers.create')).toBe(1);
    expect(store.billing.get('org1')!.stripeCustomerId).toBe('cus_new1');
  });
  it('a double click within a minute reuses the same checkout (idempotency key)', async () => {
    const now = () => 1_700_000_000_000;
    await createCheckout({ ...deps(), now }, { orgId: 'org1', plan: 'starter' });
    await createCheckout({ ...deps(), now }, { orgId: 'org1', plan: 'starter' });
    expect(stripe.sessionKeys[0]).toBe(stripe.sessionKeys[1]);
  });
  it('checkout carries the organization on the subscription and returns to our own address', async () => {
    await createCheckout(deps(), { orgId: 'org1', plan: 'growth', origin: 'https://evil.example' });
    const params = stripe.calls.find((c) => c.method === 'checkout.create')!.args[0];
    expect(params.subscription_data.metadata).toEqual({ orgId: 'org1', plan: 'growth' });
    expect(params.client_reference_id).toBe('org1');
    expect(params.success_url).toBe('https://app.example.org/?checkout=success'); // APP_URL, not the attacker-supplied origin
  });
});

describe('upgrades and downgrades update the existing subscription', () => {
  beforeEach(() => {
    store.billing.set('org1', { plan: 'starter', status: 'active', stripeSubscriptionId: 'sub_1', stripeCustomerId: 'cus_1' });
    stripe.subs.set('sub_1', sub({ id: 'sub_1' }));
  });
  it('upgrade: updates the same subscription with proration; no new subscription is created', async () => {
    const out = await changePlan(deps(), { orgId: 'org1', plan: 'growth' });
    expect(out.plan).toBe('growth');
    expect(stripe.count('checkout.create')).toBe(0);
    expect(stripe.subs.size).toBe(1);
    const update = stripe.calls.find((c) => c.method === 'update')!;
    expect(update.args[0]).toBe('sub_1');
    expect(update.args[1]).toMatchObject({ items: [{ id: 'si_1', price: 'price_growth' }], proration_behavior: 'create_prorations' });
    expect(store.billing.get('org1')).toMatchObject({ plan: 'growth', seatLimit: null, stripeSubscriptionId: 'sub_1' });
  });
  it('downgrade Pro to Growth to Starter works when the team fits', async () => {
    store.billing.set('org1', { plan: 'pro', status: 'active', stripeSubscriptionId: 'sub_1' });
    stripe.subs.get('sub_1')!.items.data[0].price = { id: 'price_pro' };
    store.memberCounts.set('org1', 3);
    await changePlan(deps(), { orgId: 'org1', plan: 'growth' });
    expect(store.billing.get('org1')!.plan).toBe('growth');
    await changePlan(deps(), { orgId: 'org1', plan: 'starter' });
    expect(store.billing.get('org1')).toMatchObject({ plan: 'starter', seatLimit: 3 });
  });
  it('downgrade to Starter is refused with a clear message when there are more than 3 members', async () => {
    store.billing.set('org1', { plan: 'growth', status: 'active', stripeSubscriptionId: 'sub_1' });
    stripe.subs.get('sub_1')!.items.data[0].price = { id: 'price_growth' };
    store.memberCounts.set('org1', 5);
    const err = await changePlan(deps(), { orgId: 'org1', plan: 'starter' }).catch((e) => e);
    expect(err).toBeInstanceOf(BillingError);
    expect(err.code).toBe('TOO_MANY_MEMBERS');
    expect(err.message).toMatch(/5 team members.*allows 3.*Remove 2 members/);
    expect(stripe.count('update')).toBe(0);
  });
  it('exactly 3 members can downgrade to Starter; 4 cannot', async () => {
    store.billing.set('org1', { plan: 'growth', status: 'active', stripeSubscriptionId: 'sub_1' });
    stripe.subs.get('sub_1')!.items.data[0].price = { id: 'price_growth' };
    store.memberCounts.set('org1', 4);
    await expect(changePlan(deps(), { orgId: 'org1', plan: 'starter' })).rejects.toMatchObject({ code: 'TOO_MANY_MEMBERS' });
    store.memberCounts.set('org1', 3);
    await expect(changePlan(deps(), { orgId: 'org1', plan: 'starter' })).resolves.toBeTruthy();
  });
  it('a refused change leaves everything as it was', async () => {
    store.billing.set('org1', { plan: 'growth', status: 'active', stripeSubscriptionId: 'sub_1' });
    stripe.subs.get('sub_1')!.items.data[0].price = { id: 'price_growth' };
    store.memberCounts.set('org1', 9);
    const before = JSON.stringify(store.billing.get('org1'));
    await changePlan(deps(), { orgId: 'org1', plan: 'starter' }).catch(() => {});
    expect(JSON.stringify(store.billing.get('org1'))).toBe(before);
  });
  it('refuses the same plan, a bad plan, a past_due subscription, an ended one, and no subscription at all', async () => {
    await expect(changePlan(deps(), { orgId: 'org1', plan: 'starter' })).rejects.toMatchObject({ code: 'SAME_PLAN' });
    await expect(changePlan(deps(), { orgId: 'org1', plan: 'platinum' })).rejects.toMatchObject({ code: 'BAD_PLAN' });
    stripe.subs.get('sub_1')!.status = 'past_due';
    await expect(changePlan(deps(), { orgId: 'org1', plan: 'growth' })).rejects.toMatchObject({ code: 'PAYMENT_NEEDED' });
    stripe.subs.get('sub_1')!.status = 'canceled';
    await expect(changePlan(deps(), { orgId: 'org1', plan: 'growth' })).rejects.toMatchObject({ code: 'NO_SUBSCRIPTION' });
    store.billing.set('org2', { plan: 'trial', status: 'trialing' });
    await expect(changePlan(deps(), { orgId: 'org2', plan: 'growth' })).rejects.toMatchObject({ code: 'NO_SUBSCRIPTION' });
  });
  it('a double click on the same change reuses one Stripe idempotency key', async () => {
    await changePlan(deps(), { orgId: 'org1', plan: 'growth' });
    stripe.subs.get('sub_1')!.items.data[0].price = { id: 'price_starter' };
    store.billing.set('org1', { plan: 'starter', status: 'active', stripeSubscriptionId: 'sub_1' });
    await changePlan(deps(), { orgId: 'org1', plan: 'growth' });
    expect(stripe.updateKeys[0]).toBe(stripe.updateKeys[1]);
  });
});

describe('live billing stays off until test mode is verified', () => {
  it('refuses a live key unless ALLOW_LIVE_BILLING is true', () => {
    expect(() => assertBillingAllowed({ STRIPE_SECRET_KEY: 'sk_live_abc' })).toThrow(/Live billing is switched off/);
    expect(() => assertBillingAllowed({ STRIPE_SECRET_KEY: 'sk_live_abc', ALLOW_LIVE_BILLING: 'true' })).not.toThrow();
    expect(() => assertBillingAllowed({ STRIPE_SECRET_KEY: 'sk_test_abc' })).not.toThrow();
    expect(() => assertBillingAllowed({})).toThrow(/STRIPE_SECRET_KEY/);
  });
  it('checkout and plan changes both obey it', async () => {
    const env = { ...ENV, STRIPE_SECRET_KEY: 'sk_live_abc' };
    await expect(createCheckout({ stripe, store, env }, { orgId: 'org1', plan: 'starter' })).rejects.toMatchObject({ code: 'LIVE_BILLING_OFF' });
    await expect(changePlan({ stripe, store, env }, { orgId: 'org1', plan: 'starter' })).rejects.toMatchObject({ code: 'LIVE_BILLING_OFF' });
    expect(stripe.calls).toHaveLength(0);
  });
  it('return addresses: APP_URL wins, otherwise only real https or localhost origins', () => {
    expect(resolveReturnBase('https://x.test', { APP_URL: 'https://app.org/' })).toBe('https://app.org');
    expect(resolveReturnBase('https://x.test', {})).toBe('https://x.test');
    expect(resolveReturnBase('http://localhost:5173', {})).toBe('http://localhost:5173');
    expect(() => resolveReturnBase('http://evil.test', {})).toThrow(/APP_URL/);
    expect(() => resolveReturnBase('javascript:alert(1)', {})).toThrow();
    expect(() => resolveReturnBase(undefined, {})).toThrow();
  });
});
