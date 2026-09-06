# Sprint 1 — Data Integrity

## Objective
Harden grant management without rewriting the application.

## Scope

1. Replace portfolio-level grant persistence with entity-level CRUD.
2. Use collision-resistant/Firestore-generated IDs for persistent grants and nested entities.
3. Introduce draft grant creation and required-field validation before official persistence.
4. Add runtime validation for grant, KPI, and subgrantee records.
5. Make KPI target/status calculations explicit for missing and zero targets.
6. Preserve organization-scoped Firestore rules and existing role permissions.

## Acceptance criteria

- Editing one grant does not rewrite unrelated grants.
- Concurrent edits to different grants do not overwrite one another.
- New grants remain drafts until required fields are complete.
- Invalid amounts, dates, statuses, KPIs, and subgrantees are rejected with actionable messages.
- No official grant is silently created as an untitled or incomplete record.
- KPI states are deterministic: No Target, Not Started, Behind, On Track, Met, or Exceeded.
- Demo mode never writes to production data.
- Existing organization isolation and role restrictions remain enforced by Firestore rules.

## Implementation sequence

### 1. Persistence API

Introduce `createGrant`, `updateGrant`, and `deleteGrant` in `src/lib/orgData.ts`. Keep the existing array subscription temporarily for compatibility, but route new writes through entity-level operations.

### 2. Grant editor

Update `GrantTrackingView` to maintain a local draft, validate required fields, and persist only after explicit confirmation. Use Firestore-generated IDs for new records.

### 3. Validation

Create a shared runtime validator for grants, KPIs, and subgrantees. Reuse it in the UI and persistence layer. Align validation with `firestore.rules`.

### 4. KPI calculations

Centralize KPI status calculation and explicitly handle missing targets, zero targets, invalid numbers, and percentage bounds.

### 5. Verification

Run typecheck, lint, build, and targeted manual tests for create/edit/delete, role restrictions, demo mode, and simultaneous users.

## Out of scope

- Grant Discovery redesign
- AI Impact Assistant
- Full DashboardStats migration
- Visual redesign
- Pricing changes

## Definition of done

Sprint 1 is complete only when the implementation, tests, and documentation agree and the application no longer relies on portfolio-level grant replacement for normal grant editing.
