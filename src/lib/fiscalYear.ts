import { dayNumber } from './overview';

/**
 * Fiscal years. An organization picks the month its fiscal year starts (1 = January, 7 = July).
 * A fiscal year is named for the calendar year it ENDS in, the usual convention:
 * with a July start, July 2026 through June 2027 is FY2027. With a January start it is simply the calendar year.
 */

export const DEFAULT_FISCAL_START_MONTH = 1;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const isValidStartMonth = (m: unknown): m is number => Number.isInteger(m) && (m as number) >= 1 && (m as number) <= 12;

const pad = (n: number) => String(n).padStart(2, '0');

/** The fiscal year a date falls in, or null for an invalid date. */
export function fiscalYearOf(ymd: string, startMonth: number = DEFAULT_FISCAL_START_MONTH): number | null {
  if (dayNumber(ymd) === null) return null;
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(5, 7));
  return startMonth === 1 ? y : m >= startMonth ? y + 1 : y;
}

/** First and last day (YYYY-MM-DD) of a fiscal year. */
export function fiscalYearRange(fy: number, startMonth: number = DEFAULT_FISCAL_START_MONTH): { start: string; end: string } {
  if (startMonth === 1) return { start: `${fy}-01-01`, end: `${fy}-12-31` };
  const lastDay = new Date(Date.UTC(fy, startMonth - 1, 0)).getUTCDate(); // day 0 of the start month = last day of the month before it
  return { start: `${fy - 1}-${pad(startMonth)}-01`, end: `${fy}-${pad(startMonth - 1)}-${pad(lastDay)}` };
}

/** "FY2027 (Jul 2026 to Jun 2027)", or just "FY2026" for a January start. */
export function fiscalYearLabel(fy: number, startMonth: number = DEFAULT_FISCAL_START_MONTH): string {
  if (startMonth === 1) return `FY${fy}`;
  return `FY${fy} (${MONTHS[startMonth - 1]} ${fy - 1} to ${MONTHS[startMonth - 2]} ${fy})`;
}

/** True when the grant is active at any point during the fiscal year. */
export function grantTouchesFiscalYear(
  grant: { startDate: string; endDate: string },
  fy: number,
  startMonth: number = DEFAULT_FISCAL_START_MONTH
): boolean {
  const s = dayNumber(grant.startDate);
  const e = dayNumber(grant.endDate);
  const { start, end } = fiscalYearRange(fy, startMonth);
  const fs = dayNumber(start);
  const fe = dayNumber(end);
  if (s === null || e === null || fs === null || fe === null) return false;
  return s <= fe && e >= fs;
}
