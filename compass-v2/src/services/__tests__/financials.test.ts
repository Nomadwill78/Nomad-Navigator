import { describe, expect, it } from 'vitest';

import { handleBudgetEvents, handleFinancialEvents, recomputeGrantLedger, type FinancialEventSummary } from 'src/services/financials';
import { createFakeClient, eur } from 'src/services/__tests__/fake-client';
import { recomputeGrant, type RollupDeps } from 'src/services/rollups';

const ASOF = '2026-10-06';
const deps = (client: RollupDeps['client']): RollupDeps => ({ client, asOf: ASOF, currency: 'USD' });

const grant = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: `Grant ${id}`,
  status: 'ACTIVE',
  funderId: null,
  awardAmount: eur(1200),
  spentAmount: null,
  totalExpended: eur(0),
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  reportFrequency: 'QUARTERLY',
  ...overrides,
});

const eventSummary = (overrides: Partial<FinancialEventSummary> = {}) => ({
  transactionsSeen: 1,
  budgetsRecomputed: 0,
  grantsRecomputed: 0,
  ...overrides,
});

describe('handleBudgetEvents', () => {
  it('calculates spending and remaining balance when a Budget is created', async () => {
    const fake = createFakeClient({
      budgets: [{ id: 'b1', totalBudgetAmount: eur(100), totalSpentAmount: eur(0), remainingBalance: eur(100) }],
      expenseTransactions: [
        { id: 'e1', amount: eur(35), budgetId: 'b1' },
        { id: 'e2', amount: eur(90, 'EUR'), budgetId: 'b1' },
      ],
    });

    const result = await handleBudgetEvents(deps(fake.client), [
      { recordId: 'b1', properties: { after: { totalBudgetAmount: eur(100) } } },
    ]);

    expect(result).toEqual({ budgetsSeen: 1, budgetsRecomputed: 1 });
    expect(fake.row('budgets', 'b1')).toMatchObject({
      totalSpentAmount: eur(35),
      remainingBalance: eur(65),
    });
  });

  it('recalculates ledger totals after budget currency and amount changes', async () => {
    const fake = createFakeClient({
      budgets: [{ id: 'b1', totalBudgetAmount: eur(100), totalSpentAmount: eur(20), remainingBalance: eur(80) }],
      expenseTransactions: [
        { id: 'e1', amount: eur(20), budgetId: 'b1' },
        { id: 'e2', amount: eur(15, 'EUR'), budgetId: 'b1' },
      ],
    });

    fake.row('budgets', 'b1')!.totalBudgetAmount = eur(70, 'EUR');
    const currencyChange = await handleBudgetEvents(deps(fake.client), [{ recordId: 'b1' }]);

    expect(currencyChange.budgetsRecomputed).toBe(1);
    expect(fake.row('budgets', 'b1')).toMatchObject({
      totalSpentAmount: eur(15, 'EUR'),
      remainingBalance: eur(55, 'EUR'),
    });

    fake.row('budgets', 'b1')!.totalBudgetAmount = eur(40, 'EUR');
    await handleBudgetEvents(deps(fake.client), [{ recordId: 'b1' }]);

    expect(fake.row('budgets', 'b1')!.remainingBalance).toEqual(eur(25, 'EUR'));
  });
});

describe('handleFinancialEvents', () => {
  it('recomputes budget totals and grant spending from same-currency expenses', async () => {
    const fake = createFakeClient({
      budgets: [{ id: 'b1', totalBudgetAmount: eur(1000), totalSpentAmount: eur(0), remainingBalance: eur(1000) }],
      grants: [grant('g1')],
      expenseTransactions: [
        { id: 'e1', amount: eur(200), budgetId: 'b1', grantId: 'g1' },
        { id: 'e2', amount: eur(100), budgetId: 'b1', grantId: 'g1' },
        { id: 'e3', amount: eur(900, 'EUR'), budgetId: 'b1', grantId: 'g1' },
      ],
    });

    const result = await handleFinancialEvents(deps(fake.client), [
      { recordId: 'e1', properties: { after: { budgetId: 'b1', grantId: 'g1' } } },
    ]);

    expect(result).toEqual(eventSummary({ budgetsRecomputed: 1, grantsRecomputed: 1 }));
    expect(fake.row('budgets', 'b1')).toMatchObject({
      totalSpentAmount: eur(300),
      remainingBalance: eur(700),
    });
    expect(fake.row('grants', 'g1')).toMatchObject({
      totalExpended: eur(300),
      percentSpent: 25,
    });
  });

  it('recalculates both the old and new budget and grant when an expense is reassigned', async () => {
    const fake = createFakeClient({
      budgets: [
        { id: 'b1', totalBudgetAmount: eur(500), totalSpentAmount: eur(125), remainingBalance: eur(375) },
        { id: 'b2', totalBudgetAmount: eur(500), totalSpentAmount: eur(0), remainingBalance: eur(500) },
      ],
      grants: [grant('g1', { totalExpended: eur(125) }), grant('g2')],
      expenseTransactions: [{ id: 'e1', amount: eur(125), budgetId: 'b2', grantId: 'g2' }],
    });

    const result = await handleFinancialEvents(deps(fake.client), [
      {
        recordId: 'e1',
        properties: {
          before: { budgetId: 'b1', grantId: 'g1' },
          after: { budgetId: 'b2', grantId: 'g2' },
        },
      },
    ]);

    expect(result).toEqual(eventSummary({ budgetsRecomputed: 2, grantsRecomputed: 2 }));
    expect(fake.row('budgets', 'b1')!.totalSpentAmount).toEqual(eur(0));
    expect(fake.row('budgets', 'b2')!.totalSpentAmount).toEqual(eur(125));
    expect(fake.row('grants', 'g1')!.totalExpended).toEqual(eur(0));
    expect(fake.row('grants', 'g2')!.totalExpended).toEqual(eur(125));
  });

  it('uses the before relation IDs to clear totals after a transaction is deleted', async () => {
    const fake = createFakeClient({
      budgets: [{ id: 'b1', totalBudgetAmount: eur(100), totalSpentAmount: eur(40), remainingBalance: eur(60) }],
      grants: [grant('g1', { totalExpended: eur(40) })],
      expenseTransactions: [],
    });

    const result = await handleFinancialEvents(deps(fake.client), [
      { recordId: 'deleted', properties: { before: { budgetId: 'b1', grantId: 'g1' }, after: null } },
    ]);

    expect(result).toEqual(eventSummary({ budgetsRecomputed: 1, grantsRecomputed: 1 }));
    expect(fake.row('budgets', 'b1')).toMatchObject({ totalSpentAmount: eur(0), remainingBalance: eur(100) });
    expect(fake.row('grants', 'g1')!.totalExpended).toEqual(eur(0));
  });

  it('recalculates a Grant ledger in its current award currency before spending metrics use it', async () => {
    const fake = createFakeClient({
      grants: [grant('g1', { awardAmount: eur(1200, 'EUR'), totalExpended: eur(500, 'USD') })],
      expenseTransactions: [
        { id: 'eUSD', amount: eur(200, 'USD'), grantId: 'g1' },
        { id: 'eEUR', amount: eur(150, 'EUR'), grantId: 'g1' },
      ],
    });

    await recomputeGrantLedger(deps(fake.client), 'g1');
    await recomputeGrant(deps(fake.client), 'g1');
    const grantRecord = fake.row('grants', 'g1')!;

    expect(grantRecord.totalExpended).toEqual(eur(150, 'EUR'));
    expect(grantRecord.percentSpent).toBe(12.5);
  });
});
