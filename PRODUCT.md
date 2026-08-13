# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary user: the grant coordinator** — the development or grants lead at a small-to-mid nonprofit, juggling several awarded grants at once, each with its own KPI targets, reporting cadence, and in some cases subgrantees who report upward to them. They open Nomad Compass to keep reporting obligations from slipping: to see where each grant stands against target, and to produce what a funder is about to ask for.

They are not a data specialist and do not have an analyst behind them. The numbers in the system are numbers they entered or inherited, and they will personally have to defend them in front of a funder.

Other roles exist in the product (admin, impact analyst, compliance officer, data entry, viewer) but the grant coordinator is the user the product is designed around.

## Product Purpose

Nomad Compass gives a nonprofit one system for the entire life of a grant — tracking what has been awarded and how it is performing, and finding what to apply for next — so that impact data collected during a grant becomes the reporting that renews it.

Success is a grant coordinator who never scrambles before a funder deadline: the current state of every grant is visible without assembling it, and the report a funder wants can be produced from the same data rather than rebuilt in a document.

## Positioning

**The full grant lifecycle in one system.** Awarded grants, subgrantee KPIs rolling up to parent grants, and matched new funding opportunities live in the same place — tracking and discovery together, not two separate tools.

The consequence to protect: a coordinator should never have to re-enter or re-explain the same program data to move from "reporting on this grant" to "pursuing the next one." Opportunity matching is meant to draw on the organization's own tracked performance (`whyMatch` in the data model references the org's actual outcomes), which is what a discovery tool bolted on from outside could not truthfully claim.

## Operating Context

- Reporting runs on **funder-imposed cycles** — weekly, monthly, quarterly, and annual report frequencies are first-class in the product.
- Grants have a **hierarchy**: a grant may distribute money to subgrantees, who carry their own KPI targets that roll up to the parent grant's performance.
- Work is **multi-user within one organization**, with distinct roles and permissions; team members hold different rights to edit grants, edit metrics, delete, export, and manage the team.
- Output leaves the product regularly — **PDF export** of the dashboard and **generated written reports** are how the work reaches funders and boards.
- Connectivity is **not assumed**. The product tracks online/offline state, caches to `localStorage`, and registers a service worker, so it is expected to be opened in conditions where the network is unreliable.
- **Demo Mode** is a real operating mode with its own larger dataset and guided hints, used to show the product without touching an organization's own numbers.

## Capabilities and Constraints

**Working today**
- Firebase email auth, user profiles, organization creation and membership, all live in Firestore with real-time listeners.
- Role-based permissions defined in `types.ts` and enforced in the UI (`ROLE_PERMISSIONS`).
- Grant tracking with KPI targets vs. current values, spend against award, and subgrantee breakdown.
- Impact dashboard: demographics, geographic reach, financial health, theory of change, cost-per-person, SROI, data-quality level and method.
- AI-generated impact reports via Gemini, keyed **server-side** at `/api/generate-report` — no AI key reaches the browser.
- PDF export of the dashboard.
- Public trial-signup page at `/free-trial` writing to the `trial_signups` Firestore collection.
- Stripe-hosted payment link for donations (`Support Project`).

**Explicitly not yet real — do not design as if these work**
- **Grant Discovery has no matching engine.** `matchScore` and `whyMatch` are hard-coded strings in `MOCK_OPPORTUNITIES`; nothing computes them. The positioning above is the product's intent, not its current implementation.
- **Grants and metrics do not persist to Firestore.** They live in component state cached to `localStorage` under `nomad_compass_stats` / `nomad_compass_grants`, so they are per-browser, not per-organization, and are not shared between team members despite the multi-user model.
- Sidebar entries for **Geographic Reach, Financials, and Settings** are non-functional; **Analysis Deep Dive** sits under a "Preview Features" heading.
- Search, notifications, and the 6M/1Y/ALL chart range toggles are presentational only.

**Technical constraints**
- React 19 + Vite + TypeScript, Tailwind v4, Recharts, Firebase, Express server (`server.ts`), deployed on Vercel.
- Client-side view switching by state; there is no router. `/free-trial` is detected by reading `window.location.pathname`.
- Gemini access must stay server-side.

**Undecided / unconfirmed — record before relying on**
- Whether the **8-member cap per organization** in `security_spec.md` is a deliberate product constraint or an artifact. Not confirmed; do not present it as a product limit in any user-facing surface.
- **The role model contradicts itself.** `types.ts` defines six roles (admin, grant_coordinator, impact_analyst, compliance_officer, data_entry, viewer); `security_spec.md` defines four different ones (admin, editor, viewer, uploader). Which is authoritative is unresolved.
- Pricing beyond the free trial is undecided. No price, plan, or billing claim has been established.

## Brand Commitments

- The product name is **Nomad Compass**, presented as *by Nomad Consulting*. `nomad-navigator` is the repository and deploy name only and must not appear as the product name in any user-facing surface.
- The compass/navigation metaphor is already load-bearing in the product's own language ("Bearing", "Impact Overview", the compass mark) and in the name itself.

## Evidence on Hand

- **There are no customers.** Every organization, grant, funder, beneficiary count, and outcome in the codebase is sample data — including the named foundations (Gates, World Bank, USAID, UNDP, Bloomberg, WHO) and the Memphis neighborhood breakdown. None of it is real. Future work must never present any of it as a customer, case study, result, or usage statistic.
- **The trial offer is real and current**: a 30-day free trial opened to the first 10 nonprofits, no card required, collected at `/free-trial` into Firestore. This is a live commitment and its terms must be honored, not restated loosely.
- No testimonials, press, logos, benchmarks, or third-party validation exist. The "Verified Data" badge and "32% below sector avg" benchmark in the dashboard are sample content, not verified claims.
- Real assets on hand: the `BrandLogo` component, the trial signup flow, the Gemini report generator, and the Firestore security specification.

## Product Principles

1. **The funder is the real audience.** Every number on screen is something a coordinator may have to defend to someone holding a checkbook. Design so a claim can always be traced to its method and its recency, never so it merely looks impressive.
2. **Never inflate.** This product sells credibility to organizations whose funding depends on honest reporting. Sample data must be unmistakably sample; unbuilt capability must never be dressed as working; no fabricated proof, ever.
3. **One system, one entry.** Data a coordinator enters once should serve tracking, reporting, and discovery. Anything that makes them re-enter or re-explain the same program data breaks the core promise.
4. **Deadline pressure is the design condition.** The user arrives with a due date. Current state should be legible without assembly, and producing the deliverable should be a short path.
5. **Degrade honestly.** Offline, stale, low-quality, and unbuilt states are normal here — say so plainly rather than showing a confident surface over uncertain data.

## Accessibility & Inclusion

No product-specific standard has been established. Note that the product renders demographic data about vulnerable populations — age, race and ethnicity, gender including non-binary, and disability status — so category labels and their treatment carry real dignity stakes and are not neutral chart content.
