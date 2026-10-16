/**
 * Bulk grant CSV import: header auto-mapping, row validation and conversion
 * to Grant objects. Kept as pure functions so the mapping/validation rules
 * are unit-testable without rendering anything.
 */
import { Grant, GrantReportFrequency, Program } from '../../types';
import { normalizeDateCell, parseMoneyCell } from './csvUtils';

export type GrantCsvFieldKey =
  | 'name'
  | 'funder'
  | 'amount'
  | 'spentAmount'
  | 'startDate'
  | 'endDate'
  | 'status'
  | 'restriction'
  | 'reportFrequency'
  | 'programName';

export interface GrantCsvColumn {
  key: GrantCsvFieldKey;
  label: string;
  required: boolean;
  hint: string;
}

/** Canonical columns: the template and sample CSV use these exact headers. */
export const GRANT_CSV_COLUMNS: GrantCsvColumn[] = [
  { key: 'name', label: 'Grant Name', required: true, hint: 'e.g. Youth Workforce Expansion' },
  { key: 'funder', label: 'Funder', required: true, hint: 'e.g. Ford Foundation' },
  { key: 'amount', label: 'Award Amount', required: true, hint: 'Numbers only — $ and commas are fine' },
  { key: 'spentAmount', label: 'Amount Spent', required: false, hint: 'Spent so far; defaults to 0' },
  { key: 'startDate', label: 'Start Date', required: false, hint: 'YYYY-MM-DD' },
  { key: 'endDate', label: 'End Date', required: false, hint: 'YYYY-MM-DD' },
  { key: 'status', label: 'Status', required: false, hint: 'active, pending or completed (default: active)' },
  { key: 'restriction', label: 'Restriction', required: false, hint: 'restricted or unrestricted' },
  { key: 'reportFrequency', label: 'Report Frequency', required: false, hint: 'monthly, quarterly, semiannual, annual or none' },
  { key: 'programName', label: 'Program', required: false, hint: 'Matches an existing program by name' },
];

export const GRANT_CSV_SAMPLE_ROWS: (string | number)[][] = [
  ['Youth Workforce Expansion', 'Ford Foundation', 150000, 42500, '2026-01-01', '2026-12-31', 'active', 'restricted', 'quarterly', 'Youth Workforce'],
  ['Water Access Initiative', 'Bloomberg Philanthropies', 75000, 0, '2026-03-01', '2027-02-28', 'pending', 'unrestricted', 'annual', ''],
];

export type GrantFieldMapping = Record<GrantCsvFieldKey, string>;

/** Empty mapping: no CSV column assigned to any grant field. */
export function emptyGrantMapping(): GrantFieldMapping {
  return {
    name: '', funder: '', amount: '', spentAmount: '', startDate: '', endDate: '',
    status: '', restriction: '', reportFrequency: '', programName: '',
  };
}

const MATCHERS: { key: GrantCsvFieldKey; test: (lower: string) => boolean }[] = [
  { key: 'name', test: (l) => l.includes('grant') && l.includes('name') || /\bname\b/.test(l) && !l.includes('program') || l.includes('title') || l.includes('project') },
  { key: 'funder', test: (l) => l.includes('funder') || l.includes('foundation') || l.includes('donor') || l.includes('sponsor') || l.includes('grantor') },
  { key: 'amount', test: (l) => (l.includes('award') || l.includes('grant amount') || l.includes('funding amount') || l.includes('total award')) && !l.includes('spent') },
  { key: 'spentAmount', test: (l) => l.includes('spent') || l.includes('expenditure') || l.includes('disbursed') || (l.includes('amount') && l.includes('used')) },
  { key: 'startDate', test: (l) => l.includes('start') || l.includes('begin') || (l.includes('from') && l.includes('date')) },
  { key: 'endDate', test: (l) => l.includes('end') || l.includes('close') || l.includes('finish') || (l.includes('to') && l.includes('date')) },
  { key: 'status', test: (l) => l.includes('status') || l.includes('state') || l.includes('phase') },
  { key: 'restriction', test: (l) => l.includes('restrict') },
  { key: 'reportFrequency', test: (l) => l.includes('report') && (l.includes('freq') || l.includes('cadence')) || l.includes('reporting period') },
  { key: 'programName', test: (l) => l.includes('program') || l.includes('initiative') },
];

