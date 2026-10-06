import { defineLogicFunction } from 'twenty-sdk/define';
import { Response, type RoutePayload } from 'twenty-sdk/logic-function';

import { LOGIC_FUNCTION_ID } from 'src/constants/universal-identifiers';
import { importFromV1 } from 'src/services/import-v1';
import { liveClient, liveSettings } from 'src/services/runtime';

const handler = async (event: RoutePayload) => {
  const summary = await importFromV1(liveClient(), event.body, {
    currency: liveSettings().currency,
    thisYear: new Date().getUTCFullYear(),
  });

  return new Response(summary, { status: 200 });
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_ID.importFromV1,
  name: 'import-from-v1',
  description:
    'Brings grants, KPIs, subgrantees and program results over from Nomad Compass v1. Safe to run again: nothing already imported is duplicated. Use with scripts/import-v1.mjs.',
  timeoutSeconds: 300,
  httpRouteTriggerSettings: { path: '/compass/import-v1', httpMethod: 'POST', isAuthRequired: true },
  handler,
});
