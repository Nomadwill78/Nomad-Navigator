# Nomad Navigator — Grant Data Integrity Audit

Branch audited: `fix/deploy-api-as-vercel-functions` (HEAD `bdd0548`), read directly from your local repo on 2026-09-09. Verified by reading the actual source, running `tsc --noEmit`, and running a real `vite build`, not by assumption.

## Bottom line

There is no `createGrant()` function anywhere in the codebase, so the specific check you asked for ("find every place `createGrant()` is called") turned up nothing to find, which is itself the finding: grant creation runs through a generic array-diffing writer with no required-field validation at all. Two things need attention before this app can be trusted with real grant data:

1. **A blank, incomplete grant is written to Firestore the instant you click "Add Grant."** Nothing in the UI or the client code stops it, and the only real gatekeeper (the Firestore security rule) rejects it silently after the fact, leaving a "phantom" grant sitting in the UI that was never actually saved.
2. **There is no durable offline queue.** Your instinct was right. What exists is a 700ms in-memory debounce timer with no browser storage backing it and no Firestore offline persistence enabled. Any edit made in the last 700ms before a tab closes, refreshes, or loses network is gone, with no warning to the user.

Full detail below, organized to match your checklist.

---

## 1. Grant creation

**Required fields are not enforced anywhere except the database rule, and even the database rule is incomplete.**

- `components/GrantTrackingView.tsx:49-69` (`handleAddGrant`): clicking "Add Grant" immediately creates `{ name: '', funder: '', amount: 0, ... }` and calls `onUpdateGrants([...grants, newGrant])`. That call flows straight into the save pipeline. There is no draft state, no "unsaved" holding area. The blank grant is submitted for persistence the moment the button is clicked.
- `components/GrantTrackingView.tsx:83-97` (`saveHeaderEditor`): when the user finishes the inline editor, a blank name is silently replaced with `'Untitled Grant'`, but a blank funder is saved as an empty string with no error, and a negative amount is silently clamped to `0` with `Math.max(0, parsedAmount)`. None of this is rejected or flagged. It's rewritten quietly.
- `src/lib/orgData.ts:92-102` (`sanitizeGrant`): this is the only function between the UI and Firestore. It fills in optional fields (`spentAmount`, `kpis`, `subgrantees`) but performs zero validation on `name`, `funder`, or `amount`. This directly answers your priority question: **the client persistence layer does not prevent an incomplete grant from being written.**
- `firestore.rules:121-125` (`isValidGrant`): this is the only layer that actually blocks anything. It correctly requires non-empty `name` and `funder`, but requires only `data.amount >= 0`, not `> 0`. **A grant with a $0 award amount is explicitly allowed by the security rules**, contradicting the requirement.

**Consequence you should know about:** because the security rule *does* reject empty name/funder, the freshly-created blank grant from `handleAddGrant` gets added to local UI state immediately (optimistic update) but its Firestore write fails silently in the background about 700ms later. The only visible sign is a small "Not saving" badge in the top bar (`App.tsx:695-702`). If the user doesn't notice it and navigates away or refreshes, the grant they were just editing vanishes, because it was never actually persisted. This is a real, reproducible data-loss path, not a hypothetical.

**Grant IDs are not collision-resistant.** `id: Date.now().toString()` is used for new grants (`GrantTrackingView.tsx:54`), new KPIs (`:116`), and new subgrantee KPIs (`:196`). Two grants created within the same millisecond, quite possible on a fast double-click or in an automated test, will collide and one will silently overwrite the other in Firestore, because the grant's `id` is used directly as the Firestore document ID (`orgData.ts:46`). Worse, `handleAddSubgrantee` (`:150-165`) seeds every new subgrantee's first KPI with the **hardcoded literal id `'1'`**, not a timestamp: every subgrantee you ever add gets a KPI with id `'1'`. This happens to not break anything today only because KPI updates are scoped through the parent subgrantee's own id first, but it is not a safe pattern and should be a real UUID.

**Refreshing the page does not duplicate a saved grant** — this part is fine. `persistGrants` (`orgData.ts:166-188`) diffs the incoming array against the last server-confirmed array and only writes what changed, using `setDoc`/`batch.set` with a fixed doc ID, which is idempotent. A page refresh re-subscribes via `onSnapshot` and reads the same document, no duplication.

---

## 2. Grant editing

