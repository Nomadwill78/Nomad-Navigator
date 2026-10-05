import Stripe from "stripe";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore, FieldValue } from "firebase-admin/firestore";

// Keep server-side billing entitlements aligned with the authoritative plan model.
// null means unlimited seats.
const PLAN_SEAT_LIMITS: Record<string, number | null> = {
  trial: 8,
  starter: 3,
  growth: null,
  pro: 20,
};

type OrgBillingStatus = "trialing" | "active" | "past_due" | "canceled";

function mapStripeStatus(status: Stripe.Subscription.Status): OrgBillingStatus {
  switch (status) {
    case "active": return "active";
    case "trialing": return "trialing";
    case "past_due":
    case "incomplete":
    case "paused": return "past_due";
    default: return "canceled";
  }
}

let stripe: Stripe | null = null;
export const getStripe = (): Stripe => {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is required");
    stripe = new Stripe(key);
  }
  return stripe;
};

let adminReady = false;
export const getAdmin = () => {
  if (!adminReady) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is required");
    if (getApps().length === 0) initializeApp({ credential: cert(JSON.parse(raw)) });
    adminReady = true;
  }
  return { auth: getAdminAuth(), db: getAdminFirestore() };
};

export const priceIdForPlan = (plan: string): string | undefined => {
  if (plan === "starter") return process.env.STRIPE_PRICE_STARTER;
  if (plan === "growth") return process.env.STRIPE_PRICE_GROWTH;
  if (plan === "pro") return process.env.STRIPE_PRICE_PRO;
  return undefined;
};

export const planForPriceId = (priceId: string | undefined): string | undefined => {
  if (!priceId) return undefined;
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_GROWTH) return "growth";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return undefined;
};

export const requireOrgAdmin = async (
  authHeader: string | string[] | undefined,
  orgId: string
): Promise<string> => {
  const header = Array.isArray(authHeader) ? authHeader[0] : authHeader || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new Error("UNAUTHENTICATED");
  const { auth, db } = getAdmin();
  const decoded = await auth.verifyIdToken(token).catch(() => null);
  if (!decoded) throw new Error("UNAUTHENTICATED");
  const memberSnap = await db.doc(`organizations/${orgId}/members/${decoded.uid}`).get();
  if (!memberSnap.exists || memberSnap.data()?.role !== "admin") throw new Error("FORBIDDEN");
  return decoded.uid;
};

export const isAuthError = (error: any): boolean =>
  error?.message === "UNAUTHENTICATED" || error?.message === "FORBIDDEN";

export interface WebhookResult { status: number; body: Record<string, unknown>; }

export async function handleStripeWebhookEvent(
  rawBody: Buffer,
  signatureHeader: string | string[] | undefined
): Promise<WebhookResult> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return { status: 500, body: { error: "Webhook not configured" } };
  }

  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature as string, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return { status: 400, body: { error: `Webhook Error: ${err.message}` } };
  }

  try {
    const { db } = getAdmin();

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
      const customerId = typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

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
          const subscriptionId = typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
          await upsertFromSubscription(subscription);
        }
        break;
      }
      case "customer.subscription.updated":
        await upsertFromSubscription(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.orgId;
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

    return { status: 200, body: { received: true } };
  } catch (err: any) {
    console.error("Webhook handler error:", err);
    return { status: 500, body: { error: err.message } };
  }
}
