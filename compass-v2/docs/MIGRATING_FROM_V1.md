# Bringing your data from Nomad Compass v1

Your v1 data is safe. **Nothing in this process changes v1.** Keep v1 running until you are happy with v2.

This guide moves your **grants, KPIs, subgrantees and monthly program results**. Donors, gifts and volunteers were not in v1, so they come in through spreadsheets (see [import-templates](../import-templates/README.md)).

## Before you start

You need Compass v2 installed in a Twenty workspace ([Setup guide](../SETUP.md)) and Node.js 24.5 or newer on the computer you are using.

## Step 1: Save your data from v1

In v1:

1. Open **Grant Tracking** and use **Export JSON**. Save the file as `nomad-compass-grants.json`.
2. Open **Data Management** and use **Export JSON**. Save the file as `nomad-compass-metrics.json`. This holds your monthly program results. It is optional.

Put both files in the `compass-v2` folder, next to `package.json`.

## Step 2: Make an API key in Twenty

An API key lets the import tool talk to Twenty on your behalf. Treat it like a password.

1. In Twenty open **Settings > MCP & APIs > API**.
2. Choose **Create key**, give it a name such as "v1 import", and copy the key somewhere safe. You only see it once.

When the import is finished, delete the key from the same screen.

## Step 3: Do a practice run first

A practice run checks everything and tells you what would happen. **It changes nothing.**

```bash
cd compass-v2
node scripts/import-v1.ts \
  --url https://YOUR-TWENTY-ADDRESS \
  --key YOUR_API_KEY \
  --grants nomad-compass-grants.json \
  --metrics nomad-compass-metrics.json \
  --year 2026 \
  --dry-run
```

Use the same address you sign in at. Set `--year` to the year your monthly results belong to (see "Months" below).

You will see something like:

```
DRY RUN. Nothing was changed. This is what would happen:
  Funders:         3 would be created, 0 already existed
  Grants:          8 would be created, 0 already existed (skipped)
  KPIs:            21 would be created
  ...
```

Read the "Things to look at" list at the end. Fix anything it mentions in v1 or note it for later.

## Step 4: Do the real import

Run the same command **without** `--dry-run`.

It is safe to run again. Grants and results that are already in Twenty are skipped, never duplicated.

## What changes on the way over

| In v1 | In v2 | Notes |
|---|---|---|
| Grant name, award, dates | Grant name, award amount, start and end date | Same values |
| Funder (typed text) | A **Company** record, linked to the grant | One company is made per funder name. If a company with that exact name already exists it is reused |
| Status *active* | **Active** | |
| Status *completed* | **Completed** | |
| Status *pending* | **Awarded, not started** | **Please check these.** In v1, "Pending" was what a new grant started as. It could mean an application or an award that has not started. The import lists every one so you can fix its status |
| Spent amount | Spent so far | |
| KPIs (name, target, current, unit) | KPIs on the grant | The v1 KPI status is recalculated using the same rules |
| Subgrantees and their KPIs | Subgrantees, with their KPIs linked to both the subgrantee and the grant | |
| Monthly results | Program results | Cost per person is recalculated, not copied |

## Things to do after importing

v2 asks for more detail than v1 did, because funders ask "how do you know?". Open **Grants and impact > Active grants** and look at each grant's **Data check**. Expect it to tell you:

- **No reporting frequency.** Set *Reporting frequency* and *Next report due* so you get reminders 14 days ahead.
- **KPI has no measurement date.** Fill in *Measured on* and *How it was measured*. v1 did not record these. KPIs measured more than 90 days ago are flagged on active grants.

None of this blocks anything. It is a to-do list.

## Months

v1 stored monthly results as "Jan", "Feb" with **no year**. The `--year` option decides which year to use. If you imported the wrong year, open **Grants and impact > Program results** and correct the **Month** on those records.

## What does not come over

These are v1 features that are not in v2 yet. They are listed honestly in [Known limits and next steps](KNOWN_LIMITS_AND_NEXT_STEPS.md).

- Demographic breakdowns, geographic reach, theory of change and SROI
- The PDF export of the dashboard
- Grant Discovery (in v1 it showed sample opportunities, not a real matching engine)
- User accounts, team invitations and Stripe billing. Twenty handles accounts and teams, so invite people there
- AI impact reports written by v1. Use **Draft funder report** on a grant instead

## If the import says something is wrong

| Message | What to do |
|---|---|
| "The API key was not accepted" | Make a new key and copy all of it |
| "That address does not have Nomad Compass installed" | Check the address, and that Compass is installed under **Settings > Applications** |
| "could not open the grants file" | Run the command from inside the `compass-v2` folder, or give the full path to the file |
| "is not a valid JSON file" | Use the file saved by v1's **Export JSON** button, not the CSV one |
| "... was skipped" lines | The import tells you which grant and why. Fix it in v1 and run again |
