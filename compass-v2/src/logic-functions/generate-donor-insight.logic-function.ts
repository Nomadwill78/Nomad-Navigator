import { defineLogicFunction } from 'twenty-sdk/define';
import { Response, type RoutePayload } from 'twenty-sdk/logic-function';

import { LOGIC_FUNCTION_ID } from 'src/constants/universal-identifiers';
import { generateDonorInsight } from 'src/services/ai-insights';
import { liveAiDeps } from 'src/services/runtime';

const handler = async (event: RoutePayload) => {
  const personId = (event.body as { personId?: unknown } | null)?.personId;

  if (typeof personId !== 'string' || !personId) {
    return new Response({ message: 'Send the id of the person as personId.' }, { status: 400 });
  }

  const outcome = await generateDonorInsight(liveAiDeps(), personId);

  return new Response(outcome, { status: outcome.status === 'not-found' ? 404 : 200 });
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_ID.generateDonorInsight,
  name: 'generate-donor-insight',
  description: 'Writes an AI insight for one donor. Used by the "AI donor insight" button on a person\'s page.',
  timeoutSeconds: 180,
  httpRouteTriggerSettings: { path: '/compass/donor-insight', httpMethod: 'POST', isAuthRequired: true },
  handler,
});