/**
 * Guess which CSV header belongs to which grant field. Falls back to column
 * order for the three required fields when nothing matches.
 */
export function autoMapGrantHeaders(headers: string[]): GrantFieldMapping {
  const mapping = emptyGrantMapping();
  const used = new Set<string>();
  for (const { key, test } of MATCHERS) {
    const hit = headers.find((h) => !used.has(h) && test(h.toLowerCase()));
    if (hit) {
      mapping[key] = hit;
      used.add(hit);
    }
  }
  // Column-order fallback for required fields, mirroring the metrics importer.
  const required: GrantCsvFieldKey[] = ['name', 'funder', 'amount'];
  required.forEach((key, i) => {
    if (!mapping[key] && headers[i] && !used.has(headers[i])) {
      mapping[key] = headers[i];
      used.add(headers[i]);
    }
  });
  return mapping;
}

export interface GrantRowError {
  rowNumber: number; // 1-based, counting the header as row 1
  message: string;
}

export interface ParsedGrantRow {
  grant: Omit<Grant, 'id'>;
  /** 1-based spreadsheet row number (header is row 1), for error/duplicate messages. */
  rowNumber: number;
}

export interface ParsedGrantImport {
  grants: ParsedGrantRow[];
  /** Row numbers (1-based incl. header) that failed validation and were skipped. */
  errors: GrantRowError[];
  /** Row numbers that look like duplicates of an existing grant (name + funder). */
  duplicateRows: number[];
  /** Program names that matched no existing program (left unassigned). */
  unmatchedPrograms: string[];
}

const STATUS_VALUES = ['active', 'pending', 'completed'] as const;
const RESTRICTION_VALUES = ['restricted', 'unrestricted'] as const;
// Must stay in sync with VALID_FREQUENCIES in src/lib/grantValidation.ts —
// the server rejects anything else, so the importer must too.
const FREQUENCY_VALUES: GrantReportFrequency[] = ['monthly', 'quarterly', 'semiannual', 'annual', 'none'];

