import { remainingBudget, sumAmountsInCurrency } from 'src/lib/financials';
import { currencyCodeOf } from 'src/lib/money';

import { type RecordEvent } from 'src/services/donation-events';
import { money, unitsOf } from 'src/services/mappers';
import { type RollupDeps, recomputeGrant } from 'src/services/rollups';
import { COLLECTION, fetchAll, fetchOne, updateIfChanged } from 'src/services/repo';

const MONEY = { amountMicros: true, currencyCode: true } as const;

const EXPENSE_SELECTION = {
  amount: MONEY,
  budgetId: true,
  grantId: true,
};

const ensureComplete = (records: { truncated: boolean }, label: string): void => {
  if (records.truncated) throw new Error(`The ${label} ledger exceeds the safe query limit; totals were not updated.`);
};

export const recomputeBudgetLedger = async (deps: RollupDeps, budgetId: string): Promise<boolean> => {
  const budget = await fetchOne(deps.client, COLLECTION.budget, budgetId, {
    totalBudgetAmount: MONEY,
    totalSpentAmount: MONEY,
    remainingBalance: MONEY,
  });
  if (!budget) return false;

  const expenses = await fetchAll(
    deps.client,
    COLLECTION.expenseTransaction,
    EXPENSE_SELECTION,
    { budgetId: { eq: budgetId } },
  );
  ensureComplete(expenses, `budget ${budgetId}`);

  const currency = budget.totalBudgetAmount ? currencyCodeOf(budget.totalBudgetAmount) : deps.currency;
  const spentUnits = sumAmountsInCurrency(expenses.records.map((expense) => expense.amount), currency);
  const budgetUnits = unitsOf(budget.totalBudgetAmount);
  const next = {
    totalSpentAmount: money(spentUnits, currency),
    remainingBalance: money(remainingBudget(budgetUnits, spentUnits), currency),
  };

  return updateIfChanged(
    deps.client,
    COLLECTION.budget,
    {
      id: budget.id,
      totalSpentAmount: budget.totalSpentAmount ?? null,
      remainingBalance: budget.remainingBalance ?? null,
    },
    next,
  );
};

export const recomputeGrantLedger = async (deps: RollupDeps, grantId: string): Promise<boolean> => {
  const grant = await fetchOne(deps.client, COLLECTION.grant, grantId, {
    awardAmount: MONEY,
    totalExpended: MONEY,
  });
  if (!grant) return false;

  const expenses = await fetchAll(
    deps.client,
    COLLECTION.expenseTransaction,
    EXPENSE_SELECTION,
    { grantId: { eq: grantId } },
  );
  ensureComplete(expenses, `grant ${grantId}`);

  const currency = grant.awardAmount ? currencyCodeOf(grant.awardAmount) : deps.currency;
  const expendedUnits = sumAmountsInCurrency(expenses.records.map((expense) => expense.amount), currency);

  return updateIfChanged(
    deps.client,
    COLLECTION.grant,
    { id: grant.id, totalExpended: grant.totalExpended ?? null },
    { totalExpended: money(expendedUnits, currency) },
  );
};

const collectIds = (events: readonly RecordEvent[], field: 'budgetId' | 'grantId'): Set<string> => {
  const ids = new Set<string>();

  for (const event of events) {
    for (const side of [event.properties?.before, event.properties?.after]) {
      const id = side?.[field];
      if (typeof id === 'string' && id) ids.add(id);
    }
  }

  return ids;
};

export type FinancialEventSummary = {
  transactionsSeen: number;
  budgetsRecomputed: number;
  grantsRecomputed: number;
};

export const handleFinancialEvents = async (
  deps: RollupDeps,
  events: readonly RecordEvent[],
): Promise<FinancialEventSummary> => {
  const budgetIds = collectIds(events, 'budgetId');
  const grantIds = collectIds(events, 'grantId');

  // The event may only include changed columns. Re-read surviving rows so an
  // amount-only update still finds the record's current budget and grant.
  for (const event of events) {
    if (!event.recordId) continue;

    const transaction = await fetchOne(deps.client, COLLECTION.expenseTransaction, event.recordId, {
      budgetId: true,
      grantId: true,
    });
    if (typeof transaction?.budgetId === 'string') budgetIds.add(transaction.budgetId);
    if (typeof transaction?.grantId === 'string') grantIds.add(transaction.grantId);
  }

  let budgetsRecomputed = 0;
  let grantsRecomputed = 0;

  for (const budgetId of budgetIds) {
    if (await recomputeBudgetLedger(deps, budgetId)) budgetsRecomputed += 1;
  }

  for (const grantId of grantIds) {
    if (await recomputeGrantLedger(deps, grantId)) {
      grantsRecomputed += 1;
      await recomputeGrant(deps, grantId);
    }
  }

  return { transactionsSeen: events.length, budgetsRecomputed, grantsRecomputed };
};
