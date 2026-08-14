# Nomad Compass — Full Product Walkthrough

*by Nomad Consulting · web app · React + Vite, Firebase auth, deployed on Vercel*
*(`nomad-navigator` is the repo/deploy name only — the product is always **Nomad Compass**.)*

---

## What it is, in one paragraph

Nomad Compass is a web dashboard for small-to-mid nonprofits that gives one place for the whole life of a grant: the impact numbers you collect, the grants those numbers have to satisfy, the subgrantees reporting up to you, and the funder-facing report that comes out the other end. The person it is built for is the **grant coordinator** — someone juggling several awarded grants with different KPI targets and reporting cadences, who has no analyst behind them and who will personally have to defend every number in front of a funder.

The organizing metaphor is a compass: sections are "bearings," the dashboard is the "Impact Overview," and the sign-in screen is a working compass rose.

---

## Part 1 — The screens, in the order a new user meets them

### 1. Free trial signup — `/free-trial`

A standalone public page. No login. Reached at `yoursite.com/free-trial` (or any URL with `?trial` on it). Everything else in the product is behind sign-in; this is the only page a stranger can see.

**What's on it**
- Compass mark, "NOMAD COMPASS / by Nomad Consulting"
- Eyebrow: **"Limited · 10 spots"**
- Headline: "Start your 30-day free trial"
- Four fields: **Full name**, **Work email**, **Organization** (all required), and **"What would you use it for?"** (optional free text)
- Submit button: "Request my free trial"
- Fine print: *"No card required · We'll only email you about the trial"*
- "← Back to sign in" link at the bottom

**What happens on submit**
The request is written to your Firestore database in the `trial_signups` collection, with `status: pending` and a timestamp. The card then flips to a confirmation state: a teal check, "You're on the list," and a line addressed to the person by first name confirming that if they're selected you'll email them at the address they gave. If the write fails, a red error banner appears and they can retry.

**Note:** this collects requests — it does not create an account. You review the list and invite people yourself.

---

### 2. Sign-in — the compass screen

Two panels.

**Left panel (the instrument).** The brand mark and name, then the pitch: *"Steer your mission by the numbers that matter."* Under it, three "bearings" laid out like compass readings:

| Bearing | Label | Line |
|---|---|---|
| N 000° | Impact | Lives improved, tracked program by program. |
| E 090° | Funding | Every dollar allocated, and visible. |
| W 270° | Direction | AI reads the data and points to your next step. |

Below that sits a hand-drawn SVG compass rose — a graduated degree ring with a tick every 5°, longest at the cardinals; a four-point engraved star; thin brass diagonal points; and a magnetic needle that animates and settles to true north when the page loads.

**Right panel (the sign-in cartouche).** A bordered card with brass corner brackets.
- First it offers two choices: **Continue with Google** or **Continue with email**.
- Choosing email swaps in a form: email address, password (minimum 6 characters), and a submit button that reads "Sign in" or "Create account" depending on mode. A "← All options" link goes back, and a footer line toggles between sign-in and register.
- Errors from Firebase (wrong password, email in use, etc.) appear in an inline red bar with an alert icon.
- Bottom of the card: a shield icon and *"Your impact data stays encrypted, always."*

Headings change with context — "Set your bearing / Welcome to Compass" on the choice screen, "Return to your chart / Sign in to your dashboard" for login, "Register your organization / Create your account" for signup.

---

### 3. Organization setup — the one-time step after first sign-in

If your account isn't attached to an organization yet, this screen blocks everything else.

- A teal badge at the top: **"Account Verified: your@email.org"**
- Heading: "Final Step: Setup your Organization"
- One field: **Organization Name** (e.g. "Global Health Partners")
- Two plan cards side by side:
  - **Standard Plan — $0/mo**, listing "AI Impact Reporting" and "Up to 8 users" (active/highlighted)
  - **Enterprise — Custom**, "Multi-organization management and dedicated support" (greyed out, not selectable)
- Big button: **"Launch Dashboard"** — which shows "Preparing Workspace…" with a spinner while it works
- Footer icons: "Shared Workspace" and "Organization Vault"

