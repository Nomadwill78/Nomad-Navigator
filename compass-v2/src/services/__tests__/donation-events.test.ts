import { describe, expect, it } from 'vitest';

import { handleDonationEvents, type DonationEventDeps, type RecordEvent } from 'src/services/donation-events';
import { type KeyValueStore } from 'src/services/tasks';
import { createFakeClient, eur } from 'src/services/__tests__/fake-client';

const ASOF = '2026-10-06';

const memoryStore = (): KeyValueStore & { entries: Map<string, unknown> } => {
  const entries = new Map<string, unknown>();

  return {
    entries,
    get: async <TValue>(key: string) => (entries.get(key) as TValue | undefined) ?? null,
    set: async (key, value) => { entries.set(key, value); },
  };
};

const created = (id: string, fields: Record<string, unknown>): RecordEvent => ({
  recordId: id,
  properties: { after: { id, ...fields } },
});

const depsFor = (client: DonationEventDeps['client'], store = memoryStore()): DonationEventDeps => ({
  client,
  asOf: ASOF,
  currency: 'USD',
  store,
  majorGiftThreshold: 1000,
});

const gift = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: '',
  status: 'RECEIVED',
  giftType: 'ONE_TIME',
  amount: eur(100),
  giftDate: '2026-10-05',
  isAnonymous: false,
  thankYouTaskCreated: false,
  donorId: 'p1',
  organizationDonorId: null,
  campaignId: null,
  grantId: null,
  ...overrides,
});

const people = (overrides: Record<string, unknown> = {}) => [
  { id: 'p1', name: { firstName: 'Maria', lastName: 'Lopez' }, contactTypes: [], outreachPermission: 'OK_TO_CONTACT', ...overrides },
];

