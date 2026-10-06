import { planThankYouTask } from 'src/lib/stewardship';
import { formatMoney } from 'src/lib/money';

import { DONATION_SELECTION, fullName, toDonationRow } from 'src/services/mappers';
import {
  recomputeCampaignRollup,
  recomputeCompanyRollup,
  recomputeDonorRollup,
  recomputeGrant,
  type RollupDeps,
} from 'src/services/rollups';
import { COLLECTION, fetchOne, updateRecord, type RecordNode } from 'src/services/repo';
import { createTaskFromPlan, type KeyValueStore } from 'src/services/tasks';

// The part of a database event this app relies on. Only plain id columns are
// read from the event; amounts and dates are re-read from Twenty's API, because
// that is the form the rest of the app already understands.
export type RecordEvent = {
  recordId?: string;
  properties?: {
    before?: Record<string, any> | null;
    after?: Record<string, any> | null;
  };
};

export type DonationEventDeps = RollupDeps & {
  store: KeyValueStore;
  majorGiftThreshold: number;
};

export type DonationEventSummary = {
  donorsRecomputed: number;
  organizationsRecomputed: number;
  campaignsRecomputed: number;
  grantsRecomputed: number;
  tasksCreated: number;
  donationsNamed: number;
};

const idsFrom = (events: readonly RecordEvent[], field: string): string[] => {
  const ids = new Set<string>();

  for (const event of events) {
    for (const side of [event.properties?.before, event.properties?.after]) {
      const value = side?.[field];
      if (typeof value === 'string' && value) ids.add(value);
    }
  }

  return [...ids];
};

// A created event has an "after" but no "before".
const createdIds = (events: readonly RecordEvent[]): string[] =>
  events
    .filter((event) => event.recordId && !event.properties?.before && event.properties?.after)
    .map((event) => event.recordId as string);

export const handleDonationEvents = async (
  deps: DonationEventDeps,
  events: readonly RecordEvent[],
): Promise<DonationEventSummary> => {
  const summary: DonationEventSummary = {
    donorsRecomputed: 0,
    organizationsRecomputed: 0,
    campaignsRecomputed: 0,
    grantsRecomputed: 0,
    tasksCreated: 0,
    donationsNamed: 0,
  };

  const donorSummaries = new Map<string, number>();

  // 1. Each affected donor, organization, campaign and grant is recalculated
  //    once, however many gifts changed in this batch (a spreadsheet import can
  //    deliver hundreds at a time).
  for (const donorId of idsFrom(events, 'donorId')) {
    const result = await recomputeDonorRollup(deps, donorId);

    if (result.status !== 'missing') summary.donorsRecomputed += 1;
    if (result.summary) donorSummaries.set(donorId, result.summary.giftCount);
  }
  for (const companyId of idsFrom(events, 'organizationDonorId')) {
    if (await recomputeCompanyRollup(deps, companyId)) summary.organizationsRecomputed += 1;
  }
  for (const campaignId of idsFrom(events, 'campaignId')) {
    if (await recomputeCampaignRollup(deps, campaignId)) summary.campaignsRecomputed += 1;
  }
  for (const grantId of idsFrom(events, 'grantId')) {
    if (await recomputeGrant(deps, grantId)) summary.grantsRecomputed += 1;
  }

  // 2. New gifts get a readable name and a thank-you reminder.
  for (const donationId of createdIds(events)) {
    const donation = await fetchOne(deps.client, COLLECTION.donation, donationId, DONATION_SELECTION);
    if (!donation) continue;

    const row = toDonationRow(donation);
    const donor = row.donorId
      ? await fetchOne(deps.client, COLLECTION.person, row.donorId, {
          name: { firstName: true, lastName: true },
          outreachPermission: true,
        })
      : null;
    const organization = row.companyId
      ? await fetchOne(deps.client, COLLECTION.company, row.companyId, { name: true })
      : null;

    const donorName = donor ? fullName(donor) : (organization?.name ?? 'Unknown donor');

    if (!String(donation.name ?? '').trim() && row.amountUnits !== null) {
      const name = [donorName, formatMoney(row.amountUnits, row.currency), row.giftDate].filter(Boolean).join(' · ');

      await updateRecord(deps.client, COLLECTION.donation, donationId, { name });
      summary.donationsNamed += 1;
    }

    if (donation.thankYouTaskCreated || row.amountUnits === null) continue;

    const plan = planThankYouTask({
      donationId,
      donorId: row.donorId,
      donorName,
      companyId: row.companyId,
      amount: row.amountUnits,
      currency: row.currency,
      giftDate: row.giftDate,
      status: row.status,
      isFirstGift: Boolean(row.donorId) && donorSummaries.get(row.donorId as string) === 1,
      isAnonymous: donation.isAnonymous === true,
      outreachPermission: (donor?.outreachPermission as never) ?? null,
      majorGiftThreshold: deps.majorGiftThreshold,
      asOf: deps.asOf,
    });

    if (plan && (await createTaskFromPlan(deps.client, deps.store, plan)) === 'created') {
      await updateRecord(deps.client, COLLECTION.donation, donationId, { thankYouTaskCreated: true });
      summary.tasksCreated += 1;
    }
  }

  return summary;
};

export type { RecordNode };
