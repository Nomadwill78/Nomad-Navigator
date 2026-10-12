import { BillingStatus, PLAN_SEAT_LIMITS, PlanId } from '../../types';
import { checkPlanChange, isPaidPlan } from '../lib/plans';

/**
 * Billing rules, kept free of Stripe's and Firebase's real clients (they are passed in) so every policy
 * here is covered by tests that run offline.
 *
 * The ideas that keep this safe:
 *  - ONE subscription per organization. A second checkout is refused while one is live; plan changes
 *    update that same subscription; a stray duplicate is cancelled.
 *  - Webhooks are verified, recorded by event id (so a repeat does nothing), and NEVER trusted for their
 *    payload: each one makes us re-read the subscription from Stripe, so delivery order does not matter.
 *  - A late event about an old subscription can never overwrite the organization's current one.
 */

// --- Types for the pieces of Stripe and the database we use ---------------------------------------

export interface StripeSubscription {
  id: string;
  status: string;
  customer: string | { id: string };
  metadata?: Record<string, string> | null;
  cancel_at_period_end?: boolean;
  items: { data: { id: string; price?: { id: string } | null; current_period_end?: number }[] };
}

export interface StripeLike {
  subscriptions: {
    retrieve(id: string): Promise<StripeSubscription>;
    update(id: string, params: Record<string, unknown>, options?: { idempotencyKey?: string }): Promise<StripeSubscription>;
    cancel(id: string, params?: Record<string, unknown>): Promise<StripeSubscription>;
    list(params: Record<string, unknown>): Promise<{ data: StripeSubscription[] }>;
  };
  customers: { create(params: Record<string, unknown>, options?: { idempotencyKey?: string }): Promise<{ id: string }> };
  checkout: { sessions: { create(params: Record<string, unknown>, options?: { idempotencyKey?: string }): Promise<{ url: string | null }> } };
}

export interface BillingRecord {
  plan?: PlanId;
  status?: BillingStatus;
  seatLimit?: number | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}

export interface BillingIssue {
  kind: 'duplicate_subscription' | 'unknown_price' | 'missing_org' | 'stale_subscription_event';
  detail: string;
  subscriptionId?: string;
}

export type ClaimResult = 'new' | 'duplicate' | 'in_progress';

export interface BillingStore {
  getBilling(orgId: string): Promise<BillingRecord | null>;
  /** Merge fields into the billing document. */
  setBilling(orgId: string, patch: BillingRecord): Promise<void>;
  /**
   * Atomically: if the organization has no recorded subscription, or this is the recorded one, or the recorded one
   * is no longer live, write `patch` and return {applied:true}. Otherwise leave everything alone and report who holds it.
   * `isRecordedLive` is asked only when a different subscription is recorded.
   */
  adoptSubscription(orgId: string, subscriptionId: string, patch: BillingRecord, isRecordedLive: (recordedId: string) => Promise<boolean>): Promise<{ applied: true } | { applied: false; heldBy: string }>;
  recordIssue(orgId: string, issue: BillingIssue): Promise<void>;
  claimEvent(eventId: string, type: string): Promise<ClaimResult>;
  finishEvent(eventId: string, outcome: string): Promise<void>;
  failEvent(eventId: string, error: string): Promise<void>;
  /** The real number of members, counted from the members themselves (never the stored counter). */
  countMembers(orgId: string): Promise<number>;
}

export class BillingError extends Error {
  constructor(public code: string, message: string, public httpStatus = 409) {
    super(message);
    this.name = 'BillingError';
  }
}

// --- Prices and plans -----------------------------------------------------------------------------

export type Env = Record<string, string | undefined>;

export const priceIdForPlan = (plan: string, env: Env): string | undefined =>
  ({ starter: env.STRIPE_PRICE_STARTER, growth: env.STRIPE_PRICE_GROWTH, pro: env.STRIPE_PRICE_PRO } as Record<string, string | undefined>)[plan];

export const planForPriceId = (priceId: string | undefined, env: Env): PlanId | undefined => {
  if (!priceId) return undefined;
  if (priceId === env.STRIPE_PRICE_STARTER) return 'starter';
  if (priceId === env.STRIPE_PRICE_GROWTH) return 'growth';
  if (priceId === env.STRIPE_PRICE_PRO) return 'pro';
  return undefined;
};

