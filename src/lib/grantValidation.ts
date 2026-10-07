import { Grant, GrantKPI, Program, Subgrantee, SubgranteeKPI } from '../../types';

/**
 * Runtime validation for grants — the middle of the three enforcement layers
 * the remediation plan asks for (TypeScript types at compile time, this at
 * runtime, `firestore.rules` at the database). A partial `changes` object is
 * valid input: only the keys actually present are checked, so this doubles as
 * both the full-grant validator (create) and the partial-update validator.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES: Grant['status'][] = ['active', 'pending', 'completed'];
const VALID_SUBGRANTEE_STATUSES: Subgrantee['status'][] = ['active', 'pending', 'completed'];
const MAX_LIST_LENGTH = 200;

function isValidDate(value: string): boolean {
  return DATE_RE.test(value) && !Number.isNaN(new Date(value).getTime());
}

function validateKpiShape(kpi: Partial<GrantKPI | SubgranteeKPI>, label: string): string | null {
  if (typeof kpi.name !== 'string' || kpi.name.trim().length === 0) return `Every ${label} needs a name.`;
  if (typeof kpi.target !== 'number' || !Number.isFinite(kpi.target)) return `"${kpi.name}" has an invalid target.`;
  if (typeof kpi.current !== 'number' || !Number.isFinite(kpi.current)) return `"${kpi.name}" has an invalid current value.`;
  if (typeof kpi.unit !== 'string') return `"${kpi.name}" is missing a unit.`;
  return null;
}

export type GrantValidationInput = Partial<
  Pick<
    Grant,
    | 'name' | 'funder' | 'amount' | 'spentAmount' | 'startDate' | 'endDate' | 'status' | 'kpis' | 'subgrantees'
    | 'programId' | 'restriction' | 'allowedUses' | 'matchRequired' | 'matchSecured' | 'reportFrequency' | 'budgetLines'
  >
>;

const VALID_FREQUENCIES = ['monthly', 'quarterly', 'semiannual', 'annual', 'none'];
const VALID_CATEGORIES = ['personnel', 'supplies', 'partner_pass_through', 'other'];
const VALID_REPORTING = ['current', 'late', 'not_started'];

const isMoney = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** The Phase 2 grant fields. Each is optional; only the ones present are checked. */
function validateTerms(input: GrantValidationInput): string | null {
  if (input.programId !== undefined && (typeof input.programId !== 'string' || input.programId.length > 200)) {
    return 'Program is invalid.';
  }
  if (input.restriction !== undefined && !['restricted', 'unrestricted'].includes(input.restriction)) {
    return 'Restriction must be restricted or unrestricted.';
  }
  if (input.allowedUses !== undefined && (typeof input.allowedUses !== 'string' || input.allowedUses.length > 2000)) {
    return 'Allowed uses is too long.';
  }
  if (input.matchRequired !== undefined && !isMoney(input.matchRequired)) return 'Required match must be a non-negative number.';
  if (input.matchSecured !== undefined && !isMoney(input.matchSecured)) return 'Secured match must be a non-negative number.';
  if (input.reportFrequency !== undefined && !VALID_FREQUENCIES.includes(input.reportFrequency)) {
    return 'Report frequency is invalid.';
  }
  if (input.budgetLines !== undefined) {
    if (!Array.isArray(input.budgetLines)) return 'Budget lines must be a list.';
    if (input.budgetLines.length > 50) return 'Too many budget lines on one grant.';
    for (const line of input.budgetLines) {
      if (!VALID_CATEGORIES.includes(line.category)) return 'A budget line has an invalid category.';
      if (!isMoney(line.budgeted) || !isMoney(line.spent)) return 'Budget line amounts must be non-negative numbers.';
    }
  }
  return null;
}

