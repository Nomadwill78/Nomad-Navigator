# Setup guide

This guide has two parts:

1. **Try it on your own computer** (about 20 minutes). Nothing goes online and nothing real is at risk. Do this first.
2. **Put it online for your team.** Pick this up when you are happy with what you saw.

Everything below follows Twenty's own documentation for version 2.45. It was written without being able to run Twenty in the place it was built, so **the first time you follow it is the real test.** If any step gives an error, copy the exact message and ask for help. That is expected for a first install, not a sign you did something wrong.

## Words you will see

- **Terminal**: the window where you type commands. On a Mac it is the *Terminal* app. On Windows use *PowerShell*.
- **Twenty**: the CRM that Compass runs inside.
- **Workspace**: your organization's private space inside Twenty.
- **Docker**: a free program that runs Twenty on your computer without installing a database yourself.

---

## Part 1: Try it on your computer

### What to install first (once)

1. **Docker Desktop**: <https://www.docker.com/products/docker-desktop/>. Install it, open it, and leave it running.
2. **Node.js 24.5 or newer**: <https://nodejs.org/>. Choose the version marked *LTS* or *Current* that is 24.5 or higher.
3. **Git**: <https://git-scm.com/downloads>.

To check, open your terminal and type each line. Each should print a version number:

```bash
docker --version
node --version     # must say v24.5 or higher
git --version
```

### Get Compass and start it

```bash
git clone https://github.com/nomadwill78/nomad-navigator.git
cd nomad-navigator/compass-v2

corepack enable
yarn install

yarn twenty docker:start
```

`yarn twenty docker:start` downloads and starts a private copy of Twenty on your computer. The first time can take several minutes. When it finishes, run:

```bash
yarn twenty docker:status
```