/** Live billing stays off until the owner has verified everything in Stripe test mode and turns it on. */
export function assertBillingAllowed(env: Env): void {
  const key = env.STRIPE_SECRET_KEY ?? '';
  if (!key) throw new BillingError('NOT_CONFIGURED', 'STRIPE_SECRET_KEY is not set.', 503);
  if (key.startsWith('sk_live_') && env.ALLOW_LIVE_BILLING !== 'true') {
    throw new BillingError(
      'LIVE_BILLING_OFF',
      'Live billing is switched off. Verify everything in Stripe test mode first (docs/BILLING_TEST_MODE.md), then set ALLOW_LIVE_BILLING=true.',
      503
    );
  }
}

// --- What a Stripe subscription status means for us ----------------------------------------------

export interface MappedStatus {
  status: BillingStatus;
  /** Does this status mean the paid plan is really in force? (An unpaid first checkout does not upgrade anyone.) */
  grantsPlan: boolean;
  /** Is a subscription in this state still alive in Stripe (can it still bill or be updated)? */
  live: boolean;
}

/**
 * The failed-payment and cancellation policy, status by status:
 *  active            -> active, plan in force
 *  trialing          -> trialing, plan in force
 *  past_due          -> a payment failed, Stripe is retrying: past_due, plan kept, no NEW seats
 *  unpaid / paused   -> Stripe stopped collecting: past_due, plan kept, no NEW seats (until it is fixed or cancelled)
 *  incomplete        -> the first payment has not succeeded yet: the plan is NOT changed
 *  incomplete_expired / canceled -> canceled, no NEW seats; everyone keeps their data
 */
export function mapSubscriptionStatus(stripeStatus: string): MappedStatus {
  switch (stripeStatus) {
    case 'active': return { status: 'active', grantsPlan: true, live: true };
    case 'trialing': return { status: 'trialing', grantsPlan: true, live: true };
    case 'past_due':
    case 'unpaid':
    case 'paused': return { status: 'past_due', grantsPlan: true, live: true };
    case 'incomplete': return { status: 'past_due', grantsPlan: false, live: true };
    case 'incomplete_expired':
    case 'canceled': return { status: 'canceled', grantsPlan: false, live: false };
    default: return { status: 'canceled', grantsPlan: false, live: false }; // an unknown status never grants anything
  }
}

export const isLiveSubscription = (sub: Pick<StripeSubscription, 'status'>): boolean => mapSubscriptionStatus(sub.status).live;

const customerIdOf = (sub: StripeSubscription): string => (typeof sub.customer === 'string' ? sub.customer : sub.customer.id);

/** Works out what to store for a subscription. Returns an issue instead when the price is not one of ours. */
export function deriveBillingPatch(sub: StripeSubscription, env: Env, currentPlan?: PlanId): { patch: BillingRecord } | { issue: BillingIssue } {
  const mapped = mapSubscriptionStatus(sub.status);
  const prices = sub.items.data.map((i) => i.price?.id);
  const plan = prices.map((p) => planForPriceId(p, env)).find(Boolean);

  const patch: BillingRecord = {
    status: mapped.status,
    stripeCustomerId: customerIdOf(sub),
    stripeSubscriptionId: sub.id,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
  };
  const end = sub.items.data[0]?.current_period_end;
  patch.currentPeriodEnd = end ? new Date(end * 1000).toISOString() : null;

  if (mapped.grantsPlan) {
    if (!plan) return { issue: { kind: 'unknown_price', detail: `Subscription ${sub.id} uses price(s) ${prices.join(', ') || 'none'}, which are not Starter, Growth or Pro.`, subscriptionId: sub.id } };
    patch.plan = plan;
    patch.seatLimit = PLAN_SEAT_LIMITS[plan]; // for display; the rules never read it
  } else if (!mapped.live) {
    // Ended: the plan name is kept as history, but seats are blocked by the status.
    if (plan) { patch.plan = plan; patch.seatLimit = PLAN_SEAT_LIMITS[plan]; } else if (currentPlan) patch.plan = currentPlan;
  }
  return { patch };
}

// --- Applying a subscription to an organization -------------------------------------------------------

/**
 * Brings the organization's billing in line with ONE subscription, safely:
 *  - if the organization already has a different live subscription, this one is a duplicate: cancel it, record it, change nothing;
 *  - if this is an old subscription (the organization has moved on to another), its news is ignored.
 */
