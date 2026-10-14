import Stripe from "stripe";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import {
  assertBillingAllowed, BillingError, processStripeEvent, priceIdForPlan as priceIdForPlanEnv, planForPriceId as planForPriceIdEnv,
  type BillingStore, type Env, type StripeEvent, type StripeLike,
} from "./billing";
import { createFirestoreBillingStore } from "./firestoreStores";
import firebaseConfig from "../../firebase-applet-config.json";

// Plan names, seat limits and the billing-status policy live in types.ts and src/lib/plans.ts, and the
// subscription rules in ./billing.ts. This file only connects them to the real Stripe and Firebase clients.

let stripe: Stripe | null = null;
export const getStripe = (): Stripe => {
  assertBillingAllowed(process.env); // refuses a live key until live billing has been deliberately switched on
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
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
  return { auth: getAdminAuth(), db: getAdminFirestore((firebaseConfig as any).firestoreDatabaseId) };
};

export const getBillingStore = (): BillingStore => createFirestoreBillingStore(getAdmin().db);

export const priceIdForPlan = (plan: string): string | undefined => priceIdForPlanEnv(plan, process.env);
export const planForPriceId = (priceId: string | undefined) => planForPriceIdEnv(priceId, process.env);

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

export interface WebhookDeps {
  env: Env;
  /** Checks Stripe's signature on the exact bytes received and returns the event. Throws when it is not genuine. */
  verify: (rawBody: Buffer, signature: string, secret: string) => StripeEvent;
  stripe: () => StripeLike;
  store: () => BillingStore;
}

const realWebhookDeps = (): WebhookDeps => ({
  env: process.env,
  verify: (rawBody, signature, secret) => getStripe().webhooks.constructEvent(rawBody, signature, secret) as unknown as StripeEvent,
  stripe: () => getStripe() as unknown as StripeLike,
  store: getBillingStore,
});

/**
 * Receives a Stripe webhook. In order: refuse while live billing is off, require a configured secret,
 * verify the signature (a missing or wrong one is a 400 and nothing else runs), then process the event
 * once (repeats are acknowledged and ignored; failures return 500 so Stripe retries).
 */
export async function handleStripeWebhookEvent(
  rawBody: Buffer,
  signatureHeader: string | string[] | undefined,
  deps: WebhookDeps = realWebhookDeps()
): Promise<WebhookResult> {
  try {
    assertBillingAllowed(deps.env);
  } catch (err) {
    const e = err as BillingError;
    return { status: e.httpStatus ?? 503, body: { error: e.message } };
  }

  const webhookSecret = deps.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return { status: 500, body: { error: "Webhook not configured" } };
  }

  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  if (!signature) return { status: 400, body: { error: "Webhook Error: missing Stripe signature" } };
  let event: StripeEvent;
  try {
    event = deps.verify(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return { status: 400, body: { error: `Webhook Error: ${err.message}` } };
  }

  try {
    const outcome = await processStripeEvent({ stripe: deps.stripe(), store: deps.store(), env: deps.env }, event);
    return { status: 200, body: { received: true, ...(outcome.duplicate ? { duplicate: true } : {}) } };
  } catch (err: any) {
    if (err instanceof BillingError && err.code === "IN_PROGRESS") return { status: 409, body: { error: err.message } };
    console.error("Webhook handler error:", err);
    return { status: 500, body: { error: err.message } };
  }
}
