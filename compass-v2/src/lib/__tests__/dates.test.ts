import { describe, expect, it } from 'vitest';

import { addDays, addMonths, daysBetween, isBefore, monthsBetween, parseIsoDate, todayIso } from 'src/lib/dates';

describe('parseIsoDate', () => {
  it('accepts real dates and date-times', () => {
    expect(parseIsoDate('2026-02-28')).toEqual({ year: 2026, month: 2, day: 28 });
    expect(parseIsoDate('2026-02-28T10:00:00.000Z')).toEqual({ year: 2026, month: 2, day: 28 });
  });

  it('rejects impossible and malformed dates', () => {
    for (const value of ['2026-02-30', '2026-13-01', 'not a date', '', null, undefined, 20260101]) {
      expect(parseIsoDate(value)).toBeNull();
    }
  });
});

describe('date math', () => {
  it('counts days across month and year boundaries', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
    expect(daysBetween('2026-03-10', '2026-03-01')).toBe(-9);
    expect(daysBetween('bad', '2026-03-01')).toBeNull();
  });

  it('counts only completed months', () => {
    expect(monthsBetween('2026-01-15', '2026-02-14')).toBe(0);
    expect(monthsBetween('2026-01-15', '2026-02-15')).toBe(1);
    expect(monthsBetween('2025-01-31', '2026-01-30')).toBe(11);
    expect(monthsBetween('2024-10-06', '2026-10-06')).toBe(24);
  });

  it('adds months without overflowing short months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
    expect(addMonths('2026-03-15', -4)).toBe('2025-11-15');
  });

  it('adds days across boundaries', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('compares dates', () => {
    expect(isBefore('2026-01-01', '2026-01-02')).toBe(true);
    expect(isBefore('2026-01-02', '2026-01-02')).toBe(false);
  });

  it('formats today in UTC', () => {
    expect(todayIso(new Date('2026-10-06T23:59:59Z'))).toBe('2026-10-06');
  });
});
