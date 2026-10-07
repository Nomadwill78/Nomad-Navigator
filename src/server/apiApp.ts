import express from "express";
import { timingSafeEqual } from "node:crypto";
import { getStripe, priceIdForPlan, requireOrgAdmin, isAuthError, getAdmin } from "./stripeAdmin";
import { runReminders, createResendMailer, createFirestoreReminderStore } from "./reminders";

const respondToAuthError = (error: any, res: express.Response): boolean => {
  if (isAuthError(error)) {
    res.status(403).json({ error: "You must be an admin of this organization." });
    return true;
  }
  return false;
};

/**
 * The three JSON-in/JSON-out API routes, as a standalone Express app. Used
 * both by the local dev server (mounted inside server.ts's root app) and by
 * the Vercel catch-all function (api/[...path].ts, exported directly as the
 * handler) — deliberately does NOT include the Stripe webhook route, which
 * needs the raw request body and is handled separately (see
 * api/stripe-webhook.ts and stripeAdmin.ts's handleStripeWebhookEvent).
 */
export function createApiApp(): express.Express {
  const app = express();
  app.use(express.json());

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const stripeInstance = getStripe();
      const session = await stripeInstance.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Nomad Compass - Impact Donation",
                description: "Support nonprofit impact tracking and reporting.",
              },
              unit_amount: req.body.amount || 2500, // Default to $25.00
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.origin}/?payment=success`,
        cancel_url: `${req.headers.origin}/?payment=cancel`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Starts (or restarts) a subscription for an org's chosen plan. The
  // caller must be an admin of that org — verified server-side, since a
  // client can't be trusted to only ever pass their own orgId.
  app.post("/api/create-subscription-checkout", async (req, res) => {
    try {
      const { orgId, plan } = req.body as { orgId?: string; plan?: string };
      if (!orgId || !plan || !["starter", "growth", "pro"].includes(plan)) {
        res.status(400).json({ error: "orgId and a valid plan (starter/growth/pro) are required" });
        return;
      }
      await requireOrgAdmin(req.headers.authorization, orgId);

      const priceId = priceIdForPlan(plan);
      if (!priceId) {
        res.status(500).json({ error: `No Stripe price is configured for the "${plan}" plan yet.` });
        return;
      }

      const stripeInstance = getStripe();
      const session = await stripeInstance.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: orgId,
        // Metadata on the subscription (not just this session) so every
        // later webhook event for it still carries the orgId.
        subscription_data: { metadata: { orgId, plan } },
        success_url: `${req.headers.origin}/?checkout=success`,
        cancel_url: `${req.headers.origin}/?checkout=cancel`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      if (respondToAuthError(error, res)) return;
      console.error("Create subscription checkout error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Opens Stripe's hosted Billing Portal for an org's existing subscription
  // — cancellation, payment-method updates, and invoice history all happen
  // there, so none of it needs to be built here.
  app.post("/api/create-portal-session", async (req, res) => {
    try {
      const { orgId } = req.body as { orgId?: string };
      if (!orgId) {
        res.status(400).json({ error: "orgId is required" });
        return;
      }
      await requireOrgAdmin(req.headers.authorization, orgId);

      const { db } = getAdmin();
      const billingSnap = await db.doc(`organizations/${orgId}/billing/subscription`).get();
      const customerId = billingSnap.data()?.stripeCustomerId as string | undefined;
      if (!customerId) {
        res.status(400).json({ error: "This organization doesn't have a billing account yet." });
        return;
      }

      const stripeInstance = getStripe();
      const portalSession = await stripeInstance.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${req.headers.origin}/`,
      });

      res.json({ url: portalSession.url });
    } catch (error: any) {
      if (respondToAuthError(error, res)) return;
      console.error("Create portal session error:", error);
      res.status(500).json({ error: error.message });
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
        mailer: dryRun ? { send: async () => {} } : createResendMailer(process.env),
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