/** Returns a human-readable problem, or null if `input`'s present fields are all valid. */
export function validateGrant(input: GrantValidationInput): string | null {
  if (input.name !== undefined) {
    if (typeof input.name !== 'string' || input.name.trim().length === 0) return 'Grant name is required.';
    if (input.name.length >= 300) return 'Grant name is too long.';
  }

  if (input.funder !== undefined) {
    if (typeof input.funder !== 'string' || input.funder.trim().length === 0) return 'Funder is required.';
    if (input.funder.length >= 300) return 'Funder name is too long.';
  }

  if (input.amount !== undefined) {
    if (typeof input.amount !== 'number' || !Number.isFinite(input.amount) || input.amount < 0) {
      return 'Award amount must be a non-negative number.';
    }
  }

  if (input.spentAmount !== undefined) {
    if (typeof input.spentAmount !== 'number' || !Number.isFinite(input.spentAmount) || input.spentAmount < 0) {
      return 'Spent amount must be a non-negative number.';
    }
  }

  if (input.startDate !== undefined && !isValidDate(input.startDate)) return 'Start date is invalid.';
  if (input.endDate !== undefined && !isValidDate(input.endDate)) return 'End date is invalid.';
  if (input.startDate !== undefined && input.endDate !== undefined && input.startDate > input.endDate) {
    return 'End date must be on or after the start date.';
  }

  if (input.status !== undefined && !VALID_STATUSES.includes(input.status)) {
    return 'Grant status is invalid.';
  }

  const termsError = validateTerms(input);
  if (termsError) return termsError;

  if (input.kpis !== undefined) {
    if (!Array.isArray(input.kpis)) return 'KPIs must be a list.';
    if (input.kpis.length > MAX_LIST_LENGTH) return 'Too many KPIs on one grant.';
    for (const kpi of input.kpis) {
      const err = validateKpiShape(kpi, 'KPI');
      if (err) return err;
    }
  }

  if (input.subgrantees !== undefined) {
    if (!Array.isArray(input.subgrantees)) return 'Subgrantees must be a list.';
    if (input.subgrantees.length > MAX_LIST_LENGTH) return 'Too many subgrantees on one grant.';
    for (const sub of input.subgrantees) {
      if (typeof sub.name !== 'string' || sub.name.trim().length === 0) return 'Every subgrantee needs a name.';
      if (typeof sub.allocatedAmount !== 'number' || !Number.isFinite(sub.allocatedAmount) || sub.allocatedAmount < 0) {
        return `Subgrantee "${sub.name}" has an invalid allocation amount.`;
      }
      if (!VALID_SUBGRANTEE_STATUSES.includes(sub.status)) return `Subgrantee "${sub.name}" has an invalid status.`;
      if (sub.drawnAmount !== undefined && !isMoney(sub.drawnAmount)) return `Subgrantee "${sub.name}" has an invalid drawn amount.`;
      if (sub.reportingStatus !== undefined && !VALID_REPORTING.includes(sub.reportingStatus)) {
        return `Subgrantee "${sub.name}" has an invalid reporting status.`;
      }
      if (!Array.isArray(sub.kpis)) return `Subgrantee "${sub.name}" has malformed KPIs.`;
      if (sub.kpis.length > MAX_LIST_LENGTH) return `Subgrantee "${sub.name}" has too many KPIs.`;
      for (const kpi of sub.kpis) {
        const err = validateKpiShape(kpi, `${sub.name}'s KPI`);
        if (err) return err;
      }
    }
  }

  return null;
}

/**
 * The draft-completion gate (P0-04): a new grant is only allowed to become a
 * persistent Firestore record once these are filled in. Everything else about
 * the grant can still be blank/default at that point.
 */
export function draftIncompleteReason(input: { name: string; funder: string; amount: number }): string | null {
  if (!input.name.trim()) return 'Enter a grant name before saving.';
  if (!input.funder.trim()) return 'Enter a funder before saving.';
  if (!(input.amount > 0)) return 'Enter an award amount greater than $0 before saving.';
  return null;
}

/** Returns a human-readable problem, or null if the program's present fields are valid. */
export function validateProgram(input: Partial<Omit<Program, 'id'>>): string | null {
  if (input.name !== undefined && (typeof input.name !== 'string' || input.name.trim().length === 0 || input.name.length >= 300)) {
    return 'Program name is required.';
  }
  if (input.description !== undefined && (typeof input.description !== 'string' || input.description.length > 4000)) {
    return 'Program description is too long.';
  }
  if (input.populationServed !== undefined && (typeof input.populationServed !== 'string' || input.populationServed.length > 1000)) {
    return 'Population served is too long.';
  }
  if (input.startDate !== undefined && input.startDate !== '' && !isValidDate(input.startDate)) return 'Start date is invalid.';
  if (input.endDate !== undefined && input.endDate !== '' && !isValidDate(input.endDate)) return 'End date is invalid.';
  if (input.startDate && input.endDate && input.startDate > input.endDate) return 'End date must be on or after the start date.';
  if (input.budgetNeed !== undefined && !isMoney(input.budgetNeed)) return 'Program cost must be a non-negative number.';
  return null;
}