**What happens:** one atomic database transaction creates the organization, adds you as its first member with the **admin** role, and stamps your user profile with that organization's ID. From then on you go straight to the dashboard on sign-in.

---

### 4. The app shell — sidebar and header

Every signed-in screen sits inside the same frame.

**Sidebar** (collapsible between a wide 256px and a narrow 80px icon rail via the header's menu button):

| Item | Status |
|---|---|
| **Impact Overview** | The main dashboard |
| **Grant Tracking** | Awarded grants, KPIs, subgrantees |
| **Grant Discovery** | Matched funding opportunities |
| **Manage Data** | Data entry + CSV import |
| *— "Preview Features" divider —* | |
| **Analysis Deep Dive** | Pivot charts (flagged as preview) |
| **Demo Mode** | Toggle, not a page |
| **Team Management** | Only appears for roles that can manage the team |
| **Geographic Reach** | Placeholder — no screen behind it |
| **Financials** | Placeholder — no screen behind it |
| **Support Project** | Brass button → Stripe donation link |
| **Settings** (pinned to the bottom) | Placeholder — no screen behind it |

The active item gets a teal tint and a small brass bar on its left edge. **Manage Data grows a red "ALERT" chip** whenever your Data Quality level reads as low — the check treats the words *low, poor, warning, bad, critical, fail* as an alert, and if you've typed a number or percentage it alerts below 90. When the sidebar is collapsed, that alert becomes a pulsing red dot on the icon.

**Header** (sticky, translucent):
- Menu button (collapses/expands the sidebar)
- A "Search metrics…" box — **visual only, it does not search**
- **Connectivity pill**: teal "Online" with a pulsing dot, or brass **"Working Offline (Cached)"** when the browser loses its connection. This is live and reacts in real time.
- A red **"Not saving"** pill appears if a change can't be written to the database (permission denied, or no connection), with the reason on hover — a failed save is never silent.
- A teal **"Verified Data"** badge with a shield
- A notification bell with an unread dot — **visual only**
- Your display name, a **Sign Out** link, and a circular avatar with your first initial

---

### 5. Impact Overview — the main dashboard

The screen the product opens on, top to bottom.

**a) Page header.** Eyebrow "Bearing · Program Impact," headline **"Program Impact,"** and a subline "FY 2025 · Q1–Q2 · Updated today." On the right: **Export PDF** (only for roles allowed to export) and the brass **Generate Grant Report** button.

**a2) First-run state.** A brand-new organization starts genuinely empty — no sample numbers are ever seeded into a real org. Until you enter data you get a panel saying "No impact data yet," with two ways forward: **Add your data** (jumps to Manage Data) or **Try Demo Mode**.

**b) Theory of Change banner.** A single horizontal chain with arrows between the steps:

> **Input** `$132.5k Invested` → **Activity** `85 Water Systems Installed` → **Outcome** `47% Less Waterborne Illness` → **Impact** `Generational Health Equity`

The Input figure is computed from your total budget spent; the other three are text you write in Manage Data.

**c) Three headline stat cards**, each with an icon, a big number, a trend chip, a supporting line and a faint sparkline across the bottom:

1. **Program Outcomes** — households with sustained clean water access; sparkline of people served per month
2. **Cost Effectiveness** — cost per person, with "SROI: $4.50 social value per $1" underneath; sparkline of cost-per-person
3. **Data Quality** — your quality level (e.g. "High"), tagged "Verified," with the methodology beneath (e.g. "Mixed-methods RCT")

**d) Demographic Reach.** Two charts side by side:
- **Age Distribution** — a donut (Youth / Adults / Seniors) with percentage labels, your **total people served printed in the middle of the ring**, and a legend below
- **Race & Ethnicity** — a horizontal bar chart with the percentage printed at the end of each bar, captioned "Relative distribution percentage"

**e) Impact Trajectory.** A two-series area chart over your monthly program data: **Outcomes** (people served, teal) and **Efficiency $** (cost per person, brass), with a grid, legend, and hover tooltip. A 6M / 1Y / ALL toggle sits in the corner — **the toggle is decorative; it doesn't change the range.**

