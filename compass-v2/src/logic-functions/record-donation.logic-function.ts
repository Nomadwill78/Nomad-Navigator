import { defineLogicFunction } from 'twenty-sdk/define';
import { Response, type RoutePayload } from 'twenty-sdk/logic-function';

import { LOGIC_FUNCTION_ID } from 'src/constants/universal-identifiers';
import { todayIso } from 'src/lib/dates';
import { liveClient } from 'src/services/runtime';
import { recordDonation, validateInboundDonation } from 'src/services/record-donation';

const handler = async (event: RoutePayload) => {
  const validation = validateInboundDonation(event.body, todayIso());

  if (!validation.ok) return new Response({ errors: validation.errors }, { status: 400 });

  const result = await recordDonation(liveClient(), validation.value);

  return new Response(result, { status: result.status === 'created' ? 201 : 200 });
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_ID.recordDonation,
  name: 'record-donation',
  description:
    'Lets Zapier, a payment processor or a website form record a gift. Finds or creates the donor, and never records the same reference number twice.',
  timeoutSeconds: 60,
  httpRouteTriggerSettings: { path: '/compass/record-donation', httpMethod: 'POST', isAuthRequired: true },
  handler,
});
