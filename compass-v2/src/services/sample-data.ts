import { addDays, addMonths } from 'src/lib/dates';
import { money } from 'src/services/mappers';
import {
  chunk,
  COLLECTION,
  createRecord,
  fetchAll,
  softDeleteRecord,
  type Collection,
  type GraphqlClient,
} from 'src/services/repo';
import { type KeyValueStore } from 'src/services/tasks';

// Sample data lets a new user see every screen working before entering anything
// real. It is labeled "(SAMPLE)" everywhere and uses addresses that can never
// receive mail (.invalid). The ids of everything created are remembered, so
// "Remove sample data" deletes exactly those records and nothing else.

export const SAMPLE_KEY = 'compass:sample-data:ids';
export const SAMPLE_TAG = '(SAMPLE)';

type CollectionKey = keyof typeof COLLECTION;
type Remembered = Partial<Record<CollectionKey, string[]>>;

export type SeedResult =
  | { status: 'created'; counts: Record<string, number> }
  | { status: 'already-present' };

export const seedSampleData = async (
  client: GraphqlClient,
  store: KeyValueStore,
  asOf: string,
  currency = 'USD',
): Promise<SeedResult> => {
  if (await store.get(SAMPLE_KEY)) return { status: 'already-present' };

  const remembered: Remembered = {};
  const make = async (key: CollectionKey, data: Record<string, unknown>): Promise<string> => {
    const { id } = await createRecord(client, COLLECTION[key] as Collection, data);

    (remembered[key] ??= []).push(id);

    return id;
  };

  // Everything is dated relative to today so the giving statuses and report
  // reminders look right whenever the data is added.
  const ago = (days: number) => addDays(asOf, -days) as string;
  const ahead = (days: number) => addDays(asOf, days) as string;
  const monthsAgo = (months: number) => addMonths(asOf, -months) as string;
  const cash = (units: number) => money(units, currency);

  const person = (first: string, last: string, extra: Record<string, unknown> = {}) =>
    make('person', {
      name: { firstName: first, lastName: `${last} ${SAMPLE_TAG}` },
      emails: { primaryEmail: `${first}.${last}.sample@example.invalid`.toLowerCase() },
      outreachPermission: 'OK_TO_CONTACT',
      ...extra,
    });

  // ---- organizations
  const riverbend = await make('company', { name: `Riverbend Foundation ${SAMPLE_TAG}`, organizationTypes: ['FOUNDATION'] });
  const credit = await make('company', { name: `Harbor Credit Union ${SAMPLE_TAG}`, organizationTypes: ['CORPORATE'] });

  // ---- people: one for each giving status, plus volunteers and a prospect
  const ava = await person('Ava', 'Carter', { contactTypes: ['DONOR'] });
  const ben = await person('Ben', 'Okafor', { contactTypes: ['DONOR'] });
  const carla = await person('Carla', 'Mendez', { contactTypes: ['DONOR'] });
  const dev = await person('Dev', 'Patel', { contactTypes: ['DONOR'] });
  const elena = await person('Elena', 'Rossi', { contactTypes: ['DONOR'] });
  const frank = await person('Frank', 'Liu', { contactTypes: ['DONOR', 'BOARD_MEMBER'], capacityRating: 'K10_TO_100K' });
  const grace = await person('Grace', 'Howard', { contactTypes: ['PROSPECT'] });
  const hector = await person('Hector', 'Silva', {
    contactTypes: ['VOLUNTEER'],
    volunteerStatus: 'ACTIVE',
    volunteerSkills: ['MENTORING', 'EVENTS'],
    backgroundCheckStatus: 'CLEARED',
    backgroundCheckExpires: ahead(20),
  });
  const ivy = await person('Ivy', 'Brooks', { contactTypes: ['DONOR', 'VOLUNTEER'], outreachPermission: 'NO_ASKS', volunteerStatus: 'ACTIVE' });
  const jon = await person('Jon', 'Weber', { contactTypes: ['DONOR'], outreachPermission: 'DO_NOT_CONTACT' });

  // ---- campaigns
  const spring = await make('fundraisingCampaign', {
    name: `Spring Appeal ${SAMPLE_TAG}`, campaignType: 'ANNUAL_APPEAL', status: 'ACTIVE',
    goalAmount: cash(20000), startDate: monthsAgo(3), endDate: ahead(30),
  });
  await make('fundraisingCampaign', {
    name: `Year-End Giving ${SAMPLE_TAG}`, campaignType: 'GIVING_DAY', status: 'PLANNING', goalAmount: cash(50000),
  });

  // ---- donations. Every gift is more than two weeks old, so adding sample
  //      data never creates thank-you tasks.
  const gift = (
    donorId: string | null,
    amount: number,
    giftDate: string,
    extra: Record<string, unknown> = {},
  ) =>
    make('donation', {
      name: '', status: 'RECEIVED', giftType: 'ONE_TIME', amount: cash(amount), giftDate,
      ...(donorId ? { donorId } : {}), ...extra,
    });

  for (const months of [1, 3, 5, 7, 9]) await gift(ava, 50, monthsAgo(months), { giftType: 'RECURRING' });
  await gift(ben, 100, monthsAgo(3), { campaignId: spring });
  await gift(carla, 250, monthsAgo(10));
  await gift(carla, 200, monthsAgo(22));
  await gift(dev, 150, monthsAgo(16));
  await gift(elena, 75, monthsAgo(30));
  await gift(frank, 2500, monthsAgo(4), { campaignId: spring });
  await gift(frank, 2000, monthsAgo(16));
  await gift(ivy, 120, monthsAgo(2), { campaignId: spring });
  await gift(jon, 500, monthsAgo(6));
  await gift(null, 5000, monthsAgo(2), { organizationDonorId: credit, giftType: 'ONE_TIME' });

  // ---- grants with KPIs, a subgrantee and monthly program results
  const water = await make('grant', {
    name: `Clean Water Initiative ${SAMPLE_TAG}`, status: 'ACTIVE', funderId: riverbend,
    awardAmount: cash(60000), spentAmount: cash(24000),
    startDate: ago(150), endDate: ahead(215),
    reportFrequency: 'QUARTERLY', nextReportDue: ahead(10),
    purpose: 'Install wells and train local maintenance crews.',
  });
  const co_op = await make('subgrantee', { name: `Community Wells Co-op ${SAMPLE_TAG}`, status: 'ACTIVE', allocatedAmount: cash(15000), grantId: water });
  await make('grantKpi', { name: 'Households with clean water', unit: 'households', target: 400, current: 120, asOfDate: ago(10), measurementMethod: 'Household survey after each well opens', grantId: water });
  await make('grantKpi', { name: 'Wells built', unit: 'wells', target: 12, current: 6, asOfDate: ago(10), measurementMethod: 'Site inspection reports', grantId: water });
  await make('grantKpi', { name: 'Maintenance crew members trained', unit: 'people', target: 30, current: 14, asOfDate: ago(20), measurementMethod: 'Training sign-in sheets', grantId: water, subgranteeId: co_op });

  const literacy = await make('grant', {
    name: `After-School Literacy ${SAMPLE_TAG}`, status: 'ACTIVE', funderId: riverbend,
    awardAmount: cash(25000), spentAmount: cash(14000),
    startDate: ago(200), endDate: ahead(165),
    reportFrequency: 'ANNUAL', nextReportDue: ahead(120),
  });
  await make('grantKpi', { name: 'Students tutored', unit: 'students', target: 100, current: 70, asOfDate: ago(15), measurementMethod: 'Attendance records', grantId: literacy });

  await make('grant', {
    name: `Youth Mentoring Pilot ${SAMPLE_TAG}`, status: 'APPLYING', funderId: riverbend,
    requestedAmount: cash(40000), applicationDeadline: ahead(30),
  });

  for (const [months, served, cost] of [[3, 85, 9800], [2, 102, 11200], [1, 118, 12100]] as const) {
    await make('programMetric', { name: 'Tutoring', period: monthsAgo(months), peopleServed: served, totalCost: cash(cost), grantId: literacy });
  }

  // ---- cultivation: three relationships at different stages
  await make('cultivationPlan', {
    name: `Frank Liu, major gift ${SAMPLE_TAG}`, stage: 'SOLICITATION', donorId: frank,
    askAmount: cash(10000), purpose: 'Naming a classroom', nextStep: 'Follow up on the proposal sent last week', nextStepDate: ago(3),
  });
  await make('cultivationPlan', { name: `Grace Howard, introduction ${SAMPLE_TAG}`, stage: 'IDENTIFICATION', donorId: grace, nextStep: 'Invite to the open house', nextStepDate: ahead(14) });
  await make('cultivationPlan', {
    name: `Harbor Credit Union, sponsorship ${SAMPLE_TAG}`, stage: 'CULTIVATION', organizationId: credit,
    askAmount: cash(5000), nextStep: 'Tour of the learning center', nextStepDate: ahead(5),
  });

  // ---- volunteer hours
  for (const [days, hours, status] of [[40, 3, 'APPROVED'], [25, 4, 'APPROVED'], [8, 2.5, 'LOGGED']] as const) {
    await make('volunteerLog', { name: '', volunteerId: hector, activityDate: ago(days), hours, activity: 'Tutoring', status });
  }
  await make('volunteerLog', { name: '', volunteerId: ivy, activityDate: ago(30), hours: 5, activity: 'Event setup', status: 'APPROVED', grantId: literacy });

  await store.set(SAMPLE_KEY, remembered);

  return {
    status: 'created',
    counts: Object.fromEntries(Object.entries(remembered).map(([key, ids]) => [key, ids?.length ?? 0])),
  };
};

