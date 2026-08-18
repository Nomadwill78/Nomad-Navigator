import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleStripeWebhookEvent } from "../src/server/stripeAdmin";

// Stripe signature verification needs the exact raw bytes Stripe sent — if
// Vercel (or Express, locally) parses the body into JSON first, the bytes
// used to compute the signature no longer match and verification fails.
export const config = {
  api: {
    bodyParser: false,
  },
};

function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rawBody = await readRawBody(req);
  const { status, body } = await handleStripeWebhookEvent(rawBody, req.headers["stripe-signature"]);
  res.status(status).json(body);
}
