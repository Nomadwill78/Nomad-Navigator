# Verify billing in Stripe TEST mode before real customers

Nothing here uses real money. Do all of it with Stripe's **test mode** switched on (the "Test mode" toggle in the Stripe dashboard). Live billing stays refused by the app until you finish step 5.

## 1. Set up a test-mode deployment

Use a Vercel Preview (or a separate project) so live customers are not affected.

1. In Stripe (Test mode): Products. Create three recurring monthly prices: Starter ($49), Growth ($99), Pro ($199). Copy each **Price ID** (`price_...`, not the product id).
2. In Stripe (Test mode): Developers, Webhooks, Add endpoint: `https://YOUR-TEST-DEPLOYMENT/api/stripe-webhook`. Select these events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`. Copy the **Signing secret** (`whsec_...`).
3. In Vercel, for that test deployment, set: `STRIPE_SECRET_KEY` (the **test** key, `sk_test_...`), `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_PRO`, `APP_URL` (the deployment's address), `FIREBASE_SERVICE_ACCOUNT`. Leave `ALLOW_LIVE_BILLING` unset. Redeploy.

## 2. Run the automated check

On your computer (needs Node), from the project folder, with the same values in your terminal as environment variables plus `FIREBASE_API_KEY` (Firebase Console, Project settings, General, "Web API Key"):

```
node scripts/verify-billing-test-mode.mjs --check    # checks your settings only
node scripts/verify-billing-test-mode.mjs            # runs everything
```

It refuses to run with a live key. It creates one throwaway organization, drives it through every scenario below using Stripe test cards and a Stripe test clock, prints PASS or FAIL for each, and cleans up. **Every line must say PASS.**

| # | What it proves |
|---|---|
| 1 | A forged or unsigned webhook is refused |
| 2 | Checkout works and creates one Stripe customer per organization |
| 3 | Paying activates the plan through the webhook |
| 4 | A second checkout is refused; a stray second subscription is cancelled and recorded |
| 5 | Upgrade and downgrade update the same subscription; a downgrade that would not fit is refused; removing members then allows it; the member counter stays true |
| 6 | Cancel at period end, then ending, are reflected |
| 7 | After cancellation a new subscription can start |
| 8 | A failed renewal makes the organization past_due, keeps its plan, and blocks plan changes |
| 9 | Every Stripe event was recorded exactly once, none stuck |

## 3. Check by hand in the browser (10 minutes)

On the test deployment, sign up a fresh organization and:

1. Billing: choose Starter, pay with test card `4242 4242 4242 4242` (any future date, any CVC). You return to the app on Starter within a few seconds.
2. Team: invite 2 people (use the Starter limit of 3 including you). The "Invite Colleague" button disappears at 3.
3. Billing: Upgrade to Growth. The page says Unlimited seats. Invite more people; the button stays.
4. Billing: Manage Billing, set the card to `4000 0000 0000 0341` (always fails later) and cancel at period end. The page shows the end date.
5. In Stripe, replay one webhook event (Developers, Events, pick one, Resend). Nothing should change twice.

## 4. Fix anything that failed

Do not go on until everything passes. Stripe's dashboard (Developers, Webhooks) shows each delivery and its response, which usually says why.

## 5. Only then, enable live billing

1. Repeat step 1 in Stripe's **live** mode (live prices, live webhook endpoint pointing at your real address).
2. In Vercel (Production): set the live `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, the three live `STRIPE_PRICE_*`, `APP_URL`.
3. **Last of all**, set `ALLOW_LIVE_BILLING=true` and redeploy. Until this is set, the app refuses the live key, so a mistake cannot charge anyone.
4. Run one real purchase yourself on the cheapest plan, confirm it appears, then refund it in Stripe.

## Before the first release with these changes

Run `node scripts/reconcile-member-counts.mjs` (report only), then with `--fix`, so existing organizations start with correct member counters.
