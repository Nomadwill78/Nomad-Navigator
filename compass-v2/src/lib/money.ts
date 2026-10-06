// Twenty stores money as whole millionths of a currency unit (a $25.00 gift is
// 25_000_000 micros) next to a currency code.
export const MICROS_PER_UNIT = 1_000_000;

export type CurrencyValue = {
  amountMicros?: number | string | null;
  currencyCode?: string | null;
} | null;

export const DEFAULT_CURRENCY = 'USD';

export const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;

  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};

export const microsToUnits = (value: CurrencyValue | undefined): number | null => {
  const micros = toNumber(value?.amountMicros);

  return micros === null ? null : micros / MICROS_PER_UNIT;
};

export const currencyCodeOf = (value: CurrencyValue | undefined): string =>
  (value?.currencyCode ?? DEFAULT_CURRENCY).toUpperCase();

// Rounded to cents first so 0.1 + 0.2 style float drift never reaches a record.
export const unitsToCurrencyValue = (
  units: number,
  currencyCode: string = DEFAULT_CURRENCY,
): { amountMicros: number; currencyCode: string } => ({
  amountMicros: Math.round(Math.round(units * 100) * (MICROS_PER_UNIT / 100)),
  currencyCode,
});

export const formatMoney = (
  units: number,
  currencyCode: string = DEFAULT_CURRENCY,
): string => {
  const hasCents = Math.round(units * 100) % 100 !== 0;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(units);
};

export const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
};

// Rounds toward zero. Progress shown to a funder must never be rounded up past
// what was actually achieved (99.96% is not "100%"). The tiny epsilon only
// absorbs binary float noise such as 0.3 / 1 * 100 = 30.000000000000004.
export const floorTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;

  return Math.floor(value * factor + 1e-9) / factor;
};
