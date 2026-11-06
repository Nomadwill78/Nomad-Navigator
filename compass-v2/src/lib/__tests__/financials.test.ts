import { describe, expect, it } from 'vitest';

import { remainingBudget, sumAmountsInCurrency } from 'src/lib/financials';

const amount = (units: number, currencyCode = 'USD') => ({
  amountMicros: Math.round(units * 1_000_000),
  currencyCode,
});

describe('financial ledger arithmetic', () => {
  it('adds only finite amounts in the selected currency', () => {
    expect(sumAmountsInCurrency([amount(15.25), amount(4.75), amount(900, 'EUR'), null], 'USD')).toBe(20);
  });

  it('matches currency codes without regard to letter case', () => {
    expect(sumAmountsInCurrency([amount(100, 'usd')], 'USD')).toBe(100);
  });

  it('keeps remaining balance empty until a budget amount is entered', () => {
    expect(remainingBudget(null, 25)).toBeNull();
  });

  it('rounds the remaining balance to cents and allows overspending to show as negative', () => {
    expect(remainingBudget(100, 25.25)).toBe(74.75);
    expect(remainingBudget(100, 125.25)).toBe(-25.25);
  });
});