describe('handleDonationEvents: a new gift', () => {
  it('updates the donor, names the gift and creates one linked thank-you task', async () => {
    const fake = createFakeClient({ people: people(), donations: [gift('d1')] });
    const store = memoryStore();

    const summary = await handleDonationEvents(depsFor(fake.client, store), [created('d1', { donorId: 'p1' })]);

    expect(summary).toMatchObject({ donorsRecomputed: 1, tasksCreated: 1, donationsNamed: 1 });
    expect(fake.row('people', 'p1')).toMatchObject({ giftCount: 1, givingStatus: 'NEW', lastGiftDate: '2026-10-05' });
    expect(fake.row('donations', 'd1')).toMatchObject({
      name: 'Maria Lopez · $100 · 2026-10-05',
      thankYouTaskCreated: true,
    });

    const [task] = fake.rows('tasks');
    expect(task).toMatchObject({
      title: 'Welcome and thank Maria Lopez for first gift ($100)',
      status: 'TODO',
      dueAt: '2026-10-07T12:00:00.000Z',
    });
    expect(fake.rows('taskTargets')).toEqual([expect.objectContaining({ taskId: task.id, targetPersonId: 'p1' })]);
  });

  it('never creates a second thank-you if the same event arrives again', async () => {
    const fake = createFakeClient({ people: people(), donations: [gift('d1')] });
    const store = memoryStore();
    const event = created('d1', { donorId: 'p1' });

    await handleDonationEvents(depsFor(fake.client, store), [event]);
    // the platform delivers events at least once, so a repeat is expected
    fake.row('donations', 'd1')!.thankYouTaskCreated = false;
    const again = await handleDonationEvents(depsFor(fake.client, store), [event]);

    expect(fake.rows('tasks')).toHaveLength(1);
    expect(again.tasksCreated).toBe(0);
  });

  it('asks for a personal call on a major gift', async () => {
    const fake = createFakeClient({ people: people(), donations: [gift('d1', { amount: eur(2500) })] });

    await handleDonationEvents(depsFor(fake.client), [created('d1', { donorId: 'p1' })]);

    expect(fake.rows('tasks')[0].title).toBe('Call to thank Maria Lopez for $2,500 gift');
  });

  it('creates no task for someone who asked not to be contacted, but still counts their gift', async () => {
    const fake = createFakeClient({ people: people({ outreachPermission: 'DO_NOT_CONTACT' }), donations: [gift('d1')] });

    const summary = await handleDonationEvents(depsFor(fake.client), [created('d1', { donorId: 'p1' })]);

    expect(fake.rows('tasks')).toHaveLength(0);
    expect(summary.tasksCreated).toBe(0);
    expect(fake.row('people', 'p1')!.giftCount).toBe(1);
  });

  it('does not create tasks for gifts from long ago, as in a spreadsheet import of past years', async () => {
    const fake = createFakeClient({
      people: people(),
      donations: [gift('d1', { giftDate: '2021-03-01' }), gift('d2', { giftDate: '2022-03-01' })],
    });

    const summary = await handleDonationEvents(depsFor(fake.client), [
      created('d1', { donorId: 'p1' }),
      created('d2', { donorId: 'p1' }),
    ]);

    expect(summary.tasksCreated).toBe(0);
    expect(fake.rows('tasks')).toHaveLength(0);
    expect(fake.row('people', 'p1')).toMatchObject({ giftCount: 2, givingStatus: 'INACTIVE' });
  });

  it('recalculates a donor once for a whole batch of their gifts', async () => {
    const fake = createFakeClient({
      people: people(),
      donations: [gift('d1', { name: 'a' }), gift('d2', { name: 'b' }), gift('d3', { name: 'c' })],
    });

    await handleDonationEvents(depsFor(fake.client), ['d1', 'd2', 'd3'].map((id) => created(id, { donorId: 'p1' })));

    const personWrites = fake.writes.filter((write) => write.collection === 'people');

    expect(personWrites).toHaveLength(1);
    expect(fake.row('people', 'p1')!.giftCount).toBe(3);
  });

  it('keeps a gift name the user typed', async () => {
    const fake = createFakeClient({ people: people(), donations: [gift('d1', { name: 'Spring appeal gift' })] });

    await handleDonationEvents(depsFor(fake.client), [created('d1', { donorId: 'p1' })]);

    expect(fake.row('donations', 'd1')!.name).toBe('Spring appeal gift');
  });

  it('thanks organizations and links the task to the company', async () => {
    const fake = createFakeClient({
      companies: [{ id: 'c1', name: 'Acme Co' }],
      donations: [gift('d1', { donorId: null, organizationDonorId: 'c1', amount: eur(500) })],
      grants: [],
    });

    await handleDonationEvents(depsFor(fake.client), [created('d1', { organizationDonorId: 'c1' })]);

    expect(fake.rows('tasks')[0].title).toBe('Thank Acme Co for $500 gift');
    expect(fake.rows('taskTargets')[0]).toMatchObject({ targetCompanyId: 'c1' });
    expect(fake.row('companies', 'c1')!.totalGiven).toMatchObject({ amountMicros: 500_000_000 });
  });

  it('refreshes campaign and grant totals', async () => {
    const fake = createFakeClient({
      people: people(),
      fundraisingCampaigns: [{ id: 'camp', goalAmount: eur(1000) }],
      grants: [{ id: 'g1', name: 'G', status: 'ACTIVE', awardAmount: eur(1000), funderId: null }],
      grantKpis: [],
      donations: [gift('d1', { campaignId: 'camp', grantId: 'g1', amount: eur(250) })],
    });

    await handleDonationEvents(depsFor(fake.client), [created('d1', { donorId: 'p1', campaignId: 'camp', grantId: 'g1' })]);

    expect(fake.row('fundraisingCampaigns', 'camp')).toMatchObject({ raisedAmount: { amountMicros: 250_000_000 }, percentOfGoal: 25 });
    expect(fake.row('grants', 'g1')!.receivedAmount).toMatchObject({ amountMicros: 250_000_000 });
  });
});

describe('handleDonationEvents: edits and deletions', () => {
  it('recalculates both donors when a gift is reassigned', async () => {
    const fake = createFakeClient({
      people: [
        { id: 'p1', name: {}, contactTypes: ['DONOR'], giftCount: 1, givingStatus: 'NEW' },
        { id: 'p2', name: {}, contactTypes: [] },
      ],
      donations: [gift('d1', { donorId: 'p2', name: 'x' })],
    });

    await handleDonationEvents(depsFor(fake.client), [
      { recordId: 'd1', properties: { before: { donorId: 'p1' }, after: { donorId: 'p2' } } },
    ]);

    expect(fake.row('people', 'p1')).toMatchObject({ giftCount: 0, givingStatus: 'PROSPECT' });
    expect(fake.row('people', 'p2')).toMatchObject({ giftCount: 1 });
    expect(fake.rows('tasks')).toHaveLength(0);
  });

  it('removes a destroyed gift from the donor\'s totals and creates no task', async () => {
    const fake = createFakeClient({
      people: [{ id: 'p1', name: {}, contactTypes: ['DONOR'], giftCount: 1, givingStatus: 'NEW', lifetimeGiving: eur(100) }],
      donations: [],
    });

    await handleDonationEvents(depsFor(fake.client), [{ recordId: 'd1', properties: { before: { donorId: 'p1' } } }]);

    expect(fake.row('people', 'p1')).toMatchObject({ giftCount: 0, lifetimeGiving: { amountMicros: 0 } });
    expect(fake.rows('tasks')).toHaveLength(0);
  });
});
