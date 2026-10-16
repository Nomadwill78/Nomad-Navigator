# Nomad Compass v2: notes for whoever changes this next

Nomad Compass v2 is an **app on Twenty CRM** for a small nonprofit: grants and impact, donors and gifts, volunteers, donor cultivation, and AI insights that show their evidence. v1 (the Firebase app in the repo root) is separate and untouched.

Read [README.md](README.md) first. Build and check everything with:

```bash
yarn lint && yarn typecheck && yarn test:unit && yarn twenty dev:build
```

All four must pass before a change is done. They run offline with no Twenty server.

## Rules that are easy to break

**1. Permanent IDs.** Every object, field, view and automation has an ID made from a name by `stableUuid('some:seed')` (`src/constants/stable-uuid.ts`). The seed string is the permanent key. **Never rename a seed.** Doing so makes Twenty create a new, empty field and orphan the data in the old one. `stable-uuid.test.ts` pins known IDs to catch this. If it fails, do not update the expected values: restore the seed.

**2. Do not edit Twenty itself.** Compass is an app. Editing Twenty's own source would put your changes under the AGPL (see `docs/PRIVACY_AND_LICENSING.md`). Everything goes through `twenty-sdk`.

**3. Every calculated field needs a writer.** A field made with `system: true` is locked on screen and must be filled by code in `src/services`. Before adding one, write the calculation in `src/lib`, the writer in `src/services/rollups.ts`, and a test. (A "cost per person" field once had no writer. The audit that found it is why this rule exists.)

**4. Calculations live in `src/lib`, as plain functions.** No network, no Twenty imports. `src/services` does the reading and writing and takes its dependencies as arguments, so tests use `src/services/__tests__/fake-client.ts`. Keep it that way.

**5. Never write a number that rounds up.** Progress is rounded **down** (`floorTo`). 99.96% is not "Met". Funders read these numbers.

**6. The AI sees facts, never names.** `src/lib/evidence.ts` builds what the model reads. It must not contain a name, email, phone or address, or staff-typed free text unless the `AI_INCLUDE_FREE_TEXT` setting is on. `ai-insights.test.ts` asserts this. AI output must pass through `src/lib/ai-guardrails.ts` before it is saved.

**7. Respect Outreach permission in code.** *Do not contact* means no reminders and no AI. *Thank-yous only* means never an ask. Any new automation that contacts or analyzes a person must check it, and have a test.

**8. No flooding.** Automations that create tasks must be idempotent (use `createTaskFromPlan`, which remembers a key) and rationed. Importing history must not create a pile of overdue tasks.

**9. Only the app's own AI role.** The agents use `ROLE_ID.aiNoData`, which can read nothing. Do not give an agent a role with data access.

## Adding things

- **A field:** add its name to the typed list in `src/constants/universal-identifiers.ts`, define it (inline in the object, or a file in `src/fields` for a standard object), add it to a view if people need to see it. The consistency tests check the rest.
- **A relation:** it needs **two** fields (one on each object) that point at each other. `src/__tests__/data-model.test.ts` checks this.
- **A saved view:** add it to `VIEW_ID`, create `src/views/<name>.view.ts`, and give it a sidebar entry in `src/navigation-menu-items`. A view with no sidebar entry is unreachable, and a test fails.
- **An automation:** the logic goes in `src/services` with tests; `src/logic-functions/<name>.logic-function.ts` only connects it to a trigger.

## Words and tone

Everything a user reads is written for someone new to CRM software: short sentences, no jargon. **Do not use em dashes** (the long dash) in anything a person reads, in code comments, docs or messages. Brand colors, if a screen is ever added: Nomad Navy `#003766`, Deep Midnight `#00172C`, Bright White `#FFFFFF`, Compass Gold `#FFB300` (sparingly, for actions), Soft Sand `#F4F1EA`.

## Tooling notes

- Node 24.5+ and Yarn 4. `compass-v2` is its own Yarn project (note the committed `yarn.lock`), even though it sits inside the v1 repo.
- `twenty-sdk`, `twenty-client-sdk` and `twenty-ui` are pinned to **2.45.0**. Keep the three in step when upgrading, and read the changelog: Twenty's AI agent calls are marked alpha.
- `src/__tests__/compass.integration-test.ts` needs a running Twenty server. The other tests do not.
- `AGENTS.md` is the generic guide that ships with Twenty apps. Where it says to create IDs with `yarn twenty dev:add`, this project uses `stableUuid` instead.
