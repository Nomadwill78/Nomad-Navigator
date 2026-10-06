# Nomad Compass v2

Grants, impact, donors, volunteers and donor cultivation in one place, with AI insights that show their evidence. By Nomad Consulting.

Version 1 tracked grants and their results. Version 2 keeps all of that and adds the people side of a nonprofit: donors, gifts, volunteers, and the relationships that lead to gifts.

> **Status: early preview (alpha).** Everything here is built and has passed 361 automated checks, but it has **not yet been installed on a live Twenty server**, because the environment it was built in could not run one. The first real install is the real test. See [Known limits and next steps](docs/KNOWN_LIMITS_AND_NEXT_STEPS.md) for exactly what is and is not proven.

## What it is

Nomad Compass v2 is an **app that runs inside [Twenty](https://twenty.com)**, an open-source CRM (a system for keeping track of people and organizations). Twenty provides the foundation: contacts, companies, tasks, notes, email and calendar, import and export, teams and permissions. Compass adds everything specific to a nonprofit.

You do not need to know how Twenty works to use Compass. The [setup guide](SETUP.md) walks through it.

## What you can do with it

**Fundraising**
- Keep every donor, prospect and gift in one place. Totals, first and last gift, and a **giving status** (new, active, at risk, lapsed, inactive) are worked out for you.
- Get a **thank-you reminder** within two days of every recent gift, with a personal-call reminder for larger gifts.
- Plan relationships with **cultivation plans** on a board: identify, qualify, cultivate, ask, steward. Each has an owner, a next step and a date, and a forecast value.
- See which donors are **at risk of lapsing** while there is still time to reach out.
- Track **campaigns** against their goals.

**Grants and impact** (everything from v1, carried forward)
- Track grants from prospect to completed, with funder, award, spending, reporting schedule and status.
- Track **KPIs** with a target, the result so far, when it was measured and how. Subgrantee KPIs roll up under the parent grant.
- See whether each grant is **on pace** by comparing KPI progress with the time that has passed.
- A **data check** on every grant lists problems before a funder finds them.
- **Reminders 14 days before a report is due**, and the next due date moves forward by itself when you record that you sent it.
- Monthly **program results** with cost per person.

**Volunteers**
- Volunteer status, skills, background-check dates (with expiry reminders), and **hours** with an approval step. Only approved hours are counted.

**AI insights that show their work**
- **AI donor insight**: a short read on a donor, a suggested next step and an ask amount, with the exact facts it relied on listed next to it.
- **Draft funder report**: a first draft built from a grant's real records. Where the records have no answer, the draft leaves a clear placeholder instead of inventing one.
- An assistant that knows how Compass works, so you can ask it "how do I record a pledge?"

**Built for people who are new to this**
- Sample data you can add and remove with one command, so you can look around safely.
- Four ready-made team roles, so a volunteer coordinator never sees what donors gave.
- Plain-English explanations on every field, and calculated fields are read-only so nobody types over a total.

## How the AI is kept honest

Nonprofits sell trust. These are rules the code enforces, not just wishes in a prompt:

1. **It only sees facts, never names.** The AI receives giving and engagement facts with no name, email, phone or address. The result is saved back onto the donor's own record.
2. **It cites its sources.** An insight with no stated basis is thrown away. The facts it relied on are saved next to it.
3. **Made-up numbers are flagged.** Every figure in AI text is checked against the record. Any figure that cannot be found is listed under "Check" so you see it before you rely on it.
4. **Suggested asks are capped** at five times the donor's largest past gift, and removed when there is no giving history.
5. **People's wishes are respected in code.** Someone marked *do not contact* never gets AI processing, reminders or messages. Someone marked *thank-yous only* never gets a suggested ask.
6. **The AI cannot touch your data.** The agents run under a role with no access to any record, so even hostile text typed into a note could not make it read or change anything.
7. **AI work is labeled.** Everything is marked as AI-written, and weekly automatic insights are **off** until you turn them on.

## What is in this folder

| Folder | What it holds |
|---|---|
| `src/objects`, `src/fields` | The data model: grants, KPIs, donations, campaigns, plans, volunteer hours, and the extra fields on People and Companies |
| `src/lib` | The rules, written as small testable pieces: KPI status, giving status, grant pace, reminders, AI guardrails |
| `src/services` | The automations that keep totals current and create reminders |
| `src/logic-functions` | Connects those automations to Twenty (what triggers each one) |
| `src/agents`, `src/skills` | The AI writers and the assistant's built-in knowledge |
| `src/views`, `src/navigation-menu-items`, `src/page-layouts` | The screens: saved lists, the sidebar, the home dashboard |
| `src/roles` | Team roles and the AI's no-data role |
| `scripts` | The tool that brings your v1 grants across |
| `import-templates` | Spreadsheet templates for importing donors, gifts and more |
| `docs` | Plain-English guides |

## Guides

- [Setup guide](SETUP.md): try it on your computer, then put it online
- [Bringing your data from v1](docs/MIGRATING_FROM_V1.md)
- [How the numbers are worked out](docs/HOW_THE_NUMBERS_WORK.md)
- [Connecting other tools](docs/CONNECTING_OTHER_TOOLS.md): Zapier, payment tools, website forms
- [Privacy, data and licensing](docs/PRIVACY_AND_LICENSING.md)
- [Known limits and next steps](docs/KNOWN_LIMITS_AND_NEXT_STEPS.md)
- [Importing from spreadsheets](import-templates/README.md)

## For developers

```bash
yarn install
yarn typecheck      # type check
yarn lint
yarn test:unit      # 361 tests, no server needed
yarn twenty dev:build   # builds and validates the whole app offline
```

`yarn test` runs the live tests in `src/__tests__/compass.integration-test.ts` against a running Twenty server (see [SETUP.md](SETUP.md)). Read [CLAUDE.md](CLAUDE.md) before changing anything: the permanent IDs rule matters.