export async function applySubscription(
  deps: { stripe: StripeLike; store: BillingStore; env: Env },
  orgId: string,
  sub: StripeSubscription
): Promise<'applied' | 'duplicate_cancelled' | 'stale_ignored' | 'issue'> {
  const { stripe, store, env } = deps;
  const current = await store.getBilling(orgId);
  const derived = deriveBillingPatch(sub, env, current?.plan);
  if ('issue' in derived) {
    await store.recordIssue(orgId, derived.issue);
    return 'issue';
  }

  const result = await store.adoptSubscription(orgId, sub.id, derived.patch, async (recordedId) => {
    try {
      return isLiveSubscription(await stripe.subscriptions.retrieve(recordedId));
    } catch {
      return false; // cannot find the recorded one: treat it as gone
    }
  });
  if (result.applied) return 'applied';
  const heldBy = (result as { heldBy: string }).heldBy;

  // The organization is held by a different, live subscription.
  if (isLiveSubscription(sub)) {
    await stripe.subscriptions.cancel(sub.id, { prorate: true, invoice_now: true }); // credit back what was charged
    await store.recordIssue(orgId, {
      kind: 'duplicate_subscription',
      detail: `Subscription ${sub.id} was a second subscription for this organization (it already has ${heldBy}). It was cancelled and the charge credited back.`,
      subscriptionId: sub.id,
    });
    return 'duplicate_cancelled';
  }
  await store.recordIssue(orgId, { kind: 'stale_subscription_event', detail: `Ignored an event about ended subscription ${sub.id}; the organization is on ${heldBy}.`, subscriptionId: sub.id });
  return 'stale_ignored';
}

// --- Webhooks ---------------------------------------------------------------------------------------

export interface StripeEvent { id: string; type: string; created?: number; data: { object: any } }

export const subscriptionIdFromInvoice = (invoice: any): string | undefined => {
  const raw = invoice?.parent?.subscription_details?.subscription ?? invoice?.subscription; // newer and older API shapes
  return typeof raw === 'string' ? raw : raw?.id;
};

/** The events that mean "something about a subscription changed". Each one only tells us WHICH subscription to re-read. */
const SUBSCRIPTION_EVENTS = new Set([
  'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted',
  'customer.subscription.paused', 'customer.subscription.resumed', 'customer.subscription.pending_update_applied',
]);
const INVOICE_EVENTS = new Set(['invoice.paid', 'invoice.payment_failed', 'invoice.payment_action_required', 'invoice.payment_succeeded', 'invoice.marked_uncollectible']);

export interface EventOutcome { handled: boolean; duplicate?: boolean; detail?: string }

export async function processStripeEvent(deps: { stripe: StripeLike; store: BillingStore; env: Env }, event: StripeEvent): Promise<EventOutcome> {
  const { stripe, store } = deps;
  const claim = await store.claimEvent(event.id, event.type);
  if (claim === 'duplicate') return { handled: false, duplicate: true };
  if (claim === 'in_progress') throw new BillingError('IN_PROGRESS', 'This event is already being processed; Stripe will retry.', 409);

  try {
    let subscriptionId: string | undefined;
    const object = event.data.object;
    if (event.type === 'checkout.session.completed') {
      if (object.mode === 'subscription' && object.subscription) subscriptionId = typeof object.subscription === 'string' ? object.subscription : object.subscription.id;
    } else if (SUBSCRIPTION_EVENTS.has(event.type)) {
      subscriptionId = object.id;
    } else if (INVOICE_EVENTS.has(event.type)) {
      subscriptionId = subscriptionIdFromInvoice(object);
    }

    if (!subscriptionId) {
      await store.finishEvent(event.id, 'ignored');
      return { handled: false, detail: 'not a subscription event' };
    }

    // Never trust the payload's copy: ask Stripe for the subscription as it is right now. A late or out-of-order
    // event then just re-applies the same current truth.
    const latest = await stripe.subscriptions.retrieve(subscriptionId);
    const orgId = latest.metadata?.orgId || object?.metadata?.orgId || object?.client_reference_id;
    if (!orgId) {
      await store.finishEvent(event.id, 'no_org');
      console.error('Subscription has no orgId metadata:', subscriptionId);
      return { handled: false, detail: 'no orgId on the subscription' };
    }
    const result = await applySubscription(deps, orgId, latest);
    await store.finishEvent(event.id, result);
    return { handled: true, detail: result };
  } catch (error) {
    await store.failEvent(event.id, error instanceof Error ? error.message : String(error)).catch(() => {});
    throw error; // a 500 makes Stripe retry later
  }
}

// --- Checkout and plan changes --------------------------------------------------------------------

/** Only send people back to our own address. APP_URL wins; otherwise the request's origin if it is a real web address. */
export function resolveReturnBase(origin: string | undefined, env: Env): string {
  if (env.APP_URL) return env.APP_URL.replace(/\/+$/, '');
  try {
    const u = new URL(origin ?? '');
    const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (u.protocol === 'https:' || (u.protocol === 'http:' && local)) return u.origin;
  } catch { /* fall through */ }
  throw new BillingError('BAD_ORIGIN', 'Could not work out where to send you back to. Set APP_URL.', 400);
}

