import { defineLogicFunction } from 'twenty-sdk/define';
import { type DatabaseEventBatchPayload } from 'twenty-sdk/logic-function';

import { LOGIC_FUNCTION_ID } from 'src/constants/universal-identifiers';
import { type RecordEvent } from 'src/services/donation-events';
import { liveRollupDeps } from 'src/services/runtime';
import { recomputePlanRollup } from 'src/services/rollups';

const handler = async (batch: DatabaseEventBatchPayload) => {
  const deps = liveRollupDeps();
  const ids = new Set(
    (batch.events as unknown as RecordEvent[])
      .map((event) => event.recordId)
      .filter((id): id is string => typeof id === 'string'),
  );

  for (const id of ids) await recomputePlanRollup(deps, id);

  return { plansRecomputed: ids.size };
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_ID.onPlanChanged,
  name: 'on-plan-changed',
  description: 'When a cultivation plan changes: recalculates its forecast value (planned ask times likelihood).',
  timeoutSeconds: 60,
  databaseEventTriggerSettings: { eventName: 'cultivationPlan.*', batchMode: true },
  handler,
});
