// All dates in Compass are plain calendar dates ('2026-10-06'), the same shape
// Twenty returns for a Date field. Doing the math on UTC calendar parts keeps
// results identical on every server and makes the tests deterministic.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;
const MS_PER_DAY = 86_400_000;

export type CalendarDate = { year: number; month: number; day: number };

export const parseIsoDate = (value: unknown): CalendarDate | null => {
  if (typeof value !== 'string') return null;

  const match = ISO_DATE.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));

  const isRealDate =
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day;

  return isRealDate ? { year, month, day } : null;
};

const toUtcMs = ({ year, month, day }: CalendarDate): number =>
  Date.UTC(year, month - 1, day);

export const formatIsoDate = ({ year, month, day }: CalendarDate): string =>
  [
    String(year).padStart(4, '0'),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-');

export const todayIso = (now: Date = new Date()): string =>
  formatIsoDate({
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
  });

// Whole days from `from` to `to`; negative when `to` is earlier.
export const daysBetween = (from: string, to: string): number | null => {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  if (!start || !end) return null;

  return Math.round((toUtcMs(end) - toUtcMs(start)) / MS_PER_DAY);
};

// Completed calendar months from `from` to `to`. Jan 31 to Feb 28 is 0 months
// because the day-of-month has not been reached yet.
export const monthsBetween = (from: string, to: string): number | null => {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  if (!start || !end) return null;

  const months =
    (end.year - start.year) * 12 + (end.month - start.month) - (end.day < start.day ? 1 : 0);

  return months;
};

export const addDays = (iso: string, days: number): string | null => {
  const date = parseIsoDate(iso);
  if (!date) return null;

  const moved = new Date(toUtcMs(date) + days * MS_PER_DAY);

  return formatIsoDate({
    year: moved.getUTCFullYear(),
    month: moved.getUTCMonth() + 1,
    day: moved.getUTCDate(),
  });
};

const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

// Adding a month to Jan 31 gives Feb 28 (or 29), never an overflow into March.
export const addMonths = (iso: string, months: number): string | null => {
  const date = parseIsoDate(iso);
  if (!date) return null;

  const total = date.year * 12 + (date.month - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12 + 12) % 12 + 1;
  const day = Math.min(date.day, daysInMonth(year, month));

  return formatIsoDate({ year, month, day });
};

export const isBefore = (a: string, b: string): boolean => {
  const days = daysBetween(a, b);
  return days !== null && days > 0;
};
