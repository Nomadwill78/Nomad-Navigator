import { defineLogicFunction } from 'twenty-sdk/define';
import { type DatabaseEventBatchPayload } from 'twenty-sdk/logic-function';

import { LOGIC_FUNCTION_ID } from 'src/constants/universal-identifiers';
import { type RecordEvent } from 'src/services/donation-events';
import { liveClient, liveRollupDeps } from 'src/services/runtime';
import { COLLECTION, fetchOne, updateRecord } from 'src/services/repo';
import { recomputeVolunteerRollup } from 'src/services/rollups';

const idsOf = (events: RecordEvent[], field: string): string[] => {
  const ids = new Set<string>();

  for (const event of events) {
    for (const side of [event.properties?.before, event.properties?.after]) {
      const value = side?.[field];
      if (typeof value === 'string' && value) ids.add(value);
    }
  }

  return [...ids];
};

const handler = async (batch: DatabaseEventBatchPayload) => {
  const events = batch.events as unknown as RecordEvent[];
  const deps = liveRollupDeps();
  const client = liveClient();

  // Name new entries after the volunteer, hours and date when left blank.
  for (const event of events) {
    if (event.properties?.before || !event.properties?.after || !event.recordId) continue;

    const log = await fetchOne(client, COLLECTION.volunteerLog, event.recordId, {
      name: true, hours: true, activityDate: true, volunteerId: true,
    });
    if (!log || String(log.name ?? '').trim()) continue;

    const volunteer = log.volunteerId
      ? await fetchOne(client, COLLECTION.person, log.volunteerId, { name: { firstName: true, lastName: true } })
      : null;
    const who = [volunteer?.name?.firstName, volunteer?.name?.lastName].filter(Boolean).join(' ') || 'Volunteer';
    const hours = typeof log.hours === 'number' ? `${log.hours}h` : '';

    await updateRecord(client, COLLECTION.volunteerLog, log.id, {
      name: [who, hours, String(log.activityDate ?? '').slice(0, 10)].filter(Boolean).join(' · '),
    });
  }

  let updated = 0;
  for (const personId of idsOf(events, 'volunteerId')) {
    if (await recomputeVolunteerRollup(deps, personId)) updated += 1;
  }

  return { volunteersUpdated: updated };
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_ID.onVolunteerLogChanged,
  name: 'on-volunteer-log-changed',
  description: 'When volunteer hours are added, changed or removed: recalculates the volunteer\'s approved hours and last shift.',
  timeoutSeconds: 120,
  databaseEventTriggerSettings: { eventName: 'volunteerLog.*', batchMode: true },
  handler,
});