export async function createCheckout(
  deps: { stripe: StripeLike; store: BillingStore; env: Env; now?: () => number },
  args: { orgId: string; plan: string; origin?: string }
): Promise<{ url: string }> {
  const { stripe, store, env } = deps;
  assertBillingAllowed(env);
  if (!isPaidPlan(args.plan)) throw new BillingError('BAD_PLAN', 'Choose Starter, Growth or Pro.', 400);
  const price = priceIdForPlan(args.plan, env);
  if (!price) throw new BillingError('NO_PRICE', `No Stripe price is configured for the "${args.plan}" plan yet.`, 500);
  const base = resolveReturnBase(args.origin, env);

  const billing = await store.getBilling(args.orgId);
  // One billing customer per organization, created once and reused.
  let customerId = billing?.stripeCustomerId;
  if (!customerId) {
    customerId = (await stripe.customers.create({ metadata: { orgId: args.orgId } }, { idempotencyKey: `customer-${args.orgId}` })).id;
    await store.setBilling(args.orgId, { stripeCustomerId: customerId });
  }

  // Stripe is the source of truth: if this customer already has a live subscription, do not start a second one.
  const existing = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
  const live = existing.data.find(isLiveSubscription);
  if (live) {
    throw new BillingError('ALREADY_SUBSCRIBED', 'This organization already has a subscription. Use "Change plan" instead of starting a new one.', 409);
  }

  const bucket = Math.floor((deps.now?.() ?? Date.now()) / 60_000); // a double-click within a minute gets the same session
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      client_reference_id: args.orgId,
      subscription_data: { metadata: { orgId: args.orgId, plan: args.plan } },
      success_url: `${base}/?checkout=success`,
      cancel_url: `${base}/?checkout=cancel`,
    },
    { idempotencyKey: `checkout-${args.orgId}-${args.plan}-${bucket}` }
  );
  if (!session.url) throw new BillingError('NO_URL', 'Stripe did not return a checkout address.', 502);
  return { url: session.url };
}

/**
 * Moves the organization's EXISTING subscription to another plan (upgrade or downgrade), with proration.
 * A downgrade is refused if the team would not fit. A subscription with a failed payment cannot be changed.
 */
export async function changePlan(
  deps: { stripe: StripeLike; store: BillingStore; env: Env },
  args: { orgId: string; plan: string }
): Promise<{ plan: PlanId; result: string }> {
  const { stripe, store, env } = deps;
  assertBillingAllowed(env);
  if (!isPaidPlan(args.plan)) throw new BillingError('BAD_PLAN', 'Choose Starter, Growth or Pro.', 400);
  const target = args.plan as PlanId;
  const price = priceIdForPlan(target, env);
  if (!price) throw new BillingError('NO_PRICE', `No Stripe price is configured for the "${target}" plan yet.`, 500);

  const billing = await store.getBilling(args.orgId);
  const subId = billing?.stripeSubscriptionId;
  if (!subId) throw new BillingError('NO_SUBSCRIPTION', 'This organization has no subscription yet. Choose a plan to start one.', 409);
  const sub = await stripe.subscriptions.retrieve(subId);
  if (!isLiveSubscription(sub)) throw new BillingError('NO_SUBSCRIPTION', 'The subscription has ended. Choose a plan to start a new one.', 409);
  if (mapSubscriptionStatus(sub.status).status === 'past_due') {
    throw new BillingError('PAYMENT_NEEDED', 'The last payment did not go through. Fix the payment method in Manage Billing before changing plans.', 409);
  }
  if (sub.items.data.length !== 1) throw new BillingError('UNSUPPORTED', 'This subscription has more than one item, so it cannot be changed automatically. Please contact support.', 409);
  const item = sub.items.data[0];
  if (item.price?.id === price) throw new BillingError('SAME_PLAN', 'The organization is already on that plan.', 409);

  // Count real members, not the stored counter, so a damaged counter cannot let a downgrade through.
  const members = await store.countMembers(args.orgId);
  const fit = checkPlanChange(target, members);
  if ('reason' in fit) throw new BillingError('TOO_MANY_MEMBERS', fit.reason, 409);

  const updated = await stripe.subscriptions.update(
    sub.id,
    {
      items: [{ id: item.id, price }],
      metadata: { ...(sub.metadata ?? {}), orgId: args.orgId, plan: target },
      proration_behavior: 'create_prorations',
    },
    { idempotencyKey: `plan-${args.orgId}-${sub.id}-${item.price?.id}-${price}` }
  );
  // Reflect it now; the webhook that follows re-reads the same subscription and changes nothing.
  const result = await applySubscription(deps, args.orgId, updated);
  return { plan: target, result };
}
