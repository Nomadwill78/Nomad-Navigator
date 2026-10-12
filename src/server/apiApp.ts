import express from "express";
import { timingSafeEqual } from "node:crypto";
import { getStripe, requireOrgAdmin, isAuthError, getAdmin, getBillingStore } from "./stripeAdmin";
import { runReminders, createMailer, createFirestoreReminderStore } from "./reminders";
import {
  BillingError, changePlan, createCheckout, resolveReturnBase, assertBillingAllowed,
  type BillingStore, type Env, type StripeLike,
} from "./billing";
import { MemberError, reconcileMemberCount, removeMemberAndRecount } from "./firestoreStores";

/** Everything the routes need from the outside world. Real by default; tests pass fakes. */
export interface ApiDeps {
  env: Env;
  stripe: () => StripeLike;
  store: () => BillingStore;
  requireOrgAdmin: (authHeader: string | string[] | undefined, orgId: string) => Promise<string>;
  removeMember: (args: { orgId: string; userId: string; requesterUid: string }) => Promise<{ memberCount: number }>;
  reconcileMembers: (orgId: string) => Promise<{ before: number | undefined; after: number }>;
}

const realDeps = (): ApiDeps => ({
  env: process.env,
  stripe: () => getStripe() as unknown as StripeLike,
  store: getBillingStore,
  requireOrgAdmin,
  removeMember: (args) => removeMemberAndRecount(getAdmin().db, args),
  reconcileMembers: (orgId) => reconcileMemberCount(getAdmin().db, orgId),
});

/** One place that turns a failure into the right HTTP answer with a plain-language message. */
function respondToError(error: any, res: express.Response, what: string): void {
  if (isAuthError(error)) {
    res.status(error.message === "UNAUTHENTICATED" ? 401 : 403).json({ error: error.message === "UNAUTHENTICATED" ? "Please sign in again." : "You must be an admin of this organization." });
    return;
  }
  if (error instanceof BillingError || error instanceof MemberError) {
    res.status(error.httpStatus).json({ error: error.message, code: error.code });
    return;
  }
  console.error(`${what} error:`, error);
  res.status(500).json({ error: "Something went wrong on our side. Please try again." });
}

/**
 * The JSON-in/JSON-out API routes, as a standalone Express app. Used both by the local dev server (mounted
 * inside server.ts's root app) and by the Vercel catch-all function (api/[...path].ts, exported directly as
 * the handler). It deliberately does NOT include the Stripe webhook route, which needs the raw request body
 * and is handled separately (see api/stripe-webhook.ts and stripeAdmin.ts's handleStripeWebhookEvent).
 */
