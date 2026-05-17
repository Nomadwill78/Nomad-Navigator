# Security Specification for Nomad Compass

## Data Invariants
1. An organization must have at least one admin.
2. An organization cannot exceed 8 members.
3. Users can only access data belonging to organizations they are members of.
4. Roles are strictly enforced:
   - `admin`: Full access to org, members, and data.
   - `editor`: Can read/write grants and metrics, but cannot manage members.
   - `viewer`: Read-only access to all org data.
   - `uploader`: Can read data and create new metrics/grants but not delete or modify existing critical fields.
5. User profiles are only writable by the user themselves.

## The Dirty Dozen Payloads (Attack Scenarios)

1. **The Ghost Admin**: A `viewer` attempts to update their own role to `admin` in the `/members/` collection.
2. **The 9th Member**: An `admin` attempts to add a 9th member to an organization that already has 8.
3. **The Data Scraper**: An authenticated user tries to `list` the `/grants/` collection of an organization they don't belong to.
4. **The Impersonator**: A user tries to create a `users/{otherUserId}` profile.
5. **The Orphan Grant**: A user tries to create a grant in `/organizations/{otherOrgId}/grants/`.
6. **The Shadow Update**: An `editor` tries to change the `allocatedAmount` of a grant (assuming this is restricted to `admin` only for this test, but user didn't specify, so let's say they try to change the `funder` which might be immutable).
7. **The Self-Assigned Role**: A new user tries to create an `OrgMember` document for themselves with the `role: "admin"` before the organization even exists or without being the creator.
8. **The ID Poisoning**: A user attempts to create a document with an extremely large ID or one containing malicious characters.
9. **The De-Auth Attack**: A `viewer` attempts to delete the `admin`'s membership record.
10. **The PII Leak**: A user attempts to read another user's private email from a collection not intended for public view (though here we split users and members).
11. **The State Shortcut**: A user tries to set a grant status to `completed` without meeting KPI targets (if logic was there, but for now just basic status restriction).
12. **The Time Warp**: A user tries to set `createdAt` to a date in the past instead of `request.time`.

## Test Runner Plan
We will implement `firestore.rules.test.ts` using the Firebase Rules Unit Testing library to verify these constraints.