export type RemoveResult = { status: 'removed' | 'nothing-to-remove'; removed: number; tasksRemoved: number };

export const removeSampleData = async (client: GraphqlClient, store: KeyValueStore): Promise<RemoveResult> => {
  const remembered = await store.get<Remembered>(SAMPLE_KEY);

  if (!remembered) return { status: 'nothing-to-remove', removed: 0, tasksRemoved: 0 };

  // Reminders Compass created for sample people and organizations go too.
  const peopleIds = remembered.person ?? [];
  const companyIds = remembered.company ?? [];
  const taskIds = new Set<string>();
  const targetIds = new Set<string>();

  for (const [field, ids] of [['targetPersonId', peopleIds], ['targetCompanyId', companyIds]] as const) {
    for (const batch of chunk(ids, 50)) {
      const { records } = await fetchAll(client, COLLECTION.taskTarget, { taskId: true }, { [field]: { in: batch } });

      for (const target of records) {
        targetIds.add(target.id);
        if (target.taskId) taskIds.add(target.taskId);
      }
    }
  }

  for (const id of targetIds) await softDeleteRecord(client, COLLECTION.taskTarget, id);

  let tasksRemoved = 0;
  for (const id of taskIds) {
    await softDeleteRecord(client, COLLECTION.task, id);
    tasksRemoved += 1;
  }

  // Children before parents.
  const order: CollectionKey[] = [
    'donation', 'volunteerLog', 'programMetric', 'grantKpi', 'cultivationPlan',
    'subgrantee', 'grant', 'fundraisingCampaign', 'person', 'company',
  ];
  let removed = 0;

  for (const key of order) {
    for (const id of remembered[key] ?? []) {
      await softDeleteRecord(client, COLLECTION[key] as Collection, id);
      removed += 1;
    }
  }

  await store.set(SAMPLE_KEY, null);

  return { status: 'removed', removed, tasksRemoved };
};
