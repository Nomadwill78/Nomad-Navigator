# Billing and seats: how it works

This is the one place that says what each plan allows and what happens when payment goes wrong.

## Seats per plan

| Plan | Team members |
|---|---|
| Trial (free, every new organization) | 5 |
| Compass Starter ($49/mo) | 3 |
| Compass Growth ($99/mo) | 10 |
| Compass Pro ($199/mo) | 25 |

Each plan has a defined capacity. Growth supports larger cross-functional teams; Pro supports up to 25 users and adds advanced reporting and onboarding.

"Exactly 3" means exactly 3: the third member can join, the fourth cannot. Pending invitations count against the limit in the app, so an admin cannot over-invite. The database also refuses a join that would go over, so the limit holds even if two people accept at the same moment or someone modifies the app.

**Where this lives:** `PLAN_SEAT_LIMITS` in `types.ts` is the single source. The app, the server, and `firestore.rules` all follow it, and a test fails if the rules table and `types.ts` ever disagree. To change a limit, change `types.ts` and `seatLimitOf()` in `firestore.rules` together.

## What happens when payment goes wrong

| Situation | Plan | New members | Existing members and data |
|---|---|---|---|
| Active or trial | Plan in force | Allowed within the limit | Full access |
| **Payment failed** (Stripe is retrying) | Kept | **Not allowed** until the payment is fixed | Full access |
| Set to cancel at the end of the period | Active until that date | Allowed until then | Full access. The Billing page shows the end date |
| **Subscription ended** | Kept as history | **Not allowed** | Full access. Nothing is deleted or locked, so a customer can always export |
| First payment not made (incomplete) | **Not changed** (stays as it was) | As before | Full access |

After a subscription ends, choosing a plan starts a fresh subscription. A change of plan is refused while a payment is failing.

## One subscription per organization

- Starting a plan is only possible when the organization has no live subscription. Stripe is asked directly (the source of truth), so it works even if our records are a moment behind.
- Every organization has one Stripe customer, created once and reused.
- Changing plan (upgrade or downgrade) updates the SAME subscription, with proration. A downgrade is refused if the team would not fit (it counts real members, not the stored counter).
- If a stray second subscription ever appears, it is cancelled, the charge is credited back, and an issue is recorded under `organizations/{id}/billingIssues`.

## Webhooks (Stripe to us)

- **Signature-verified.** A missing, wrong, tampered or replayed signature is refused with 400 before anything else happens.
- **Idempotent.** Each event id is recorded once in `stripeEvents`. A repeat delivery is acknowledged and does nothing. An event that failed is retried on the next delivery. One stuck in progress for over 2 minutes can be taken over.
- **Order does not matter.** The event only tells us which subscription changed. We then ask Stripe for that subscription as it is right now and apply that. A late or out-of-order event just re-applies the same current truth.
- **A late event about an old subscription is ignored.** It cannot cancel or overwrite the current one.
- A price that is not Starter, Growth or Pro is recorded as an issue and changes nothing.

## Member counter

`memberCount` on the organization only moves with a real membership change. An invitee adds exactly 1 in the same commit that creates their membership. Browsers cannot lower it or remove members. Removal is `POST /api/remove-member` (admin only), which deletes the member and sets the counter to the true count in one transaction. `POST /api/reconcile-members` puts a wrong counter right. For existing data, run `scripts/reconcile-member-counts.mjs` once.

## Live billing is off until verified

A live Stripe key (`sk_live_...`) is refused everywhere until `ALLOW_LIVE_BILLING=true` is set. Do that only after `docs/BILLING_TEST_MODE.md` passes.
