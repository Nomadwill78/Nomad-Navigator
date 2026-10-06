import { defineLogicFunction } from 'twenty-sdk/define';
import { Response, type RoutePayload } from 'twenty-sdk/logic-function';

import { LOGIC_FUNCTION_ID } from 'src/constants/universal-identifiers';
import { generateGrantReportDraft } from 'src/services/ai-insights';
import { liveAiDeps } from 'src/services/runtime';

const handler = async (event: RoutePayload) => {
  const grantId = (event.body as { grantId?: unknown } | null)?.grantId;

  if (typeof grantId !== 'string' || !grantId) {
    return new Response({ message: 'Send the id of the grant as grantId.' }, { status: 400 });
  }

  const outcome = await generateGrantReportDraft(liveAiDeps(), grantId);

  return new Response(outcome, { status: outcome.status === 'not-found' ? 404 : 200 });
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_ID.generateGrantReport,
  name: 'generate-grant-report',
  description: 'Drafts a funder report for one grant from its records. Used by the "Draft funder report" button on a grant.',
  timeoutSeconds: 180,
  httpRouteTriggerSettings: { path: '/compass/grant-report', httpMethod: 'POST', isAuthRequired: true },
  handler,
});