export function createApiApp(overrides: Partial<ApiDeps> = {}): express.Express {
  const deps: ApiDeps = { ...realDeps(), ...overrides };
  const app = express();
  app.use(express.json());

  // A one-off donation. The amount is whole US cents, between $1 and $10,000.
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const raw = req.body?.amount;
      const amount = raw === undefined ? 2500 : Number(raw);
      if (!Number.isInteger(amount) || amount < 100 || amount > 1_000_000) {
        res.status(400).json({ error: "Donation amount must be between $1.00 and $10,000.00." });
        return;
      }
      assertBillingAllowed(deps.env);
      const base = resolveReturnBase(req.headers.origin as string | undefined, deps.env);
      const session = await deps.stripe().checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Nomad Compass - Impact Donation",
                description: "Support nonprofit impact tracking and reporting.",
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${base}/?payment=success`,
        cancel_url: `${base}/?payment=cancel`,
      });
      res.json({ url: session.url });
    } catch (error: any) {
      respondToError(error, res, "Donation checkout");
    }
  });

  // Starts a subscription for an org that does NOT have one. The caller must be an admin of that org, verified
  // server-side. An org that already has a live subscription is refused (use /api/change-plan), so an organization
  // can never end up with two.
  app.post("/api/create-subscription-checkout", async (req, res) => {
    try {
      const { orgId, plan } = req.body as { orgId?: string; plan?: string };
      if (!orgId || !plan) {
        res.status(400).json({ error: "orgId and a plan (starter, growth or pro) are required." });
        return;
      }
      await deps.requireOrgAdmin(req.headers.authorization, orgId);
      res.json(await createCheckout({ stripe: deps.stripe(), store: deps.store(), env: deps.env }, { orgId, plan, origin: req.headers.origin as string | undefined }));
    } catch (error: any) {
      respondToError(error, res, "Create subscription checkout");
    }
  });

  // Moves an org's EXISTING subscription to another plan (upgrade or downgrade), with proration.
  app.post("/api/change-plan", async (req, res) => {
    try {
      const { orgId, plan } = req.body as { orgId?: string; plan?: string };
      if (!orgId || !plan) {
        res.status(400).json({ error: "orgId and a plan (starter, growth or pro) are required." });
        return;
      }
      await deps.requireOrgAdmin(req.headers.authorization, orgId);
      res.json(await changePlan({ stripe: deps.stripe(), store: deps.store(), env: deps.env }, { orgId, plan }));
    } catch (error: any) {
      respondToError(error, res, "Change plan");
    }
  });

  // Opens Stripe's hosted Billing Portal for an org's existing customer: cancellation, payment-method updates
  // and invoice history all happen there.
  app.post("/api/create-portal-session", async (req, res) => {
    try {
      const { orgId } = req.body as { orgId?: string };
      if (!orgId) {
        res.status(400).json({ error: "orgId is required" });
        return;
      }
      await deps.requireOrgAdmin(req.headers.authorization, orgId);
      assertBillingAllowed(deps.env);
      const customerId = (await deps.store().getBilling(orgId))?.stripeCustomerId;
      if (!customerId) {
        res.status(400).json({ error: "This organization doesn't have a billing account yet." });
        return;
      }
      const base = resolveReturnBase(req.headers.origin as string | undefined, deps.env);
      const portal = await (getStripe() as any).billingPortal.sessions.create({ customer: customerId, return_url: `${base}/` });
      res.json({ url: portal.url });
    } catch (error: any) {
      respondToError(error, res, "Create portal session");
    }
  });

  // Removes a member and sets the member counter to the true count in one transaction. Browsers cannot do this
  // themselves (the database rules refuse it), which is what keeps the counter honest.
  app.post("/api/remove-member", async (req, res) => {
    try {
      const { orgId, userId } = req.body as { orgId?: string; userId?: string };
      if (!orgId || !userId) {
        res.status(400).json({ error: "orgId and userId are required." });
        return;
      }
      const requesterUid = await deps.requireOrgAdmin(req.headers.authorization, orgId);
      res.json(await deps.removeMember({ orgId, userId, requesterUid }));
    } catch (error: any) {
      respondToError(error, res, "Remove member");
    }
  });

  // Puts the member counter right if it was ever wrong. Admin only; safe to call at any time.
  app.post("/api/reconcile-members", async (req, res) => {
    try {
      const { orgId } = req.body as { orgId?: string };
      if (!orgId) {
        res.status(400).json({ error: "orgId is required." });
        return;
      }
      await deps.requireOrgAdmin(req.headers.authorization, orgId);
      res.json(await deps.reconcileMembers(orgId));
    } catch (error: any) {
      respondToError(error, res, "Reconcile members");
    }
  });

  // Daily reminder job (Vercel Cron calls this; see vercel.json). Vercel sends
  // "Authorization: Bearer <CRON_SECRET>" automatically when CRON_SECRET is set.
  // Without that secret the route refuses to run at all, so it can never be triggered by a stranger.
  // Add ?dryRun=1 to see who WOULD be emailed without sending or recording anything.
  app.get("/api/send-reminders", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      res.status(503).json({ error: "CRON_SECRET is not set, so reminders are switched off." });
      return;
    }
    const given = Buffer.from(String(req.headers.authorization ?? ""));
    const want = Buffer.from(`Bearer ${secret}`);
    if (given.length !== want.length || !timingSafeEqual(given, want)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const dryRun = req.query.dryRun === "1" || req.query.dryRun === "true";
      const { db } = getAdmin();
      const summary = await runReminders({
        store: createFirestoreReminderStore(db),
        mailer: dryRun ? { send: async () => {} } : createMailer(process.env),
        today: new Date().toISOString().slice(0, 10),
        dryRun,
        appUrl: process.env.APP_URL,
      });
      res.status(summary.failed > 0 ? 207 : 200).json(summary);
    } catch (error: any) {
      console.error("Reminder run failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return app;
}
