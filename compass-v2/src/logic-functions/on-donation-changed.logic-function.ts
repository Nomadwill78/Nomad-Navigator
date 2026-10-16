import { defineLogicFunction } from 'twenty-sdk/define';
import { type DatabaseEventBatchPayload } from 'twenty-sdk/logic-function';

import { LOGIC_FUNCTION_ID } from 'src/constants/universal-identifiers';
import { handleDonationEvents, type RecordEvent } from 'src/services/donation-events';
import { liveRollupDeps, liveSettings, liveStore } from 'src/services/runtime';

const handler = async (batch: DatabaseEventBatchPayload) => {
  const summary = await handleDonationEvents(
    { ...liveRollupDeps(), store: liveStore(), majorGiftThreshold: liveSettings().majorGiftThreshold },
    batch.events as unknown as RecordEvent[],
  );

  console.log('Donations processed', JSON.stringify(summary));

  return summary;
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_ID.onDonationChanged,
  name: 'on-donation-changed',
  description:
    'When a donation is added, changed or removed: recalculates the donor, organization, campaign and grant totals, names new gifts, and creates the thank-you reminder.',
  timeoutSeconds: 300,
  databaseEventTriggerSettings: { eventName: 'donation.*', batchMode: true },
  handler,
});
