import { currencyCodeOf, microsToUnits } from 'src/lib/money';

export type FinancialAmount = {
  amountMicros?: number | string | null;
  currencyCode?: string | null;
} | null | undefined;

// Financial records may use different currencies. Never combine unlike amounts.
export const sumAmountsInCurrency = (
  amounts: readonly FinancialAmount[],
  currency: string,
): number => {
  const targetCurrency = currency.toUpperCase();

  return amounts.reduce((total, amount) => {
    const units = microsToUnits(amount);

    if (units === null || currencyCodeOf(amount) !== targetCurrency) return total;

    return total + units;
  }, 0);
};

export const remainingBudget = (budget: number | null, spent: number): number | null =>
  budget === null ? null : Math.round((budget - spent) * 100) / 100;
