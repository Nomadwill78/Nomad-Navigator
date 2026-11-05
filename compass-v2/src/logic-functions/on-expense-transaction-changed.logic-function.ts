import { defineLogicFunction } from 'twenty-sdk/define';
import { type DatabaseEventBatchPayload } from 'twenty-sdk/logic-function';

import { LOGIC_FUNCTION_ID } from 'src/constants/universal-identifiers';
import { handleFinancialEvents } from 'src/services/financials';
import { type RecordEvent } from 'src/services/donation-events';
import { liveRollupDeps } from 'src/services/runtime';

const handler = async (batch: DatabaseEventBatchPayload) => {
  const summary = await handleFinancialEvents(
    liveRollupDeps(),
    batch.events as unknown as RecordEvent[],
  );

  console.log('Expense transactions processed', JSON.stringify(summary));

  return summary;
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_ID.onExpenseTransactionChanged,
  name: 'on-expense-transaction-changed',
  description:
    'When an expense is added, changed or removed: recalculates its budget and grant ledger totals and refreshes the grant spending rate.',
  timeoutSeconds: 300,
  databaseEventTriggerSettings: { eventName: 'expenseTransaction.*', batchMode: true },
  handler,
});
