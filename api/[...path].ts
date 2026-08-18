// Catch-all Vercel Function for every /api/* route except /api/stripe-webhook
// (which has its own dedicated function — see api/stripe-webhook.ts — because
// it needs raw-body handling this shared Express app doesn't use). An Express
// app is itself a valid (req, res) request handler, so it can be exported
// directly as the function's default export.
import { createApiApp } from "../src/server/apiApp";

export default createApiApp();
