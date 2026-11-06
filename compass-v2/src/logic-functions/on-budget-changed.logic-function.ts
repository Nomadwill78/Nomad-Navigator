import { defineLogicFunction } from 'twenty-sdk/define';
import { type DatabaseEventBatchPayload } from 'twenty-sdk/logic-function';

import { LOGIC_FUNCTION_ID } from 'src/constants/universal-identifiers';
import { type RecordEvent } from 'src/services/donation-events';
import { handleBudgetEvents } from 'src/services/financials';
import { liveRollupDeps } from 'src/services/runtime';

const handler = async (batch: DatabaseEventBatchPayload) => {
  const summary = await handleBudgetEvents(
    liveRollupDeps(),
    batch.events as unknown as RecordEvent[],
  );

  console.log('Budgets processed', JSON.stringify(summary));

  return summary;
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_ID.onBudgetChanged,
  name: 'on-budget-changed',
  description:
    'When a budget is created or changed: recalculates its spending total and remaining balance from linked expenses.',
  timeoutSeconds: 120,
  databaseEventTriggerSettings: { eventName: 'budget.*', batchMode: true },
  handler,
});