- Edits are correctly scoped. `handleUpdateKPI`, `handleUpdateSubgrantee`, etc. all `.map()` over the array and only touch the matching `id`, so editing Grant A cannot bleed into Grant B. This part is solid.
- Partial edits preserve untouched fields, because every update path uses object spread (`{ ...g, ...updates }`), not a wholesale replace.
- Rapid edits (e.g., typing quickly into a KPI value) are coalesced correctly: every keystroke updates local state immediately and resets a single 700ms debounce timer, so only the final value gets written once. No duplicate writes, no lost keystrokes, **as long as the tab stays open past that 700ms window.**
- A page refresh after a successful save shows the updated values, because the read path re-subscribes to the same Firestore documents.
- **Invalid values are not rejected, they're silently corrected or simply allowed:** negative amounts become `0` with no message (`GrantTrackingView.tsx:90`); malformed or inverted dates (end before start) are never checked at all, at any layer. The `<input type="date">` gives you basic browser-level format protection, but nothing validates that end comes after start, and the Firestore rule doesn't check dates at all.

---

## 3. Grant deletion

**There is currently no way to delete a whole grant from the product.** I searched the entire UI layer for it. The only delete buttons that exist are for individual KPIs (`handleDeleteKPI`, `:129`) and individual subgrantee KPIs (`handleDeleteSubgranteeKPI`, `:133`). `orgData.ts:180-185` clearly has the diffing logic to delete a grant document when it disappears from the array, and `firestore.rules:226` correctly restricts that delete to admins only, so the plumbing is there and looks correct, but nothing in `GrantTrackingView.tsx` or anywhere else ever removes a grant from the array to trigger it.

Practically, this means most of your section 3 checklist ("deleting one grant removes only that grant," "failed deletion doesn't falsely report success") is untestable as a live user flow today, because the feature doesn't exist yet. This should probably be the first thing flagged to whoever built this for you.

---

## 4. Offline and reconnect behavior (your top concern, confirmed)

You were right to be suspicious. Here's exactly what's there:

- **No Firestore offline persistence is enabled.** I checked `src/lib/firebase.ts:14-16` (where `db` is created) for `enableIndexedDbPersistence` or `initializeFirestore(..., { localCache: persistentLocalCache(...) })`. Neither is present. Firestore's SDK defaults to a memory-only write queue in this configuration.
- **What actually exists is a 700ms `setTimeout` debounce** (`src/hooks/useOrgData.ts:25, 131, 155`), which is in-memory JavaScript state, not a durable queue. If the browser tab closes, refreshes, or crashes before that timer fires and the write completes, the edit is gone. There is no `beforeunload` handler anywhere in the codebase to warn the user before this happens.
- **The "offline mirror" in localStorage (`orgData.ts:51-72`) only stores server-confirmed data**, written each time a snapshot arrives from Firestore. It never stores the user's own in-flight, unsaved edits. So it does not help recover a pending edit after a refresh, it only prevents a blank screen by showing the last thing the server actually confirmed.
- **The online/offline indicator is misleading.** `App.tsx:386, 407-418, 705-715` shows "Online" or "Working Offline (Cached)" based purely on the browser's `navigator.onLine` flag. It has no idea whether a write is currently pending in the 700ms debounce window, or whether the last attempted write actually succeeded. You can be shown "Online" while an edit from a few hundred milliseconds ago hasn't even been attempted yet. The only failure signal is a separate "Not saving" badge that appears only after a write has been attempted and thrown an error, e.g. a permission-denied from an incomplete grant (see section 1).
- **Conflict handling:** two users editing the same org's grants concurrently is handled by "last write wins" at the batch level, there is no merge or conflict detection, and no version field on grant documents. For a small team this is a reasonable tradeoff, but it isn't "predictable" in the sense of surfacing a conflict to either user, it just silently overwrites.

**Net assessment:** the debounce is doing exactly what you suspected, holding changes in memory and calling it done. Nothing here durably queues a write across a reload. If durable offline support is something you're promising users, it does not currently exist and would need Firestore's persistent local cache turned on (`persistentLocalCache` in the modern SDK) plus a real "pending sync" UI state, not just online/offline.

---

## 5. Validation at every layer

| Layer | Where | Enforces required fields? | Enforces amount > 0? |
|---|---|---|---|
| UI | `GrantTrackingView.tsx` | No — blank name becomes "Untitled Grant," blank funder saved as-is | No — negative silently becomes 0 |
| Client persistence (`sanitizeGrant`/`persistGrants`) | `src/lib/orgData.ts` | No validation at all, only fills optional fields | No |
| Firestore security rules (`isValidGrant`) | `firestore.rules:121-125` | **Yes** — rejects empty `name`/`funder` | **No** — allows `amount >= 0`, should be `> 0` |

