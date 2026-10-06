import { defineLogicFunction } from 'twenty-sdk/define';
import { type DatabaseEventBatchPayload } from 'twenty-sdk/logic-function';

import { LOGIC_FUNCTION_ID } from 'src/constants/universal-identifiers';
import { type RecordEvent } from 'src/services/donation-events';
import { liveRollupDeps } from 'src/services/runtime';
import { recomputeProgramMetric } from 'src/services/rollups';

const handler = async (batch: DatabaseEventBatchPayload) => {
  const deps = liveRollupDeps();
  const ids = new Set(
    (batch.events as unknown as RecordEvent[])
      .map((event) => event.recordId)
      .filter((id): id is string => typeof id === 'string'),
  );

  for (const id of ids) await recomputeProgramMetric(deps, id);

  return { metricsRecomputed: ids.size };
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_ID.onProgramMetricChanged,
  name: 'on-program-metric-changed',
  description: 'When monthly program results change: works out the cost per person.',
  timeoutSeconds: 60,
  databaseEventTriggerSettings: { eventName: 'programMetric.*', batchMode: true },
  handler,
});