**f) Financial Health.** A pill in the corner shows "Reserve: 6 mo." Two donuts:
- **Spending Breakdown** — Program / Admin / Fundraising, with the program share printed in the center
- **Funding Diversity** — Foundation / Govt / Individual / Earned, likewise

Each donut has a small trend sparkline beneath it ("Total Spending Trend," "New Funding Trend").

**g) Service Areas.** A ranked list of neighborhoods, each with a percentage and a teal-to-brass progress bar. The corner reads "89% Urban Focus."

**h) Key Indicators rail** (right column, sticks as you scroll). Four tiles, each with a name, big value, a green "+X%" change chip, a mini sparkline, and a plain-English explanation under a help icon:
- **Active Users**
- **Donations Processed**
- **Volunteer Hours Logged**
- **Successful Program Completions**

All four are fully editable in Manage Data.

---

### 6. Grant Tracking

Two columns: a portfolio list on the left, the selected grant's detail on the right.

**Left — Active Portfolios.** One card per grant showing a status chip (active / pending / completed), the award size rounded to thousands, the grant name, the funder, the end date, and how many partners (subgrantees) it has. The selected card gets a teal ring. If you have no grants, you get an empty state: *"No grants tracked yet."*

**Top bar.** Export buttons for **PDF / CSV / JSON** (roles with export rights), and a brass **"New Tracking Goal"** button (roles with grant-edit rights) that creates a starter grant — $50,000, pending, one-year window, one placeholder KPI — and immediately selects it so you can edit it in place.

**Right — grant detail.**

*Header:* grant name, funder, and the start-to-end date range. There's an edit (pencil) icon for editors — **currently decorative; editing is done inline below.**

*Burn-rate panel — the most useful thing on this screen.* Two bars side by side:
- **Funds Spent** — dollars spent of dollars awarded, with the percentage. Editors get a small "$" input right underneath to update the spent figure, clamped between zero and the award.
- **Time Elapsed** — how far through the grant period today is, computed from the start and end dates.

Comparing the two produces a verdict chip and a plain-English analysis line:

| Condition | Verdict | Message |
|---|---|---|
| Spending runs >12 points ahead of time | **High Burn Rate** (red) | Funds are being spent significantly faster than time elapsed. |
| Spending runs >15 points behind time | **Underutilization Alert** (brass) | Risk of under-spending. |
| Otherwise | **On Track** (teal) | Burn rate matches timeline progress. |

*Two tabs below that:*

**General Performance** — every KPI on the grant as an editable row: the name, the current value, the target, and the unit are all inline text/number inputs that save as you type. Each row shows a status chip — **Target Met** (at or over 100%), **On Track** (50%+), or **Below Target** — a percentage, and a progress bar. "Add Metric" appends a new KPI; a trash icon (roles with delete rights, appears on hover) removes one.

**Subgrantee Metrics** — the partner layer. "New Subgrantee" adds a partner card with an editable name, an editable dollar allocation, and a status chip. Inside each partner card is its own nested set of KPIs with the same editable name / current / target / unit and its own progress bars, plus "Add Metric" and per-metric delete. This is what lets a partner's numbers roll up under the parent grant.

At the bottom of that tab sits a **Subgrantee Compliance** callout with a shield icon and a recommendation about requesting extra validation before the quarterly disbursement.

If no grant is selected, the right column shows an empty state: *"Grant & Partner Intelligence — select a portfolio to drill down."*

---

### 7. Grant Discovery

Headed **"AI Grant Discovery Radar"** with the line *"Nomad AI found these opportunities that match your mission profile and current KPI performance."*

**Opportunity cards** (main column), each showing:
- Opportunity name and funder
- A **Match Score** percentage with a small progress bar
- A two-line description of the funding program
- A **"Nomad AI Rationale"** box quoting why this opportunity fits your work
- **Potential** award amount and **Deadline**
- Category tags
- A **"Start AI Draft"** link

