import { defineLogicFunction } from 'twenty-sdk/define';
import { type DatabaseEventBatchPayload } from 'twenty-sdk/logic-function';

import { LOGIC_FUNCTION_ID } from 'src/constants/universal-identifiers';
import { nextDueAfterSubmission } from 'src/lib/grant';
import { dateOnly } from 'src/services/mappers';
import { type RecordEvent } from 'src/services/donation-events';
import { liveClient, liveRollupDeps } from 'src/services/runtime';
import { COLLECTION, fetchOne, updateRecord } from 'src/services/repo';
import { recomputeCompanyRollup, recomputeGrant } from 'src/services/rollups';

const handler = async (batch: DatabaseEventBatchPayload) => {
  const deps = liveRollupDeps();
  const client = liveClient();
  const events = batch.events as unknown as RecordEvent[];

  const grantIds = new Set<string>();
  const funderIds = new Set<string>();

  for (const event of events) {
    if (event.recordId) grantIds.add(event.recordId);

    // A grant that moved to another funder changes both funders' totals.
    for (const side of [event.properties?.before, event.properties?.after]) {
      if (typeof side?.funderId === 'string') funderIds.add(side.funderId);
    }

    // Setting "Last report submitted on" moves "Next report due" to the next cycle.
    const updatedFields: string[] = (event.properties as { updatedFields?: string[] } | undefined)?.updatedFields ?? [];

    if (event.recordId && updatedFields.includes('lastReportSubmittedOn')) {
      const grant = await fetchOne(client, COLLECTION.grant, event.recordId, {
        lastReportSubmittedOn: true, nextReportDue: true, startDate: true, reportFrequency: true,
      });
      const submittedOn = dateOnly(grant?.lastReportSubmittedOn);

      if (grant && submittedOn && grant.reportFrequency) {
        const next = nextDueAfterSubmission({
          currentDue: dateOnly(grant.nextReportDue),
          startDate: dateOnly(grant.startDate),
          submittedOn,
          frequency: grant.reportFrequency,
        });

        if (next && next !== dateOnly(grant.nextReportDue)) {
          await updateRecord(client, COLLECTION.grant, grant.id, { nextReportDue: next });
        }
      }
    }
  }

  for (const grantId of grantIds) await recomputeGrant(deps, grantId);
  for (const funderId of funderIds) await recomputeCompanyRollup(deps, funderId);

  return { grantsRecomputed: grantIds.size, fundersRecomputed: funderIds.size };
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_ID.onGrantChanged,
  name: 'on-grant-changed',
  description:
    'When a grant changes: refreshes its progress, pace, spending and data check, updates the funder\'s totals, and moves the next report date forward after a report is submitted.',
  timeoutSeconds: 120,
  databaseEventTriggerSettings: { eventName: 'grant.*', batchMode: true },
  handler,
});
