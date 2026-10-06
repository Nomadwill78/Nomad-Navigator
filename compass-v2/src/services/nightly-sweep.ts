import {
  planBackgroundCheckTask,
  planRenewalTask,
  planReportDueTask,
  type TaskPlan,
} from 'src/lib/stewardship';
import { dateOnly, DONATION_SELECTION, fullName } from 'src/services/mappers';
import { recomputeDonorRollup, recomputeGrant, type RollupDeps } from 'src/services/rollups';
import { chunk, COLLECTION, fetchAll, type RecordNode } from 'src/services/repo';
import { createTaskFromPlan, type KeyValueStore } from 'src/services/tasks';

// Time passing changes things nobody edited: a donor goes from Active to At
// risk, a report comes due, a background check expires. This runs every night
// to keep those true and to create the matching reminders.

// A first run on a freshly imported database can find hundreds of at-risk
// donors. Reminders are rationed and the most valuable donors go first, so the
// task list is useful on day one instead of buried.
export const MAX_RENEWAL_TASKS_PER_RUN = 15;
export const MAX_REPORT_TASKS_PER_RUN = 50;
export const MAX_BACKGROUND_TASKS_PER_RUN = 50;

export type SweepDeps = RollupDeps & { store: KeyValueStore };

export type SweepSummary = {
  donorsChecked: number;
  donorsUpdated: number;
  renewalTasksCreated: number;
  grantsChecked: number;
  reportTasksCreated: number;
  backgroundCheckTasksCreated: number;
  // True when a table was larger than a single run reads. The next run
  // continues to be correct for what was read; very large databases need
  // the batch size raised.
  truncated: boolean;
};

const createdCount = async (
  deps: SweepDeps,
  plans: readonly TaskPlan[],
  cap: number,
): Promise<number> => {
  let created = 0;

  for (const plan of plans) {
    if (created >= cap) break;
    if ((await createTaskFromPlan(deps.client, deps.store, plan)) === 'created') created += 1;
  }

  return created;
};

export const runNightlySweep = async (deps: SweepDeps): Promise<SweepSummary> => {
  const summary: SweepSummary = {
    donorsChecked: 0,
    donorsUpdated: 0,
    renewalTasksCreated: 0,
    grantsChecked: 0,
    reportTasksCreated: 0,
    backgroundCheckTasksCreated: 0,
    truncated: false,
  };

  // ---- donors: refresh giving status, then remind about the ones at risk
  const received = await fetchAll(deps.client, COLLECTION.donation, DONATION_SELECTION, {
    status: { eq: 'RECEIVED' },
  });
  summary.truncated ||= received.truncated;

  const byDonor = new Map<string, RecordNode[]>();
  for (const donation of received.records) {
    if (!donation.donorId) continue;
    byDonor.set(donation.donorId, [...(byDonor.get(donation.donorId) ?? []), donation]);
  }

  const atRisk: { person: RecordNode; lastGiftDate: string; lastGiftAmount: number | null; lifetime: number }[] = [];

  for (const ids of chunk([...byDonor.keys()], 50)) {
    const { records: people } = await fetchAll(
      deps.client,
      COLLECTION.person,
      {
        name: { firstName: true, lastName: true },
        contactTypes: true,
        outreachPermission: true,
        givingStatus: true,
        lifetimeGiving: { amountMicros: true, currencyCode: true },
        giftCount: true,
        firstGiftDate: true,
        lastGiftDate: true,
        lastGiftAmount: { amountMicros: true, currencyCode: true },
        largestGift: { amountMicros: true, currencyCode: true },
      },
      { id: { in: ids } },
    );

    for (const person of people) {
      const result = await recomputeDonorRollup(deps, person.id, {
        person,
        donations: byDonor.get(person.id) ?? [],
      });

      summary.donorsChecked += 1;
      if (result.status === 'updated') summary.donorsUpdated += 1;

      if (result.summary?.givingStatus === 'AT_RISK' && result.summary.lastGiftDate) {
        atRisk.push({
          person,
          lastGiftDate: result.summary.lastGiftDate,
          lastGiftAmount: result.summary.lastGiftAmount,
          lifetime: result.summary.lifetimeGiving,
        });
      }
    }
  }

  const renewalPlans = atRisk
    .sort((a, b) => b.lifetime - a.lifetime || a.person.id.localeCompare(b.person.id))
    .map((entry) =>
      planRenewalTask({
        personId: entry.person.id,
        personName: fullName(entry.person),
        lastGiftDate: entry.lastGiftDate,
        lastGiftAmount: entry.lastGiftAmount,
        currency: deps.currency,
        outreachPermission: (entry.person.outreachPermission as never) ?? null,
        asOf: deps.asOf,
      }),
    )
    .filter((plan): plan is TaskPlan => plan !== null);

  summary.renewalTasksCreated = await createdCount(deps, renewalPlans, MAX_RENEWAL_TASKS_PER_RUN);

  // ---- grants: pace and data checks move with the calendar; reports come due
  const grants = await fetchAll(
    deps.client,
    COLLECTION.grant,
    { name: true, status: true, funderId: true, nextReportDue: true },
    { status: { eq: 'ACTIVE' } },
  );
  summary.truncated ||= grants.truncated;

  const reportPlans: TaskPlan[] = [];

  for (const grant of grants.records) {
    summary.grantsChecked += 1;
    await recomputeGrant(deps, grant.id);

    const due = dateOnly(grant.nextReportDue);
    const plan = due
      ? planReportDueTask({
          grantId: grant.id,
          grantName: grant.name || 'Untitled grant',
          funderId: grant.funderId,
          nextReportDue: due,
          asOf: deps.asOf,
        })
      : null;

    if (plan) reportPlans.push(plan);
  }

  summary.reportTasksCreated = await createdCount(deps, reportPlans, MAX_REPORT_TASKS_PER_RUN);

  // ---- volunteers: background checks that are expiring or have expired
  const checks = await fetchAll(
    deps.client,
    COLLECTION.person,
    { name: { firstName: true, lastName: true }, backgroundCheckExpires: true, volunteerStatus: true },
    { backgroundCheckExpires: { is: 'NOT_NULL' } },
  );
  summary.truncated ||= checks.truncated;

  const backgroundPlans = checks.records
    // An inactive volunteer's expired check is not urgent.
    .filter((person) => person.volunteerStatus !== 'INACTIVE')
    .map((person) => {
      const expiresOn = dateOnly(person.backgroundCheckExpires);

      return expiresOn
        ? planBackgroundCheckTask({ personId: person.id, personName: fullName(person), expiresOn, asOf: deps.asOf })
        : null;
    })
    .filter((plan): plan is TaskPlan => plan !== null);

  summary.backgroundCheckTasksCreated = await createdCount(deps, backgroundPlans, MAX_BACKGROUND_TASKS_PER_RUN);

  return summary;
};

