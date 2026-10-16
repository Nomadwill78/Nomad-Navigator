import { defineLogicFunction } from 'twenty-sdk/define';
import { type DatabaseEventBatchPayload } from 'twenty-sdk/logic-function';

import { LOGIC_FUNCTION_ID } from 'src/constants/universal-identifiers';
import { type RecordEvent } from 'src/services/donation-events';
import { liveRollupDeps } from 'src/services/runtime';
import { recomputeGrant, recomputeKpi } from 'src/services/rollups';

const handler = async (batch: DatabaseEventBatchPayload) => {
  const deps = liveRollupDeps();
  const events = batch.events as unknown as RecordEvent[];
  const grantIds = new Set<string>();

  for (const event of events) {
    for (const side of [event.properties?.before, event.properties?.after]) {
      if (typeof side?.grantId === 'string') grantIds.add(side.grantId);
    }

    // A KPI that is not attached to a grant is still given its own status.
    if (event.properties?.after && event.recordId && !event.properties.after.grantId) {
      await recomputeKpi(deps, event.recordId);
    }
  }

  for (const grantId of grantIds) await recomputeGrant(deps, grantId);

  return { grantsRecomputed: grantIds.size };
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_ID.onKpiChanged,
  name: 'on-kpi-changed',
  description: 'When a KPI is added, changed or removed: works out its status and progress and refreshes its grant\'s overall progress and pace.',
  timeoutSeconds: 120,
  databaseEventTriggerSettings: { eventName: 'grantKpi.*', batchMode: true },
  handler,
});
