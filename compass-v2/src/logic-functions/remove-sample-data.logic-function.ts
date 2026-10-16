import { defineLogicFunction } from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';

import { LOGIC_FUNCTION_ID } from 'src/constants/universal-identifiers';
import { liveClient, liveStore } from 'src/services/runtime';
import { removeSampleData } from 'src/services/sample-data';

const handler = async () => new Response(await removeSampleData(liveClient(), liveStore()), { status: 200 });

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_ID.removeSampleData,
  name: 'remove-sample-data',
  description: 'Removes exactly the sample records that were added, and any reminders created for them. Real records are never touched.',
  timeoutSeconds: 300,
  httpRouteTriggerSettings: { path: '/compass/sample-data/remove', httpMethod: 'POST', isAuthRequired: true },
  handler,
});
