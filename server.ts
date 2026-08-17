import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore, FieldValue } from "firebase-admin/firestore";

// Mirrors PLAN_SEAT_LIMITS in types.ts — the single source of truth for seat
// limits per plan. Keep both in sync in the same commit.
const PLAN_SEAT_LIMITS: Record<string, number> = {
  trial: 8,
  starter: 3,
  growth: 8,
  pro: 20,
};

type OrgBillingStatus = "trialing" | "active" | "past_due" | "canceled";

function mapStripeStatus(status: Stripe.Subscription.Status): OrgBillingStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "incomplete":
    case "paused":
      return "past_due";
    default:
      // canceled, unpaid, incomplete_expired
      return "canceled";
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stripe initialization (Lazy)
  let stripe: Stripe | null = null;
  const getStripe = () => {
    if (!stripe) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error("STRIPE_SECRET_KEY is required");
      }
      stripe = new Stripe(key);
    }
    return stripe;
  };

  // Firebase Admin initialization (lazy). Needs a service-account key —
  // trusted server-side access that bypasses firestore.rules, which is what
  // lets the webhook write plan changes a client could never write itself.
  let adminReady = false;
  const getAdmin = () => {
    if (!adminReady) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!raw) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT is required");
      }
      if (getApps().length === 0) {
        initializeApp({ credential: cert(JSON.parse(raw)) });
      }
      adminReady = true;
    }
    return { auth: getAdminAuth(), db: getAdminFirestore() };
  };

  const priceIdForPlan = (plan: string): string | undefined => {
    if (plan === "starter") return process.env.STRIPE_PRICE_STARTER;
    if (plan === "growth") return process.env.STRIPE_PRICE_GROWTH;
    if (plan === "pro") return process.env.STRIPE_PRICE_PRO;
    return undefined;
  };

  const planForPriceId = (priceId: string | undefined): string | undefined => {
    if (!priceId) return undefined;
    if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
    if (priceId === process.env.STRIPE_PRICE_GROWTH) return "growth";
    if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
    return undefined;
  };

  /**
   * Verifies the caller's Firebase ID token and that they're an admin of
   * `orgId`, via the Admin SDK (bypasses firestore.rules — this check IS
   * the authorization for these endpoints). Throws "UNAUTHENTICATED" or
   * "FORBIDDEN" on failure.
   */
  const requireOrgAdmin = async (req: express.Request, orgId: string): Promise<string> => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new Error("UNAUTHENTICATED");

    const { auth, db } = getAdmin();
    const decoded = await auth.verifyIdToken(token).catch(() => null);
    if (!decoded) throw new Error("UNAUTHENTICATED");

    const memberSnap = await db.doc(`organizations/${orgId}/members/${decoded.uid}`).get();
    if (!memberSnap.exists || memberSnap.data()?.role !== "admin") {
      throw new Error("FORBIDDEN");
    }
    return decoded.uid;
  };

  const respondToAuthError = (error: any, res: express.Response): boolean => {
    if (error?.message === "UNAUTHENTICATED" || error?.message === "FORBIDDEN") {
      res.status(403).json({ error: "You must be an admin of this organization." });
      return true;
    }
    return false;
  };

  // Stripe webhook — MUST use the raw body for signature verification, and
  // MUST be registered before the global express.json() below, since Express
  // matches routes in registration order and a matched route's own body
  // parser wins over later global middleware.
  app.post(
    "/api/stripe-webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const signature = req.headers["stripe-signature"];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error("STRIPE_WEBHOOK_SECRET is not configured");
        res.status(500).send("Webhook not configured");
        return;
      }

      let event: Stripe.Event;
      try {
        event = getStripe().webhooks.constructEvent(req.body, signature as string, webhookSecret);
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
      }

      try {
        const { db } = getAdmin();

        // Subscription metadata (not the checkout session's) is what's
        // attached to every subsequent event for this subscription — set at
        // creation time in /api/create-subscription-checkout below.
        const upsertFromSubscription = async (subscription: Stripe.Subscription) => {
          const orgId = subscription.metadata?.orgId;
          if (!orgId) {
            console.error("Subscription has no orgId metadata:", subscription.id);
            return;
          }
          const priceId = subscription.items.data[0]?.price?.id;
          const plan = planForPriceId(priceId);
          if (!plan) {
            console.error("Could not map Stripe price to a plan:", priceId);
            return;
          }
          const periodEndSeconds = subscription.items.data[0]?.current_period_end;
          const customerId =
            typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

          await db.doc(`organizations/${orgId}/billing/subscription`).set(
            {
              plan,
              status: mapStripeStatus(subscription.status),
              seatLimit: PLAN_SEAT_LIMITS[plan],
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscription.id,
              currentPeriodEnd: periodEndSeconds ? new Date(periodEndSeconds * 1000).toISOString() : null,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        };

        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            if (session.mode === "subscription" && session.subscription) {
              const subscriptionId =
                typeof session.subscription === "string" ? session.subscription : session.subscription.id;
              const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
              await upsertFromSubscription(subscription);
            }
            break;
          }
          case "customer.subscription.updated": {
            await upsertFromSubscription(event.data.object as Stripe.Subscription);
            break;
          }
          case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            const orgId = subscription.metadata?.orgId;
            // Deliberately NOT touching seatLimit here — a canceled org keeps
            // its existing members rather than being abruptly locked out.
            if (orgId) {
              await db.doc(`organizations/${orgId}/billing/subscription`).set(
                { status: "canceled", updatedAt: FieldValue.serverTimestamp() },
                { merge: true }
              );
            }
            break;
          }
          default:
            break;
        }

        res.json({ received: true });
      } catch (err: any) {
        console.error("Webhook handler error:", err);
        res.status(500).json({ error: err.message });
      }
    }
  );

  app.use(express.json());

  // API Routes
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
      await requireOrgAdmin(req, orgId);

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
      await requireOrgAdmin(req, orgId);

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});
