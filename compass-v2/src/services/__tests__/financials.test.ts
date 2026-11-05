import { describe, expect, it } from 'vitest';

import { handleFinancialEvents, type FinancialEventSummary } from 'src/services/financials';
import { createFakeClient, eur } from 'src/services/__tests__/fake-client';
import { type RollupDeps } from 'src/services/rollups';

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
});
