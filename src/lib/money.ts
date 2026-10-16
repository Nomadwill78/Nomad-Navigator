/**
 * One place for dollars: how they are limited, parsed from typing, rounded and shown.
 * Money is held as a plain number of dollars, rounded to whole cents everywhere.
 */

/** The largest amount accepted in any money field: one billion dollars. */
export const MAX_MONEY = 1_000_000_000;

export const roundCents = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export type MoneyParse = { ok: true; value: number } | { ok: false; reason: string };

/**
 * Reads what someone typed into a money box. Accepts "1234", "1,234.50", "$1234.5".
 * Never rounds quietly: more than 2 decimals, a minus sign, text or a huge number is refused with a reason.
 */
export function parseMoney(raw: string, max: number = MAX_MONEY): MoneyParse {
  const cleaned = raw.trim().replace(/^\$/, '').replace(/,/g, '').trim();
  if (cleaned === '') return { ok: false, reason: 'Enter an amount.' };
  if (cleaned.startsWith('-')) return { ok: false, reason: 'Amounts cannot be negative.' };
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === '.') return { ok: false, reason: 'Enter numbers only, like 1234.50.' };
  const decimals = cleaned.split('.')[1] ?? '';
  if (decimals.length > 2) return { ok: false, reason: 'Use at most 2 decimal places (dollars and cents).' };
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return { ok: false, reason: 'Enter numbers only, like 1234.50.' };
  if (value > max) return { ok: false, reason: `Amounts above ${formatMoney(max)} are not accepted.` };
  return { ok: true, value: roundCents(value) };
}

/** True for a usable stored amount: a finite, non-negative number within the limit. */
export const isValidMoney = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= MAX_MONEY;

/** "$150,000" for whole dollars, "$14,999.50" when there are cents. Never "$14,999.5". */
export function formatMoney(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  const hasCents = Math.round(Math.abs(v) * 100) % 100 !== 0;
  const body = Math.abs(v).toLocaleString('en-US', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  });
  return `${v < 0 ? '-' : ''}$${body}`;
}

/** Short form for tight spaces: $950, $12.5k, $1.2M, $1B. */
export function formatMoneyCompact(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  const abs = Math.abs(v);
  const trim = (x: number) => String(Math.round(x * 10) / 10).replace(/\.0$/, '');
  if (abs >= 1e9) return `${v < 0 ? '-' : ''}$${trim(abs / 1e9)}B`;
  if (abs >= 1e6) return `${v < 0 ? '-' : ''}$${trim(abs / 1e6)}M`;
  if (abs >= 1e3) return `${v < 0 ? '-' : ''}$${trim(abs / 1e3)}k`;
  return formatMoney(v);
}
