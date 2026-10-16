import { defineLogicFunction } from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';

import { LOGIC_FUNCTION_ID } from 'src/constants/universal-identifiers';
import { liveClient, liveRollupDeps, liveStore } from 'src/services/runtime';
import { seedSampleData } from 'src/services/sample-data';

const handler = async () => {
  const { asOf, currency } = liveRollupDeps();
  const result = await seedSampleData(liveClient(), liveStore(), asOf, currency);

  return new Response(result, { status: result.status === 'created' ? 201 : 200 });
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_ID.addSampleData,
  name: 'add-sample-data',
  description: 'Adds clearly labeled (SAMPLE) donors, gifts, grants and volunteers so you can try Compass before entering real data.',
  timeoutSeconds: 300,
  httpRouteTriggerSettings: { path: '/compass/sample-data', httpMethod: 'POST', isAuthRequired: true },
  handler,
});
