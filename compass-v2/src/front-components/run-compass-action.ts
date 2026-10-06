import { RestApiClient } from 'twenty-client-sdk/rest';
import { enqueueSnackbar } from 'twenty-sdk/front-component';

import { type ActionOutcome, type Message, describeRequestError } from 'src/lib/outcome-messages';

// Runs one of Compass's routes and shows the person the result. Every button in
// the app goes through here so they all behave and read the same way.
export const runCompassAction = async (
  path: string,
  body: Record<string, unknown> | undefined,
  describe: (outcome: ActionOutcome) => Message,
): Promise<void> => {
  let message: Message;

  try {
    message = describe(await new RestApiClient().post<ActionOutcome>(path, body));
  } catch (error) {
    message = describeRequestError(error);
  }

  await enqueueSnackbar({ ...message, duration: message.variant === 'success' ? 6000 : 12000 });
};
