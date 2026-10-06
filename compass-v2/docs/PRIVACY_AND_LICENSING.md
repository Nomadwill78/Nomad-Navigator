# Privacy, data and licensing

This page explains where donor data goes and what you are allowed to do with the software. It is a plain-English summary, **not legal advice**. If you handle sensitive data or are unsure, ask a lawyer who knows nonprofit and privacy law.

## Part 1: Donor privacy

### What Compass stores
People's names, emails, phones and giving history; volunteer hours and background-check dates; grant and program figures. It does **not** store card or bank numbers. Payments happen in your payment processor, and Compass only records that a gift happened.

### Who can see what
Compass includes four team roles ([Setup guide](../SETUP.md), Step 4). The ones for grants and volunteers cannot read any donor's giving history, capacity estimate or AI insights. The board role cannot see individual donors, gifts or volunteers at all, and cannot export. Give people the narrowest role that lets them do their job.

You can also limit who can **export** lists: the fundraiser and grants manager roles can export, the volunteer coordinator and board roles cannot.

### Do not contact, and thank-yous only
Every person has an **Outreach permission**. It is checked in code, not just shown on screen:

- **Do not contact:** no reminders, no AI insights, never sent to the AI at all.
- **Thank-yous only:** thank-you and check-in reminders only. The AI is not allowed to suggest an ask.

Record people's wishes here the moment you learn them.

### Where AI sends data
When you use an AI feature, a short text of giving and engagement facts is sent to the AI provider. **It contains no name, email, phone or address.** For example: "Cash giving: $550 across 3 gifts. Last gift: 2026-01-15 of $250 (264 days ago)." The result is saved onto the donor's record, where you already know who they are.

- **Twenty Cloud:** the facts go to the AI providers Twenty uses. Read Twenty's privacy and data-processing terms.
- **Self-hosted:** the facts go to the AI company whose key you added.

Two settings widen what is sent, and both are **off** by default:
- *Let AI read staff-written plan and grant text:* includes what staff typed in plan purposes, next steps and grant descriptions. Staff sometimes type personal details there.
- *Write AI donor insights automatically every Monday:* sends facts for up to the chosen number of donors each week without anyone clicking a button.

The grant report writer sees grant facts (funder name, amounts, KPIs, subgrantee names). Those are organization data, not individual donor data.

### What the AI is never allowed to do
- Guess or comment on wealth, religion, race, ethnicity, age, gender, health, disability or family situation.
- Change, read or delete any record. It runs under a role with no data access.

### Your responsibilities
- **Tell donors** how you use their information, in your privacy policy.
- **Honor opt-outs** and keep Outreach permission current.
- **Delete on request** where the law requires. In Twenty, deleted records go to the trash first. Empty the trash to remove them for good.
- **Follow your state's charitable solicitation rules** and any data-protection law that applies to you (for example GDPR or CCPA).
- **Keep backups** if you self-host.

## Part 2: Licensing

### Twenty
Twenty is open source under the **AGPLv3** license, with two extra permissions that matter to you:

1. **The Application Exception.** An app that talks to Twenty only through Twenty's official interfaces (its APIs, its app format, its logic functions and front components, and its SDK) is **not** covered by the AGPL. You may license such an app however you like, **including keeping it private or selling it.** Nomad Compass v2 is built exactly this way.
2. **MIT parts.** Twenty's SDK and app-building packages are MIT licensed, which lets you build on them freely.

### What this means for you
- **You can keep Compass private, charge for it, or open-source it.** Your choice. Nothing in Compass has to be published because it runs on Twenty.
- **If you change Twenty itself** (not Compass, but Twenty's own code) and let others use it over a network, the AGPL says you must offer those changes to your users as open source. This is why Compass was built as an *app on* Twenty instead of a modified copy of Twenty. **Do not edit Twenty's own code** unless you are ready to publish those edits.
- **Some of Twenty's code is under a commercial license** (files marked `@license Enterprise`). Compass does not use any of it. Some Twenty *features* need a paid Twenty plan, for example row-level permissions and some AI provider options. Compass does not depend on them.
- **Trademarks.** The name and logo "Twenty" belong to Twenty. Say "built on Twenty". Do not present Compass as Twenty's product or use their logo as yours.

### Compass itself
This folder is marked `"license": "UNLICENSED"` and `"private": true`, which means **all rights reserved by Nomad Consulting**. Change this in `package.json` if you decide to share it. The code of Compass v1 is untouched.

### If you sell Compass to other nonprofits
Selling an app that runs on Twenty is permitted by the Application Exception. Each customer needs their own Twenty workspace (their own data, kept separate). Twenty has an app marketplace and an option for apps to charge for AI credits. Look at those options and at Twenty's terms before choosing a business model. Do not assume the pricing or rules in this document are current.
