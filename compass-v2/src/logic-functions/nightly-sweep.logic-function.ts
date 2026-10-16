import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_ID } from 'src/constants/universal-identifiers';
import { runNightlySweep } from 'src/services/nightly-sweep';
import { liveRollupDeps, liveStore } from 'src/services/runtime';

const handler = async () => {
  const summary = await runNightlySweep({ ...liveRollupDeps(), store: liveStore() });

  console.log('Nightly sweep finished', JSON.stringify(summary));

  return summary;
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_ID.nightlySweep,
  name: 'nightly-sweep',
  description:
    'Every night: updates donor giving status as time passes, reminds you about donors at risk, grant reports coming due and expiring background checks.',
  timeoutSeconds: 600,
  // 06:30 UTC is the middle of the night across US time zones.
  cronTriggerSettings: { pattern: '30 6 * * *' },
  handler,
});
