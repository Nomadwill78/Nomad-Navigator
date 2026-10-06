# Known limits and next steps

Honest accounting of what is proven, what is not, and what comes next.

## What is proven

- **The app builds and validates.** `yarn twenty dev:build` produces a complete Twenty app: 8 new record types and 132 fields in all (including the links between records and the fields added to People and Companies), 15 background automations and tools, 14 saved views, a home dashboard, 4 team roles plus 2 system roles, 2 AI agents and 5 assistant skills.
- **The rules are tested.** 359 automated tests check the calculations (KPI status, giving status, pace, reminders, rounding, dates), the automations running against a stand-in for Twenty, the AI guardrails, the importer, and the whole app's internal consistency: every view points at fields that exist on its object, every filter is one Twenty allows for that field type, every relation has two matching sides, every sidebar link leads somewhere, and the AI roles can read nothing.
- **The import tool runs.** It was executed for real under Node 24 against a local server.
- **Mistakes are caught.** Several tests were checked by deliberately breaking something and confirming the test failed.

## What is NOT proven

**Compass has never been installed on a live Twenty server.** The place it was built had no way to run one. So these are assumptions, written from Twenty's documentation and source, that only a real install can confirm:

1. **Twenty accepts the app as a whole.** The offline build checks each piece, not the server's final acceptance.
2. **The automations receive the events and fields they expect.** They assume change events carry the linked record IDs (such as which donor a gift belongs to), and that Twenty's API accepts the queries Compass sends.
3. **Reminders are created as expected.** They assume the format Twenty's Task and Task link records accept.
4. **The AI agents work under a no-access role** and return JSON as asked. If Twenty refuses an agent with no permissions, the fix is one line in `src/agents`.
5. **The dashboard widgets render** with the filters given.
6. **Roles hide the right fields.** Field-level hiding should be tested by signing in as each role.

The live tests in `src/__tests__/compass.integration-test.ts` were written to check these. **Run them first** ([Setup guide](../SETUP.md), "Running the live tests"). A failure there is useful: it names the exact thing to adjust.

## Limits to know about

- **Calculated fields are locked on screen, not in the database.** Someone with API access could change one. Nightly recalculation repairs donor giving figures and active-grant figures; other totals correct themselves the next time a related record changes.
- **Totals are in one currency.** Gifts in another currency are recorded but not added in. Each donor's count of skipped gifts is not yet shown on screen.
- **One person, one email.** There is no household or family grouping yet.
- **Large databases.** A single nightly run reads up to 20,000 donations. Beyond that it still works on what it read but a larger batch size is needed.
- **AI runs one at a time** and the weekly batch stops at the first failure to protect your credits.
- **Reminders go to the whole team**, not to a named person. Assigning reminders to the relationship manager is a next step.
- **Dates are calendar dates in UTC.** Around midnight, "today" may differ by a day from your local date.
- **Twenty's AI agents are in alpha** (Twenty's word). They may change between Twenty versions. Compass pins its tools to version 2.45.

## Not carried over from v1

| v1 feature | Status in v2 |
|---|---|
| Grants, KPIs, subgrantee roll-up | **Carried over** and extended |
| Monthly program results, cost per person | **Carried over** |
| AI impact reports | **Replaced** by Draft funder report, which is stricter about not inventing facts |
| Demographic breakdowns, geographic reach, financial breakdown | Not yet. Needs careful design: these are sensitive categories of people |
| Theory of change, SROI, benchmark comparison | Not yet. v1's benchmark was sample content, not a verified claim |
| PDF export of the dashboard | Not yet. Twenty can export lists as CSV and print dashboards |
| Grant Discovery | Not carried over. In v1 it showed sample opportunities with hard-coded scores; no matching engine existed |
| Accounts, team invitations, roles | **Handled by Twenty** and the four Compass roles |
| Stripe subscription billing, free-trial signup | Not applicable here. Twenty Cloud has its own billing. Decide how to charge if you sell Compass |
| Offline use | Not available. Twenty needs a connection |

## Suggested next steps, in order

1. **Install it and run the live tests.** Fix anything they find. This is the most important step.
2. **Run a pilot with your own data**: your real grants (via the v1 import), 20 to 50 donors, one campaign. Watch for confusing labels.
3. **Decide the sample-data policy for demos**: the sample data is ready for sales demos.
4. **Assign reminders to people**: use the cultivation plan's relationship manager.
5. **Email**: connect a mailbox in Twenty so conversations appear on donor records, then log *last contact*.
6. **Events and volunteer shifts**: sign-ups and capacity, not just hours.
7. **Giving history charts per donor, and year-end tax receipts**: receipts have legal requirements, so start from your accountant's wording.
8. **Port the sensitive v1 reports** (demographics, geography) once you have decided exactly how those categories should be handled and who may see them.
9. **Decide how Compass is sold, if it will be**: see the licensing page.
