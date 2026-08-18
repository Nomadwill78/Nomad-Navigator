import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createApiApp } from "./src/server/apiApp";
import { handleStripeWebhookEvent } from "./src/server/stripeAdmin";

// Local dev only. In production this app is NOT deployed — Vercel serves the
// built static site directly and routes /api/* to the standalone functions
// in api/ (api/stripe-webhook.ts and api/[...path].ts), which share the same
// route logic via src/server/apiApp.ts and src/server/stripeAdmin.ts.
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stripe webhook — MUST use the raw body for signature verification, and
  // MUST be registered before createApiApp()'s express.json() below, since
  // Express matches routes in registration order and a matched route's own
  // body parser wins over later global middleware.
  app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const { status, body } = await handleStripeWebhookEvent(req.body, req.headers["stripe-signature"]);
    res.status(status).json(body);
  });

  app.use(createApiApp());

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