**Right rail:**
- **Strategy Intelligence** — a dark card predicting approval likelihood for your strongest program area, with "Top Funder" and "Market Trend" chips
- **Submission Readiness** — a three-item checklist (financial audit docs current; KPI verification above threshold; Theory of Change needs updating) and a **"Manage Compliance Vault"** button

**Be aware:** this screen is currently a *design of the feature, not the feature*. The opportunities, the match scores, the rationale text, the strategy card and the readiness checklist are all fixed sample content. The search box, "Refresh Scan," "Start AI Draft," and "Manage Compliance Vault" don't do anything yet. See Part 3.

---

### 8. Manage Data

Where the numbers behind the dashboard get entered. Everything here writes straight through to what you see on Impact Overview.

**a) Export bar.** CSV and JSON download of your metrics (roles with export rights). There's also a brass **"Save Changes"** button — cosmetic, since edits save the moment you type them.

**b) CSV Data Stream Integration** (roles with metric-edit rights). A full import pipeline:

1. **Drop zone** — drag a `.csv` file in or click to browse. Non-CSV files get rejected with a clear message. A **"Sample CSV"** button downloads a correctly-shaped example file so you can see the format.
2. **Header mapping** — the app reads your header row and *guesses* the mapping using fuzzy matching (a column called "Beneficiaries Served" or "Reach" or "Population" gets matched to People Served, "Budget"/"Expense"/"Spent" to Total Cost, and so on), then falls back to column order if it can't tell. You get five dropdowns to correct it: **Name\*, Month/Timeline, People Served\*, Total Cost Spent\*, Cost Per Person**. Leaving Cost Per Person unmapped makes the app calculate it (cost ÷ people).
3. **Import Strategy** — **Append** (add to what's there) or **Overwrite** (replace it).
4. **Preview** — a scrollable table showing the first 10 mapped rows with the total record count in the heading, so you can confirm the mapping before committing.
5. **Confirm & Stream Data** — stays disabled until name, people and cost are mapped. On success you get a green "Successfully imported N program metrics!" and the importer resets. "Cancel / Discard" backs out.

The parser handles quoted values, escaped quotes, commas inside fields, and both Windows and Unix line endings, and strips currency symbols and commas out of numbers.

**c) Manual field groups.** Every field has a hover tooltip explaining what belongs in it.

| Group | Fields |
|---|---|
| **Theory of Change & Impact** | Activities · Key Outputs · Key Outcomes · Ultimate Impact · SROI Ratio · Benchmark Comparison |
| **Beneficiary Data** | Total People Served · Disability % · Water Access Count · Health Improvements · Behavioral Gains |
| **Financial Metrics** | Total Budget Spent · Operating Reserve (months) · Avg Cost Per Person |
| **Verification & Methodology** | Quality Level · Methodology · Last Update |
| **Key Performance Indicators** | For each of the four dashboard KPIs: Current Value, Percentage Change, Brief Explanation |

Read-only roles see every field greyed out and locked.

**d) Data Entry Checklist** — a closing callout reminding you that a high-quality Grant Readiness Report depends on verified outcomes and efficiency ratios matching your internal audit documents.

---

### 9. Analysis Deep Dive *(marked "Preview Features")*

A pivot tool for cross-referencing your program data against your grant portfolio.

**Three controls across the top:**
- **Metric** — Impact / Cost / ROI
- **Dimension** — By Grant Portfolio · By Temporal Trend · By Funder Allocation
- **Chart type** — bar or area

**Below:** one large 400px chart that redraws for whatever combination you pick, then a row of up to four cards, one per data point, each showing its value and *"Contributes X% to total [metric]"* — and a closing **"Analysis Calibration"** note explaining that the analysis uses weighted aggregation of your grant metrics and program stats to find where marginal effort pays off before the next reporting cycle.

---

### 10. Team Management *(admins only)*

- **Seats Used** card: `N / 8` with a progress bar
- **Member table**: user (avatar + email, with "Active" or "Pending Invitation" beneath), role, status (green check "Verified" or a pulsing "Pending" dot), joined date, and a remove button
- Admins can change any member's role inline from a dropdown — except the organization's creator, who is protected. Admins also can't remove themselves or the creator. Removal asks for confirmation.
- **"Invite Colleague"** button (hidden once you hit 8 seats) opens a modal: an email field plus a grid of six role cards, each with a one-line description of what that role can do. It writes the invitation into the organization's member list.