Direct answer to your priority question: **the current validator does not prevent an incomplete grant from being saved.** The only thing standing between a blank grant and Firestore is the security rule, and it lets `amount = 0` straight through. Name and funder emptiness are the one thing that is genuinely, correctly blocked today, at the database layer only.

---

## 6. KPI and subgrantee data

- Zero KPIs, one KPI, and multiple KPIs all round-trip correctly, `kpis: []` is a normal, handled state (`sanitizeGrant` defaults it), and the array is preserved element-for-element through every edit path.
- **Division by zero produces `NaN` on screen.** `GrantTrackingView.tsx:31` (`getTrendIndicator`) and the two progress-bar calculations at `:585` and `:721` both compute `current / target` with no guard. If a KPI's target is `0` and current is also `0`, the result is `NaN`, which renders literally as the text "NaN%" in the progress label and produces an invalid (silently ignored) CSS width. If target is `0` and current is positive, you get `Infinity`, clamped to 100% by the surrounding `Math.min`, which reads as "target met" for a KPI that was never really measurable. This is exactly the failure mode you asked me to check for, and it's present in three places.
- Editing one subgrantee does not alter another. `handleUpdateSubgrantee` and `handleUpdateSubgranteeKPI` both filter by the specific subgrantee's `id` before touching anything.
- Subgrantee allocation totals: there is no code anywhere that sums subgrantee `allocatedAmount` against the parent grant's `amount` and checks consistency. Nothing enforces that subgrantee allocations don't exceed the grant total. That's not a crash risk, but it means the data can silently drift inconsistent.
- Empty subgrantee arrays are handled safely (`sub.subgrantees ?? []` pattern used consistently).

---

## 7 & 8. Persistence sequencing and automated checks

I traced the create -> UI update -> Firestore write -> refresh -> re-confirm sequence directly in the code for all three operations (create, edit; delete has no UI path, see section 3) and it behaves as described above. I did not drive this through an actual running browser this pass, that would be the natural next step and I'm glad to do it.

What I did run, directly, on your machine:

- **`tsc --noEmit`** (the `lint` script): clean, zero type errors.
- **`vite build`** (production build): succeeds. It failed once on a Linux-only missing native dependency in the isolated build sandbox this session uses; that's an artifact of the verification environment, not your code, and it resolved after reinstalling one optional package. Your normal Vercel/local Windows build path is unaffected.
- **ESLint**: there is no ESLint configuration in the repo at all. The `npm run lint` script is literally just `tsc --noEmit`. You have type-checking, you do not have a real linter.
- **Tests**: there are zero test files in the repository, no `*.test.*`, no `*.spec.*`, no `__tests__`, and no Firestore rules emulator tests. Nothing automated currently verifies any of the behavior in this report, it all had to be checked by reading the source directly.
- **CI**: the only GitHub Actions workflow (`.github/workflows/firestore-rules.yml`) deploys `firestore.rules` straight to production on every push to `main` that touches the file. It runs `npm ci` but no test, lint, or dry-run step before deploying. A bad rules change would go live with no gate.

---

## Priority fix list

1. **Add a real `saveGrant`-style client function that validates before writing**: require non-empty trimmed `name` and `funder`, require `amount > 0`, and reject (don't silently correct) invalid input, in the UI before it ever reaches `onUpdateGrants`. This closes the "blank grant hits Firestore immediately" gap and stops the silent phantom-grant failure.
2. **Fix `isValidGrant` in `firestore.rules`** to require `data.amount > 0` instead of `>= 0`. One-line change, closes the last-line-of-defense gap.
3. **Replace `Date.now().toString()` IDs with `crypto.randomUUID()`**, and fix the hardcoded `id: '1'` on new subgrantee KPIs.
4. **Build a real delete-grant UI path** if grant deletion is meant to be a supported feature, the backend logic already supports it correctly.
5. **Decide what "offline support" should actually mean here**, and if durability across a reload is a real product promise, turn on Firestore's persistent local cache and add a genuine "pending sync" indicator distinct from the browser's online/offline flag. At minimum, add a `beforeunload` warning when a debounced write hasn't fired yet.
6. **Guard every `current / target` calculation** against `target === 0` before it ever reaches `.toFixed()` or a CSS `width`.
7. Fix the NaN/division-by-zero issue and the ID-collision issue in the same pass, they're both in `GrantTrackingView.tsx` and small.

I'm glad to open these as fixes directly, want me to start with the priority list above?
