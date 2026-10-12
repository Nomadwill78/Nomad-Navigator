import { describe, it, expect } from 'vitest';
import { parseMoney, formatMoney, formatMoneyCompact, roundCents, MAX_MONEY, isValidMoney } from '../src/lib/money';

describe('parseMoney (issue 1: cents)', () => {
  it('keeps cents exactly', () => {
    expect(parseMoney('1234.5')).toEqual({ ok: true, value: 1234.5 });
    expect(parseMoney('47000.25')).toEqual({ ok: true, value: 47000.25 });
    expect(parseMoney('1234.')).toEqual({ ok: true, value: 1234 });
    expect(parseMoney('0.1')).toEqual({ ok: true, value: 0.1 });
  });
  it('accepts commas and a dollar sign', () => {
    expect(parseMoney('$1,234.50')).toEqual({ ok: true, value: 1234.5 });
  });
  it('refuses, with a reason, instead of quietly changing the number', () => {
    for (const bad of ['', 'abc', '-5', '1.234', '1e5', '.', '12.3.4']) {
      const r = parseMoney(bad);
      expect(r.ok).toBe(false);
    }
    expect((parseMoney('1.234') as any).reason).toMatch(/2 decimal/);
  });
  it('refuses amounts over the limit', () => {
    expect(parseMoney('1000000000').ok).toBe(true);
    const r = parseMoney('99000000000');
    expect(r.ok).toBe(false);
    expect((r as any).reason).toContain('$1,000,000,000');
  });
});

describe('formatMoney (small issue: two decimals)', () => {
  it('shows two decimals when there are cents, none for whole dollars', () => {
    expect(formatMoney(14999.5)).toBe('$14,999.50');
    expect(formatMoney(5000.5)).toBe('$5,000.50');
    expect(formatMoney(150000)).toBe('$150,000');
    expect(formatMoney(0.07)).toBe('$0.07');
  });
  it('never prints NaN', () => {
    expect(formatMoney(NaN)).toBe('$0');
  });
  it('compact form never produces nonsense like $100000000k', () => {
    expect(formatMoneyCompact(150000)).toBe('$150k');
    expect(formatMoneyCompact(12500)).toBe('$12.5k');
    expect(formatMoneyCompact(1_200_000)).toBe('$1.2M');
    expect(formatMoneyCompact(MAX_MONEY)).toBe('$1B');
    expect(formatMoneyCompact(950)).toBe('$950');
    expect(formatMoneyCompact(99_000_000_000)).toBe('$99B');
  });
});

describe('helpers', () => {
  it('rounds to cents and validates stored amounts', () => {
    expect(roundCents(1.005 * 100 / 100)).toBeCloseTo(1.01, 2);
    expect(isValidMoney(5)).toBe(true);
    expect(isValidMoney(-1)).toBe(false);
    expect(isValidMoney(MAX_MONEY + 1)).toBe(false);
    expect(isValidMoney(NaN)).toBe(false);
  });
});
