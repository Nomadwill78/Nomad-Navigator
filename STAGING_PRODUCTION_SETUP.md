# Nomad-Navigator staging and production setup

1. Create a separate Firebase staging project with its own Authentication, Firestore, and Storage configuration. Do not copy production user records.
2. Add the staging Firebase client fields and test Stripe/Gemini values to the Vercel Preview scope for the `staging` branch.
3. Add production Firebase client fields and live Stripe/Gemini values to Vercel Production for `main` only.
4. Register a staging Stripe webhook endpoint and store its separate signing secret in the Preview scope.
5. Use a dedicated Gemini key for staging with a low budget/limit; do not share the production AI key.
6. Validate staged sign-up, organization creation, report generation, test checkout, and webhook processing using synthetic test accounts before promoting to `main`.