Pending invitations appear in the same table with an "Awaiting sign-up" status and can be revoked. Seats count members **plus** pending invitations, so you can't over-invite. An admin cannot change their own role or the owner's — that's what guarantees an organization always keeps at least one administrator.

The table updates live — if another admin changes something, your screen reflects it without a refresh.

**How joining works:** the invitation is stored against the invitee's email address. When that person signs up (or signs in) with the same address and verifies it, a join card appears offering to add them to your organization at the role you picked. Accepting is one transaction: their membership, their profile, the seat count, and the consumed invitation all move together, so a half-joined member can't exist. Email verification is required because the match is made on email — without it, someone could sign up as a colleague and claim their seat.

**Six roles and what each can do:**

| Role | Manage team | Edit grants | Edit metrics | Delete | Export |
|---|:---:|:---:|:---:|:---:|:---:|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Grant Coordinator** | — | ✅ | — | — | ✅ |
| **Impact Analyst** | — | — | ✅ | — | ✅ |
| **Compliance Officer** | — | — | — | — | ✅ |
| **Data Entry** | — | — | ✅ | — | — |
| **Viewer** | — | — | — | — | — |

These permissions are enforced in two places: the UI (buttons and inputs don't render, or are disabled, for roles that lack the right) **and** the Firestore security rules, so bypassing the interface doesn't bypass the permission. `types.ts` is the authoritative definition; `firestore.rules` and `security_spec.md` follow it.

---

## Part 2 — Features that cut across screens

### The AI Impact Report

Triggered by **Generate Grant Report** on the dashboard. Opens a modal in three states:

**1. Pick a cadence** — four options matching how funders actually ask:
- **Weekly Impact** — fast operational highlights and immediate reach numbers
- **Monthly Summary** — program analysis and budget efficiency
- **Quarterly Audit** — grant-ready comprehensive analysis (the default)
- **Annual Review** — long-term strategic evaluation

**2. Generating** — a spinner with "Nomad AI is analyzing metrics… Processing [cadence] data points."

**3. The report** — rendered with real formatting: a title, section headings, bulleted and numbered lists, bold emphasis, and the **Grant Readiness** score pulled out into a highlighted teal pill.

Every report is built to the same eight-section structure:
1. Executive Summary
2. **Grant Readiness Assessment** — a score out of 100, the rationale behind it, and the top 3 barriers to institutional funding readiness
3. SWOT Analysis
4. Sector Benchmarks & Comparable Analysis
5. Outcomes & Effectiveness vs. targets
6. **Equity & Inclusion Audit** — performance across age, race, disability, and urban/rural reach
7. Financial Sustainability — program vs. admin ratios, funding diversity, liquidity
8. Forward-Looking Strategic Recommendations — 3 actions to raise the readiness score next cycle

**Two ways out:** **Copy Text** (turns into a "Copied!" confirmation for two seconds) or **Export PDF**, which produces a properly typeset A4 document — real heading hierarchy, teal bullet dots, numbered lists, automatic page breaks, and a running "Nomad Compass AI Impact Report" header with "Page X of Y" footers. Filename is date-stamped.

**How it's wired:** the browser sends your dashboard data to your own server route (`/api/generate-report`), which calls Google Gemini and returns the text. **The AI key lives on the server and never reaches the browser.** If no key is configured, the app says so plainly rather than failing silently.

### Demo Mode

A sidebar toggle that turns the whole product into a showcase without touching your real numbers.

- Swaps in a larger sample organization: bigger grants (a $1.5M solar program with its own subgrantee, a $500k water initiative), 54,200 people served, a $450k spend, an SROI of 5.2, and inflated platform KPIs
- Drops a floating banner: **"Demo Mode Active — Explore all features with pre-populated, verified impact data,"** dismissible with an X
- Adds brass hover tooltips to the main nav items and buttons, labelling what each one is: *"Core Dashboard View," "External Audit Tracking," "Real-time Metric Tuning," "Cross-Source Analytics," "Verified by AI," "Grant-Ready Markdown"*
- **Your own data is never overwritten** — demo data is held in memory only and every write is dropped while demo mode is on, so nothing you do in the demo can reach your organization's records. Turning it off resubscribes to your real data

### Exports — the full list

| Where | Formats | What you get |
|---|---|---|
| Dashboard | **PDF** | Multi-page audit report: executive overview, Theory of Change pathway, demographics, and every grant with a spend bar |
| Grant Tracking | **PDF** | Portfolio audit: aggregate spend tally, then each grant with funder, timeline, award, spend %, every KPI with achievement %, and every subgrantee allocation |
| Grant Tracking | **CSV / JSON** | Raw grant data |
| Manage Data | **CSV / JSON** | Raw metrics |
| Report modal | **PDF** | The written AI report |
| Manage Data | **Sample CSV** | A correctly-shaped template for import |

All PDFs carry Nomad Compass branding, a generation date, and page numbers.

### Where the data lives

Grants and metrics are stored per organization in Firestore:

```
organizations/{orgId}/grants/{grantId}      one document per grant
organizations/{orgId}/metrics/dashboard     one document, all dashboard metrics
```

Everyone in the organization reads the same documents in real time, so two people are never looking at different numbers. Isolation is structural rather than a matter of remembering to filter: org data is nested under the org, the organizations collection isn't listable, and every rule underneath is gated on membership — so a request for another org's data is refused by the database, not merely hidden by the interface.

Edits are debounced (about ⅔ of a second after you stop typing) and only what changed is written.

### Working offline

The app registers a service worker and keeps a per-organization copy of the last data the server sent. If the connection drops, the header pill switches to **"Working Offline (Cached)"** and the dashboard keeps working from that copy. The cache is a mirror, never the source of truth. This is deliberate: the product expects to be opened in places where the network isn't reliable.

### Support Project

The brass button at the bottom of the sidebar opens a hosted Stripe payment link for donations. Coming back with `?payment=success` or `?payment=cancel` on the URL shows a thank-you or cancellation message and cleans the URL.

---

## Part 3 — Honest status: what's real, what's sample, what's not built

This is here on purpose. The product's own principles say sample data must be unmistakably sample and unbuilt capability must never be dressed as working — so this section is part of the product description, not an appendix to it.

### Working end to end
- Firebase email + Google sign-in, user profiles, organization creation, live-syncing membership
- **Grants and metrics stored per organization in Firestore**, syncing live between team members
- **Team invitations with a working join flow**, gated on a verified email address
- Role-based permissions, enforced in the UI *and* in the database security rules
- Grant tracking: KPIs vs. targets, spend vs. award, burn-rate analysis, subgrantee breakdown
- The impact dashboard and every chart on it
- CSV import with mapping and preview
- AI report generation via a server-side Gemini key, with PDF export
- All PDF / CSV / JSON exports
- Offline caching and the online/offline indicator
- The public trial signup page writing to Firestore
- The Stripe donation link

### Sample data — none of it is real
There are **no customers**. Every organization, grant, funder, beneficiary count and outcome in the app is sample content — including the named foundations (Gates, World Bank, USAID, UNDP, Bloomberg, WHO) and the Memphis neighborhood breakdown. There are no testimonials, no press, no benchmarks and no third-party validation. The **"32% below sector avg"** benchmark is sample content, not a verified claim. Nothing here should ever be presented as a customer, case study, result, or usage statistic.

The header's data-status pill no longer claims "Verified" unconditionally — it now reads **"Demo Data"** in Demo Mode, **"Data Status: [level]"** once your organization has set a quality level, or **"Data Status: Not Set"** before that.

The only live commitment is the trial offer: **30 days free, first 10 nonprofits, no card required.**

### Not yet real — do not sell these as working
- **Grant Discovery has no matching engine.** The match scores and the "Nomad AI Rationale" text are fixed strings. Nothing computes them against your actual performance. (The intent — matching drawn from your own tracked outcomes — is the product's positioning, not its current behavior.) The screen now carries a persistent "Preview" disclosure banner, and "Start AI Draft" / "Manage Compliance Vault" are visibly disabled and labelled "Coming Soon" rather than clickable-but-inert.
- **Invitation emails are not sent.** The invitation itself is real and the join flow works end to end, but Nomad Compass doesn't mail it — the admin has to tell their colleague to sign up with that exact address. The Team screen says so plainly.
- **Placeholder navigation:** Geographic Reach, Financials, and Settings have no screens behind them. They're now shown disabled with a "Soon" badge instead of looking like live (but broken) links.
- **Analysis Deep Dive** carries a persistent on-screen "Preview feature" badge, not just a sidebar grouping.

### Fixed this pass
1. ~~Four callout boxes display literal `**` asterisks instead of bold text.~~ **Resolved** — real `<strong>` markup in Subgrantee Compliance, Data Entry Checklist, Analysis Calibration, and Strategy Intelligence.
2. ~~The two sample opportunities share the same ID.~~ **Resolved** — unique ids (`o1`/`o2`); the underlying array was also renamed `SAMPLE_OPPORTUNITIES` for consistency with the rest of the sample data.
3. ~~Analysis Deep Dive labels grant bars "Phase II"/"Sanitation" from hard-coded IDs.~~ **Resolved** — the chart label is now derived from each grant's own name.
4. ~~Decorative controls~~ (header search, notification bell, 6M/1Y/ALL toggles, grant edit pencil, "Save Changes" button). **Resolved**: header search and the bell were removed outright (nothing behind them); 6M/1Y/ALL now actually filters the Impact Trajectory chart; the grant edit pencil opens a real inline editor for name/funder/amount/status/dates; "Save Changes" was replaced with an "Autosaves as you type" indicator that matches what the app has actually done since the Firestore persistence fix.
5. ~~New grants start with realistic-looking placeholder data ($50,000, "Foundation Name," a starter KPI).~~ **Resolved** — a new grant now starts genuinely blank (name/funder empty, $0, no KPIs) and immediately opens the inline editor, so it can't be mistaken for real data.
6. ~~"New Tracking Goal" is confusing terminology.~~ **Resolved** — renamed "Add Grant."
7. ~~No guided path after signup / dashboard has no "what to do first."~~ **Resolved** — a "Complete Your Compass" checklist (Create organization → Add data → Track a grant → Generate a report) now shows on the dashboard until data and a grant both exist.
8. ~~"Updated today" and Demo Mode's "verified impact data" overclaim.~~ **Resolved** — the dashboard subline now reflects a real last-updated timestamp (or "No data entered yet"), and Demo Mode copy now says plainly "sample nonprofit data... nothing here is saved."
9. ~~The role model contradicts itself.~~ **Resolved:** the six-role model in `types.ts` is authoritative; the four-role draft has been retired from both the spec and the rules file.

### Still open
1. Several dashboard figures remain hard-coded rather than derived: the stat-card trend chips ("+12.5% vs target," "32% below avg") and "89% Urban Focus" under Service Areas. Fixing these needs a target/baseline data model that doesn't exist yet — left alone this pass rather than faked with a different hard-coded number.
2. The 8-member cap is enforced consistently from one constant (`SEAT_LIMIT`), but whether 8 is the intended commercial limit is a business decision for Nomad Consulting to confirm, not a code question. Don't state it publicly until decided.

---

## Part 4 — The design language, briefly

Dark navy ground ("ink" and "abyss"), parchment and ivory text, and two accent colors that carry meaning rather than decoration: **teal reads impact**, **brass reads money and governance**. Slate stays neutral. Charts follow the same rule, so a brass series is always financial and a teal series is always outcomes. Monospaced small caps with wide letter-spacing are used for labels and eyebrows, which is where the instrument/navigational feel comes from.

One accessibility note that matters more than usual here: the dashboard renders demographic data about vulnerable populations — age, race and ethnicity, gender including non-binary, and disability status. Those category labels carry real dignity stakes and are not neutral chart content.