It shows the address (normally <http://localhost:2020>) and the practice login. Twenty's documentation lists the development login as `tim@apple.dev` with the password `tim@apple.dev`.

### Add Compass to it

```bash
yarn twenty dev
```

Leave this window open. It sends Compass to your practice Twenty and keeps it updated. You will see progress messages; wait for it to settle.

Now open <http://localhost:2020> in your browser and sign in.

### Look around (5 minutes)

1. Press **Cmd+K** (Mac) or **Ctrl+K** (Windows) to open the command menu.
2. Type **Add sample data** and press Enter, then confirm. Give it a minute.
3. In the left sidebar you will now see **Compass home**, **Fundraising**, **Grants and impact** and **Volunteers**.
4. Open **Compass home** for the dashboard. Open **Fundraising > Donors**, then click a donor to see their giving status and totals.
5. Open **Grants and impact > Active grants**. Click *Clean Water Initiative* and look at *Pace* and *Data check*.
6. When you are done, **Cmd+K > Remove sample data**. Only the labeled sample records go. Your own records are never touched.

Every sample record has **(SAMPLE)** in its name, and every sample email ends in `.invalid`, which can never receive mail.

### Turn on the AI (optional)

The **AI donor insight** and **Draft funder report** buttons, and the assistant, need an AI provider connected to Twenty.

- **On your own computer or your own server (self-hosted):** Twenty needs an API key from an AI company. Twenty supports OpenAI, Anthropic, Google, Mistral and xAI. Add the key in Twenty under **Settings > Admin Panel > Configuration Variables** (for example `ANTHROPIC_API_KEY`), then check **Settings > Admin Panel > AI**. AI companies charge for what you use. Your giving facts (never names or contact details) are sent to the company you choose.
- **On Twenty Cloud (hosted by Twenty):** the AI runs on Twenty's own accounts and uses credits from your plan. You cannot bring your own key there. Choose models under **Settings > AI**.

Then open any donor and look for the **AI insight** button at the top right, or open a grant and choose **Draft report**.

### Stop and start

```bash
yarn twenty docker:stop      # stop (your practice data is kept)
yarn twenty docker:start     # start again
yarn twenty docker:reset     # wipe the practice copy and start fresh
```

---

## Part 2: Put it online for your team

You need a Twenty that is on the internet, then Compass added to it. There are two ways to get Twenty online.

| | **Twenty Cloud** | **Host it yourself** |
|---|---|---|
| Who runs it | Twenty | You (or someone you hire) |
| Effort | Lowest | Highest: a server, backups, updates, security |
| AI | Uses Twenty's accounts and your plan's credits | Your own AI key |
| Cost | A Twenty plan: see <https://twenty.com/pricing> for current prices | A server plus any AI usage |

**For a small team that is new to this, start with Twenty Cloud.** You can move to your own server later.

### Step 1: Get a Twenty workspace

- **Twenty Cloud:** create an account at <https://twenty.com> and make a workspace for your organization.
- **Self-hosted:** follow Twenty's guide at <https://docs.twenty.com/developers/self-host/self-host>. Plan for backups from day one.

### Step 2: Tell Compass where your workspace is

Use the address you sign in at.

```bash
cd nomad-navigator/compass-v2
yarn twenty remote:add --url https://YOUR-WORKSPACE-ADDRESS --as production
```

A browser window opens. Sign in and click **Authorize**.

### Step 3: Send Compass to your workspace

```bash
yarn twenty app:publish --private --remote production
```

Then in Twenty open **Settings > Applications**, find **Nomad Compass**, and install it. (You can also run `yarn twenty app:install --remote production`.) Twenty's documentation calls this a *tarball deploy*. It keeps Compass private to you.

When you later change the app, raise the `version` number in `package.json` and run the same command again. Twenty refuses to publish the same version twice.

### Step 4: Set it up for your team

1. **Settings > Applications > Nomad Compass:** review the settings. Every one has a safe default.
   - *Currency used for totals* (default USD)
   - *Gift size that earns a personal thank-you call* (default 1000)
   - *Write AI donor insights automatically every Monday* (**off** by default)
   - *Most AI insights to write each Monday* (default 20)
   - *Let AI read staff-written plan and grant text* (**off** by default)
2. **Settings > Members > Roles:** give each person the role that fits.

   | Role | Who it is for | What they cannot do |
   |---|---|---|
   | **Compass: Fundraiser** | Development staff | Cannot change grants |
   | **Compass: Grants manager** | Whoever reports to funders | Cannot see donors' giving history or AI insights about donors |
   | **Compass: Volunteer coordinator** | Volunteer program lead | Cannot see gifts or any giving history |
   | **Compass: Board viewer** | Board members | Cannot change or export anything, and cannot see individual donors, gifts or volunteers |

   Twenty's own *Admin* role can do everything. Keep it for one or two people.
3. **Bring your data in:**
   - Grants from v1: [Bringing your data from v1](docs/MIGRATING_FROM_V1.md)
   - Donors, gifts and volunteers from spreadsheets: [import-templates](import-templates/README.md)
   - Gifts that arrive from a payment tool or form: [Connecting other tools](docs/CONNECTING_OTHER_TOOLS.md)

### Step 5: First week checklist

- [ ] Add one real grant with a KPI. Fill in the *Measured on* date and *How it was measured*. Check that *Data check* says "No problems found."
- [ ] Add one real gift. Within a minute, check the donor's totals and that a thank-you task appeared (the gift must be dated within the last 14 days).
- [ ] Mark one person *Do not contact* and confirm no reminders appear for them.
- [ ] Try **AI donor insight** on one donor. Read the *based on* note. Compare it to the donor's record.
- [ ] Ask the assistant: "How do I record a pledge in Nomad Compass?"
- [ ] Decide whether to turn on weekly AI insights.

---

## Running the live tests (for the person who maintains this)

The 359 automated tests that run without a server (`yarn test:unit`) check the rules. The live tests check that a *real* Twenty accepts what Compass sends it. Run them against a throwaway local Twenty:

```bash
yarn twenty docker:start
export TWENTY_API_URL=http://localhost:2020
export TWENTY_API_KEY=...   # an API key from the local Twenty: Settings > MCP & APIs > API
yarn test
```

They install Compass, add a person and a gift, add a grant and a KPI, and check that the totals, status, pace and thank-you task appear. **They have not been run yet.** If one fails, that failure is the most useful information about what needs adjusting.

## If something goes wrong

- **`yarn` says it cannot find the project:** make sure you are inside the `compass-v2` folder.
- **`corepack` is not found:** reinstall Node.js 24.5 or newer from nodejs.org.
- **Docker errors:** open Docker Desktop and wait until it says it is running.
- **A button says the AI could not be reached:** the AI is not connected or has no credits. See *Turn on the AI* above.
- **A total looks wrong:** do not edit it. Fix the gift, KPI or hours it comes from. It corrects itself within a minute. If it does not, you can run the nightly repair job by hand, which recalculates every donor's giving status and every active grant's figures: `yarn twenty dev:function:exec -n nightly-sweep --remote production`.
- **Anything else:** Twenty's troubleshooting page is <https://docs.twenty.com/developers/extend/apps/getting-started/troubleshooting>. Or ask for help with the exact message you saw.