function normalizeEnum<T extends string>(raw: string, allowed: readonly T[]): T | null {
  const v = raw.trim().toLowerCase();
  return (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

/**
 * Convert mapped CSV rows into Grant objects. Invalid rows are reported in
 * `errors` and skipped; everything else imports. `rowNumber` counts the
 * header row as row 1 so messages point at the right spreadsheet line.
 */
export function parseGrantCsvRows(
  rows: string[][],
  headers: string[],
  mapping: GrantFieldMapping,
  programs: Program[] = [],
  existingGrants: Grant[] = [],
): ParsedGrantImport {
  const idx = (key: GrantCsvFieldKey): number => (mapping[key] ? headers.indexOf(mapping[key]) : -1);
  const col = {
    name: idx('name'), funder: idx('funder'), amount: idx('amount'),
    spentAmount: idx('spentAmount'), startDate: idx('startDate'), endDate: idx('endDate'),
    status: idx('status'), restriction: idx('restriction'),
    reportFrequency: idx('reportFrequency'), programName: idx('programName'),
  };
  const cell = (row: string[], i: number): string => (i === -1 ? '' : (row[i] ?? '').trim());

  const existingKeys = new Set(
    existingGrants.map((g) => `${g.name.trim().toLowerCase()}|${g.funder.trim().toLowerCase()}`),
  );
  const programByName = new Map(programs.map((p) => [p.name.trim().toLowerCase(), p]));

  const grants: ParsedGrantRow[] = [];
  const errors: GrantRowError[] = [];
  const duplicateRows: number[] = [];
  const unmatchedPrograms = new Set<string>();

  rows.forEach((row, r) => {
    const rowNumber = r + 2; // +1 for 0-index, +1 for the header row
    const fail = (message: string) => errors.push({ rowNumber, message });

    const name = cell(row, col.name);
    const funder = cell(row, col.funder);
    const amountRaw = cell(row, col.amount);
    if (!name) return fail('Grant Name is required.');
    if (!funder) return fail('Funder is required.');
    const amount = parseMoneyCell(amountRaw);
    if (!amountRaw || amount <= 0) return fail(`Award Amount must be a number greater than 0 (got "${amountRaw || 'blank'}").`);

    const spentRaw = cell(row, col.spentAmount);
    const spentAmount = spentRaw ? parseMoneyCell(spentRaw) : 0;
    if (spentRaw && !/^[$\d,.\s]+$/.test(spentRaw)) {
      return fail(`Amount Spent must be a number (got "${spentRaw}").`);
    }

    let startDate = '';
    const startRaw = cell(row, col.startDate);
    if (startRaw) {
      const normalized = normalizeDateCell(startRaw);
      if (!normalized) return fail(`Start Date "${startRaw}" is not a recognizable date (use YYYY-MM-DD).`);
      startDate = normalized;
    }
    let endDate = '';
    const endRaw = cell(row, col.endDate);
    if (endRaw) {
      const normalized = normalizeDateCell(endRaw);
      if (!normalized) return fail(`End Date "${endRaw}" is not a recognizable date (use YYYY-MM-DD).`);
      endDate = normalized;
    }
    if (startDate && endDate && endDate < startDate) {
      return fail(`End Date (${endDate}) is before Start Date (${startDate}).`);
    }

    let status: Grant['status'] = 'active';
    const statusRaw = cell(row, col.status);
    if (statusRaw) {
      const normalized = normalizeEnum(statusRaw, STATUS_VALUES);
      if (!normalized) return fail(`Status "${statusRaw}" must be one of: active, pending, completed.`);
      status = normalized;
    }

    let restriction: Grant['restriction'];
    const restrictionRaw = cell(row, col.restriction);
    if (restrictionRaw) {
      const normalized = normalizeEnum(restrictionRaw, RESTRICTION_VALUES);
      if (!normalized) return fail(`Restriction "${restrictionRaw}" must be "restricted" or "unrestricted".`);
      restriction = normalized;
    }

    let reportFrequency: GrantReportFrequency | undefined;
    const freqRaw = cell(row, col.reportFrequency);
    if (freqRaw) {
      const normalized = normalizeEnum(freqRaw, FREQUENCY_VALUES);
      if (!normalized) {
        return fail(`Report Frequency "${freqRaw}" must be one of: monthly, quarterly, semiannual, annual, none.`);
      }
      reportFrequency = normalized;
    }

    let programId: string | undefined;
    const programRaw = cell(row, col.programName);
    if (programRaw) {
      const match = programByName.get(programRaw.toLowerCase());
      if (match) programId = match.id;
      else unmatchedPrograms.add(programRaw);
    }

    if (existingKeys.has(`${name.toLowerCase()}|${funder.toLowerCase()}`)) {
      duplicateRows.push(rowNumber);
    }

    grants.push({
      rowNumber,
      grant: {
        name, funder, amount, startDate, endDate, status,
        kpis: [],
        ...(spentAmount > 0 ? { spentAmount } : {}),
        ...(restriction ? { restriction } : {}),
        ...(reportFrequency ? { reportFrequency } : {}),
        ...(programId ? { programId } : {}),
      },
    });
  });

  return { grants, errors, duplicateRows, unmatchedPrograms: [...unmatchedPrograms] };
}

/** A grant with the same name + funder already exists in the portfolio. */
export function isDuplicateGrant(name: string, funder: string, existing: Grant[]): boolean {
  const key = `${name.trim().toLowerCase()}|${funder.trim().toLowerCase()}`;
  return existing.some((g) => `${g.name.trim().toLowerCase()}|${g.funder.trim().toLowerCase()}` === key);
}
