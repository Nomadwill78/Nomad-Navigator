import { BillingStatus, PlanId, PLAN_SEAT_LIMITS } from '../../types';

/**
 * Seats and billing-status policy, as pure functions. Used by the app, the server and the tests,
 * so "how many people can join" has exactly one answer.
 */

export const PLAN_ORDER: PlanId[] = ['trial', 'starter', 'growth', 'pro'];
export const PAID_PLANS: PlanId[] = ['starter', 'growth', 'pro'];

export const isPlanId = (v: unknown): v is PlanId => typeof v === 'string' && (PLAN_ORDER as string[]).includes(v);
export const isPaidPlan = (v: unknown): v is PlanId => typeof v === 'string' && (PAID_PLANS as string[]).includes(v);

/**
 * The seat limit for a plan: a whole number, or null for unlimited.
 * An unknown plan gets 0 (nobody new can join) rather than quietly getting unlimited seats.
 */
export function seatLimitForPlan(plan: unknown): number | null {
  return isPlanId(plan) ? PLAN_SEAT_LIMITS[plan] : 0;
}

export const describeSeatLimit = (plan: unknown): string => {
  const limit = seatLimitForPlan(plan);
  return limit === null ? 'Unlimited seats' : `Up to ${limit} seat${limit === 1 ? '' : 's'}`;
};

/** "3 team members" or "Unlimited team members", for pricing cards. */
export const describeTeamSize = (plan: unknown): string => {
  const limit = seatLimitForPlan(plan);
  return limit === null ? 'Unlimited team members' : `${limit} team member${limit === 1 ? '' : 's'}`;
};

// --- What each billing status means --------------------------------------------------------------

export interface StatusPolicy {
  /** Short label for the badge. */
  label: string;
  /** May the organization add NEW members or send invitations? */
  allowsNewSeats: boolean;
  /** Existing members always keep their access and their data; no status locks anyone out. */
  keepsAccess: true;
  /** Plain-language explanation for the admin. */
  message: string;
}

/**
 * The cancellation and failed-payment policy, written down once:
 *  - trialing / active: everything works within the plan's seat limit.
 *  - past_due (a payment failed): a grace period while Stripe retries. Everyone keeps access and data,
 *    but no NEW members can be added until the payment is fixed.
 *  - canceled (the subscription ended): everyone keeps access and data (nothing is deleted or locked,
 *    so a customer can always export), no NEW members can be added, and choosing a plan starts a fresh subscription.
 * A subscription set to cancel at the end of the period stays 'active' until that date.
 */
export const STATUS_POLICY: Record<BillingStatus, StatusPolicy> = {
  trialing: { label: 'Trial', allowsNewSeats: true, keepsAccess: true, message: 'You are on the free trial.' },
  active: { label: 'Active', allowsNewSeats: true, keepsAccess: true, message: 'Your subscription is active.' },
  past_due: {
    label: 'Payment needed',
    allowsNewSeats: false,
    keepsAccess: true,
    message: 'Your last payment did not go through. Everyone keeps access while we retry, but you cannot add new team members until the payment is fixed. Use Manage Billing to update your card.',
  },
  canceled: {
    label: 'Canceled',
    allowsNewSeats: false,
    keepsAccess: true,
    message: 'Your subscription has ended. Everyone keeps access to their data, but you cannot add new team members. Choose a plan to start a new subscription.',
  },
};

export const policyFor = (status: unknown): StatusPolicy =>
  (STATUS_POLICY as Record<string, StatusPolicy>)[String(status)] ?? STATUS_POLICY.trialing;

// --- Seats -------------------------------------------------------------------------------------

export interface SeatInput {
  plan: unknown;
  status: unknown;
  /** People who have joined. */
  members: number;
  /** Invitations sent but not accepted yet. They are held against the limit so an admin cannot over-invite. */
  pendingInvites?: number;
}

export type SeatBlock = 'full' | 'payment_needed' | 'subscription_ended';

export interface SeatStatus {
  limit: number | null;
  unlimited: boolean;
  /** Members plus pending invitations. */
  used: number;
  /** Seats left, or null when unlimited. Never negative. */
  remaining: number | null;
  /** True when one more member (or invitation) may be added. */
  canAdd: boolean;
  blockedBy?: SeatBlock;
  message: string;
}

export function evaluateSeats(input: SeatInput): SeatStatus {
  const limit = seatLimitForPlan(input.plan);
  const members = Math.max(0, Math.floor(input.members) || 0);
  const pending = Math.max(0, Math.floor(input.pendingInvites ?? 0) || 0);
  const used = members + pending;
  const policy = policyFor(input.status);
  const unlimited = limit === null;
  const remaining = unlimited ? null : Math.max(0, limit - used);

  let blockedBy: SeatBlock | undefined;
  if (!policy.allowsNewSeats) blockedBy = input.status === 'canceled' ? 'subscription_ended' : 'payment_needed';
  else if (!unlimited && used >= limit) blockedBy = 'full';

  const message =
    blockedBy === 'full'
      ? `All ${limit} seats are taken. Remove a member, revoke an invitation, or upgrade your plan first.`
      : blockedBy
        ? policy.message
        : unlimited
          ? 'Unlimited seats.'
          : `${remaining} of ${limit} seats free.`;

  return { limit, unlimited, used, remaining, canAdd: !blockedBy, blockedBy, message };
}

/**
 * Whether an organization may move to `target`. Moving to a plan with fewer seats than there are
 * occupied seats (members plus pending invitations) is refused, because it would leave the organization over its limit.
 */
export function checkPlanChange(target: unknown, occupiedSeats: number): { ok: true } | { ok: false; reason: string } {
  if (!isPaidPlan(target)) return { ok: false, reason: 'Choose Starter, Growth or Pro.' };
  const limit = seatLimitForPlan(target);
  if (limit !== null && occupiedSeats > limit) {
    return {
      ok: false,
      reason: `You have ${occupiedSeats} occupied seats (including pending invitations), but ${target[0].toUpperCase()}${target.slice(1)} allows ${limit}. Remove ${occupiedSeats - limit} members or revoke invitations first, then switch.`,
    };
  }
  return { ok: true };
}

/** Is `to` a downgrade from `from`? (Used for the confirmation wording.) */
export const isDowngrade = (from: unknown, to: unknown): boolean =>
  isPlanId(from) && isPlanId(to) && PLAN_ORDER.indexOf(to) < PLAN_ORDER.indexOf(from);
