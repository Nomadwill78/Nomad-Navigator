# Security Specification for Nomad Compass

**Status:** authoritative. `types.ts` (`UserRole`, `ROLE_PERMISSIONS`, `SEAT_LIMIT`) and
`firestore.rules` implement exactly what is written here. If you change one, change all three
in the same commit.

> **Retired:** an earlier draft of this document described a four-role model
> (`admin` / `editor` / `viewer` / `uploader`) which never matched the application. It has been
> replaced by the six-role model below. `DRAFT_firestore.rules` implemented that retired model and
> is no longer a valid reference — `firestore.rules` is the only rules file that ships.

## 1. The role model (six roles)

| Role | Manage team | Edit grants | Edit metrics | Delete grants | Export |
|---|:---:|:---:|:---:|:---:|:---:|
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `grant_coordinator` | — | ✅ | — | — | ✅ |
| `impact_analyst` | — | — | ✅ | — | ✅ |
| `compliance_officer` | — | — | — | — | ✅ |
| `data_entry` | — | — | ✅ | — | — |
| `viewer` | — | — | — | — | — |

Export is a client-side operation over data the user can already read, so it is enforced in the UI
only. Every other column is enforced in both the UI and `firestore.rules`.

**Rules mapping:**
- `organizations/{orgId}/grants/**` — create/update: `admin`, `grant_coordinator`. Delete: `admin`.
- `organizations/{orgId}/metrics/**` — write: `admin`, `impact_analyst`, `data_entry`.
- `organizations/{orgId}/members/**` — write: `admin` (plus the two self-service cases in §3).
- Reads of any org subcollection: any member of that org.

## 2. Data invariants

1. An organization always has at least one admin. Enforced by preventing an admin from changing
   their own role and by preventing deletion of the organization creator's membership.
2. An organization cannot exceed **8 members** (`SEAT_LIMIT`). Rules cap `memberCount` at 8 on
   organization writes, on member creation (`getAfter`), and on invitation creation. The UI counts
   accepted members **plus pending invitations** against the same limit.
   *Open product question: whether 8 is the intended V1 commercial limit or an artifact. Until that
   is decided, it is enforced consistently but is not stated as a limit in marketing copy.*
3. Users can only access data belonging to organizations they are members of. This is structural:
   all org data is nested under `/organizations/{orgId}/`, `/organizations` is not listable, and
   every rule under it is gated on `isOrgMember(orgId)`.
4. A user profile (`/users/{uid}`) is readable and writable **only by that user**.
5. Invitations are matched by email address and therefore require a **verified** email before they
   can be accepted (`email_verified == true`). General app access does not require verification.
6. Invitations are immutable. To change a role or address, revoke and re-issue.

## 3. Membership lifecycle

Membership documents are keyed by **auth uid** — the same key the app reads to resolve a role.
There are exactly three ways one can be created:

1. **Org creation.** The creator seeds themselves as `admin`, in the same transaction that creates
   the organization (`getAfter(...).creatorId == request.auth.uid`).
2. **Invitation acceptance.** A signed-in user with a verified email and a pending invitation at
   `invitations/{their-email}` for that org creates their own membership — at exactly the role named
   in the invitation, with an email matching their token — while incrementing `memberCount` by one
   and deleting the invitation. All of it in one transaction.
3. **Direct add by an admin.**

An invitation lives at `invitations/{lowercased-email}` in a **top-level** collection, because the
invitee is not yet a member of the organization and so cannot read anything beneath it. Keying the
document by email makes "is this invitation mine?" a document-id comparison against
`request.auth.token.email`, which cannot be spoofed by document contents.

## 4. Attack scenarios and the control that stops each

| # | Scenario | Control |
|---|---|---|
| 1 | **Ghost Admin** — a `viewer` sets their own role to `admin` | Member `update` requires `admin` **and** `userId != request.auth.uid` |
| 2 | **The 9th Member** — adding a member to a full org | `getAfter(org).memberCount <= 8` on member create; `< 8` on invitation create |
| 3 | **Data Scraper** — listing another org's grants | `list` on grants requires `isOrgMember(orgId)` |
| 4 | **Impersonator** — creating `users/{someoneElse}` | `/users/{userId}` write requires `userId == request.auth.uid` |
| 5 | **Orphan Grant** — writing into another org's grants | Grant writes require a role in the target org |
| 6 | **Invitation Hijack** — signing up as `victim@org.org` to claim their invite | Acceptance requires `email_verified == true` |
| 7 | **Self-Assigned Role** — accepting an invite at a higher role than offered | Member create requires `incoming().role == get(invite).data.role` |
| 8 | **ID Poisoning** — oversized or hostile document ids | `isValidId()` on organization ids: ≤128 chars, `[A-Za-z0-9_-]` |
| 9 | **De-Auth Attack** — removing the admin/owner | Member `delete` requires `admin`, and forbids deleting self or the org creator |
| 10 | **PII Leak** — reading other users' profiles | `/users/{uid}` is self-only read (previously any signed-in user) |
| 11 | **Seat Inflation** — an invitee editing the org while joining | Invitee org `update` may touch `memberCount` only, `+1` only, capped at 8 |
| 12 | **Creator Reassignment** — an admin making themselves the creator | Org `update` requires `incoming().creatorId == existing().creatorId` |
| 13 | **Invitation Forgery** — a non-admin inviting themselves into an org | Invitation create requires `admin` of the target org and `invitedBy == request.auth.uid` |
| 14 | **Trial Spam** — abusing the public signup form | `trial_signups` is create-only, never readable, with bounded field sizes |

## 5. Known gaps

- **Rules are not yet covered by automated tests.** The intended runner is
  `firestore.rules.test.ts` using `@firebase/rules-unit-testing`, asserting each row of §4. Until
  that exists, rule changes must be exercised manually in the Firebase emulator.
- **Invitation email delivery is not implemented.** An invitation is a database record; the
  administrator has to tell their colleague to sign up. The UI says so plainly rather than implying
  a mail was sent.
- **`memberCount` is maintained by clients** rather than a trigger, so it can drift if a write
  fails midway. It is a cap input, not an authority — the true seat count is the number of
  documents in the `members` subcollection.
