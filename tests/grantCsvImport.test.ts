import { describe, it, expect } from 'vitest';
import {
  GRANT_CSV_COLUMNS,
  autoMapGrantHeaders,
  emptyGrantMapping,
  parseGrantCsvRows,
} from '../src/lib/grantCsvImport';
import { parseCSV } from '../src/lib/csvUtils';
import { Grant, Program } from '../types';

const PROGRAMS: Program[] = [
  { id: 'p1', name: 'Youth Workforce', description: '', populationServed: '', startDate: '', endDate: '' },
];

function mapFor(headers: string[]) {
  return autoMapGrantHeaders(headers);
}

describe('autoMapGrantHeaders', () => {
  it('maps the canonical template headers exactly', () => {
    const headers = GRANT_CSV_COLUMNS.map((c) => c.label);
    const m = mapFor(headers);
    expect(m.name).toBe('Grant Name');
    expect(m.funder).toBe('Funder');
    expect(m.amount).toBe('Award Amount');
    expect(m.spentAmount).toBe('Amount Spent');
    expect(m.startDate).toBe('Start Date');
    expect(m.endDate).toBe('End Date');
    expect(m.status).toBe('Status');
    expect(m.restriction).toBe('Restriction');
    expect(m.reportFrequency).toBe('Report Frequency');
    expect(m.programName).toBe('Program');
  });

  it('fuzzy-matches human variants', () => {
    const m = mapFor(['Project Title', 'Foundation', 'Total Award', 'Expenditure to Date', 'Begin Date', 'Close Date']);
    expect(m.name).toBe('Project Title');
    expect(m.funder).toBe('Foundation');
    expect(m.amount).toBe('Total Award');
    expect(m.spentAmount).toBe('Expenditure to Date');
    expect(m.startDate).toBe('Begin Date');
    expect(m.endDate).toBe('Close Date');
  });

  it('falls back to column order for required fields when nothing matches', () => {
    const m = mapFor(['Alpha', 'Beta', 'Gamma']);
    expect(m.name).toBe('Alpha');
    expect(m.funder).toBe('Beta');
    expect(m.amount).toBe('Gamma');
  });

  it('does not steal the Program column for the grant name', () => {
    const m = mapFor(['Program', 'Funder', 'Award Amount']);
    expect(m.programName).toBe('Program');
    expect(m.name).not.toBe('Program');
  });
});

describe('parseGrantCsvRows', () => {
  const headers = GRANT_CSV_COLUMNS.map((c) => c.label);
  const mapping = autoMapGrantHeaders(headers);

  it('converts a valid row, stripping $ and commas from money', () => {
    const rows = parseCSV('Grant Name,Funder,Award Amount\nYouth Expansion,Ford Foundation,"$150,000"').slice(1);
    const { grants, errors } = parseGrantCsvRows(rows, headers, mapping);
    expect(errors).toEqual([]);
    expect(grants).toHaveLength(1);
    expect(grants[0].grant).toMatchObject({
      name: 'Youth Expansion',
      funder: 'Ford Foundation',
      amount: 150000,
      status: 'active',
      kpis: [],
    });
  });

  it('normalizes MM/DD/YYYY dates to YYYY-MM-DD', () => {
    const lines = parseCSV('Grant Name,Funder,Award Amount,Start Date,End Date\nG,F,1000,01/15/2026,12/31/2026');
    const { grants, errors } = parseGrantCsvRows(lines.slice(1), lines[0], autoMapGrantHeaders(lines[0]));
    expect(errors).toEqual([]);
    expect(grants[0].grant.startDate).toBe('2026-01-15');
    expect(grants[0].grant.endDate).toBe('2026-12-31');
  });

  it('accepts enums case-insensitively and matches programs by name', () => {
    const lines = parseCSV(
      'Grant Name,Funder,Award Amount,Status,Restriction,Report Frequency,Program\nG,F,1000,Pending,Unrestricted,Quarterly,youth workforce',
    );
    const { grants, errors } = parseGrantCsvRows(lines.slice(1), lines[0], autoMapGrantHeaders(lines[0]), PROGRAMS);
    expect(errors).toEqual([]);
    expect(grants[0].grant).toMatchObject({
      status: 'pending',
      restriction: 'unrestricted',
      reportFrequency: 'quarterly',
      programId: 'p1',
    });
  });

  it('reports unmatched programs without failing the row', () => {
    const lines = parseCSV('Grant Name,Funder,Award Amount,Program\nG,F,1000,Nonexistent Program');
    const { grants, errors, unmatchedPrograms } = parseGrantCsvRows(lines.slice(1), lines[0], autoMapGrantHeaders(lines[0]), PROGRAMS);
    expect(errors).toEqual([]);
    expect(grants).toHaveLength(1);
    expect(grants[0].grant.programId).toBeUndefined();
    expect(unmatchedPrograms).toEqual(['Nonexistent Program']);
  });

  it('skips invalid rows with 1-based row numbers and keeps the valid ones', () => {
    const csv = [
      'Grant Name,Funder,Award Amount,Status,Start Date,End Date',
      'Good Grant,Ford,5000,active,2026-01-01,2026-12-31',
      ',Ford,5000,active,,', // missing name -> row 3
      'Bad Money,Ford,abc,active,,', // bad amount -> row 4
      'Bad Status,Ford,5000,bogus,,', // bad status -> row 5
      'Bad Dates,Ford,5000,active,2026-12-31,2026-01-01', // end before start -> row 6
    ].join('\n');
    const lines = parseCSV(csv);
    const { grants, errors } = parseGrantCsvRows(lines.slice(1), lines[0], autoMapGrantHeaders(lines[0]));
    expect(grants).toHaveLength(1);
    expect(grants[0].grant.name).toBe('Good Grant');
    expect(errors.map((e) => e.rowNumber)).toEqual([3, 4, 5, 6]);
    expect(errors[1].message).toMatch(/Award Amount/);
    expect(errors[2].message).toMatch(/Status/);
    expect(errors[3].message).toMatch(/before Start Date/);
  });

  it('flags duplicates against existing grants without blocking them', () => {
    const existing: Grant[] = [
      { id: 'g1', name: 'Youth Expansion', funder: 'Ford Foundation', amount: 1, startDate: '', endDate: '', status: 'active', kpis: [] },
    ];
    const rows = parseCSV('Grant Name,Funder,Award Amount\nYouth Expansion,Ford Foundation,2000').slice(1);
    const { grants, duplicateRows, errors } = parseGrantCsvRows(rows, headers, mapping, [], existing);
    expect(errors).toEqual([]);
    expect(grants).toHaveLength(1);
    expect(duplicateRows).toEqual([2]);
  });

  it('requires name, funder and amount columns to be mapped before import', () => {
    const m = emptyGrantMapping();
    expect(m.name).toBe('');
    expect(m.funder).toBe('');
    expect(m.amount).toBe('');
  });
});

describe('parseCSV (shared)', () => {
  it('handles quoted commas and escaped quotes', () => {
    const rows = parseCSV('a,b\n"hello, world","say ""hi"""');
    expect(rows[1]).toEqual(['hello, world', 'say "hi"']);
  });

  it('handles CRLF line endings', () => {
    const rows = parseCSV('a,b\r\n1,2\r\n3,4\r\n');
    expect(rows).toHaveLength(3);
  });
});
