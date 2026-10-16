import { describe, expect, it } from 'vitest';

import { MAX_RENEWAL_TASKS_PER_RUN, runNightlySweep, type SweepDeps } from 'src/services/nightly-sweep';
import { type KeyValueStore } from 'src/services/tasks';
import { createFakeClient, eur } from 'src/services/__tests__/fake-client';

const memoryStore = (): KeyValueStore => {
  const entries = new Map<string, unknown>();

  return {
    get: async <TValue>(key: string) => (entries.get(key) as TValue | undefined) ?? null,
    set: async (key, value) => { entries.set(key, value); },
  };
};

const sweepDeps = (client: SweepDeps['client'], asOf = '2026-10-06', store = memoryStore()): SweepDeps => ({
  client,
  asOf,
  currency: 'USD',
  store,
});

const gift = (id: string, donorId: string, giftDate: string, amount = 100) => ({
  id,
  name: id,
  status: 'RECEIVED',
  giftType: 'ONE_TIME',
  amount: eur(amount),
  giftDate,
  donorId,
  organizationDonorId: null,
  campaignId: null,
  grantId: null,
});

const person = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: { firstName: id, lastName: 'Donor' },
  contactTypes: ['DONOR'],
  outreachPermission: 'OK_TO_CONTACT',
  ...overrides,
});

describe('nightly sweep: donors', () => {
  it('moves a donor from active to at risk as time passes, and reminds you once', async () => {
    const fake = createFakeClient({
      people: [person('anna', { givingStatus: 'ACTIVE', giftCount: 1, lastGiftDate: '2026-01-20' })],
      donations: [gift('d1', 'anna', '2026-01-20', 250)],
      grants: [],
    });
    const store = memoryStore();

    const first = await runNightlySweep(sweepDeps(fake.client, '2026-10-20', store));
    const second = await runNightlySweep(sweepDeps(fake.client, '2026-10-21', store));

    expect(fake.row('people', 'anna')!.givingStatus).toBe('AT_RISK');
    expect(first.renewalTasksCreated).toBe(1);
    expect(second.renewalTasksCreated).toBe(0);
    expect(fake.rows('tasks')).toHaveLength(1);
    expect(fake.rows('tasks')[0].title).toContain('Renewal check-in: anna Donor');
    expect(fake.rows('taskTargets')[0]).toMatchObject({ targetPersonId: 'anna' });
  });

  it('is quiet when nothing changed: no writes on a second run', async () => {
    const fake = createFakeClient({
      people: [person('anna')],
      donations: [gift('d1', 'anna', '2026-08-20')],
      grants: [],
    });

    await runNightlySweep(sweepDeps(fake.client));
    fake.clearWrites();
    const summary = await runNightlySweep(sweepDeps(fake.client));

    expect(summary.donorsUpdated).toBe(0);
    expect(fake.writes).toEqual([]);
  });

  it('rations reminders and serves the biggest donors first', async () => {
    const donors = Array.from({ length: 20 }, (_, index) => `d${String(index).padStart(2, '0')}`);
    const fake = createFakeClient({
      people: donors.map((id) => person(id)),
      donations: donors.map((id, index) => gift(`g-${id}`, id, '2026-01-06', 100 + index)),
      grants: [],
    });
    const store = memoryStore();

    const night1 = await runNightlySweep(sweepDeps(fake.client, '2026-10-06', store));
    const firstTitles = fake.rows('tasks').map((task) => task.title);

    expect(night1.renewalTasksCreated).toBe(MAX_RENEWAL_TASKS_PER_RUN);
    expect(firstTitles[0]).toContain('d19 Donor');
    expect(firstTitles.some((title) => title.includes('d00 Donor'))).toBe(false);

    const night2 = await runNightlySweep(sweepDeps(fake.client, '2026-10-07', store));

    expect(night2.renewalTasksCreated).toBe(20 - MAX_RENEWAL_TASKS_PER_RUN);
    expect(fake.rows('tasks')).toHaveLength(20);
  });

  it('never creates reminders for people who asked not to be contacted', async () => {
    const fake = createFakeClient({
      people: [person('anna', { outreachPermission: 'DO_NOT_CONTACT' })],
      donations: [gift('d1', 'anna', '2026-01-06')],
      grants: [],
    });

    const summary = await runNightlySweep(sweepDeps(fake.client));

    expect(summary.renewalTasksCreated).toBe(0);
  });

  it('turns the check-in into a thank-you-only message for donors who want no asks', async () => {
    const fake = createFakeClient({
      people: [person('anna', { outreachPermission: 'NO_ASKS' })],
      donations: [gift('d1', 'anna', '2026-01-06')],
      grants: [],
    });

    await runNightlySweep(sweepDeps(fake.client));

    expect(fake.rows('tasks')[0].title).toContain('Check in with');
    expect(fake.rows('tasks')[0].bodyV2.markdown).toContain('no asks');
  });

  it('does not remind about donors who are lapsed rather than at risk', async () => {
    const fake = createFakeClient({
      people: [person('anna')],
      donations: [gift('d1', 'anna', '2025-06-01')],
      grants: [],
    });

    await runNightlySweep(sweepDeps(fake.client));

    expect(fake.row('people', 'anna')!.givingStatus).toBe('LAPSED');
    expect(fake.rows('tasks')).toHaveLength(0);
  });
});

describe('nightly sweep: grants', () => {
  const grant = {
    id: 'g1',
    name: 'Clean Water',
    status: 'ACTIVE',
    funderId: 'f1',
    awardAmount: eur(50000),
    spentAmount: eur(10000),
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    reportFrequency: 'QUARTERLY',
    nextReportDue: '2026-10-15',
  };

  it('reminds about a report coming due, links it to the funder, and does not repeat', async () => {
    const fake = createFakeClient({ people: [], donations: [], companies: [{ id: 'f1' }], grants: [grant], grantKpis: [] });
    const store = memoryStore();

    const first = await runNightlySweep(sweepDeps(fake.client, '2026-10-06', store));
    const second = await runNightlySweep(sweepDeps(fake.client, '2026-10-07', store));

    expect(first.reportTasksCreated).toBe(1);
    expect(second.reportTasksCreated).toBe(0);
    expect(fake.rows('tasks')[0].title).toBe('Report due 2026-10-15: Clean Water');
    expect(fake.rows('taskTargets')[0]).toMatchObject({ targetCompanyId: 'f1' });
  });

  it('stays quiet about reports that are not due soon, and about grants that are not active', async () => {
    const fake = createFakeClient({
      people: [],
      donations: [],
      companies: [{ id: 'f1' }],
      grants: [{ ...grant, nextReportDue: '2027-01-15' }, { ...grant, id: 'g2', status: 'COMPLETED', nextReportDue: '2026-10-08' }],
      grantKpis: [],
    });

    const summary = await runNightlySweep(sweepDeps(fake.client));

    expect(summary.reportTasksCreated).toBe(0);
    expect(summary.grantsChecked).toBe(1);
  });

  it('keeps pace and data checks current as the calendar moves', async () => {
    const fake = createFakeClient({
      people: [],
      donations: [],
      companies: [{ id: 'f1' }],
      grants: [{ ...grant, nextReportDue: null }],
      grantKpis: [{ id: 'k1', grantId: 'g1', name: 'Households', target: 100, current: 10, asOfDate: '2026-09-30' }],
    });

    await runNightlySweep(sweepDeps(fake.client, '2026-10-06'));

    expect(fake.row('grants', 'g1')).toMatchObject({ pace: 'OFF_PACE', timeElapsedPercent: 76.4 });
  });
});

describe('nightly sweep: volunteers', () => {
  it('reminds about background checks that expire within 30 days or already have', async () => {
    const fake = createFakeClient({
      people: [
        { id: 'v1', name: { firstName: 'Sam', lastName: 'Rivera' }, backgroundCheckExpires: '2026-10-20', volunteerStatus: 'ACTIVE' },
        { id: 'v2', name: { firstName: 'Lee', lastName: 'Park' }, backgroundCheckExpires: '2026-09-01', volunteerStatus: 'ACTIVE' },
        { id: 'v3', name: { firstName: 'Far', lastName: 'Away' }, backgroundCheckExpires: '2027-06-01', volunteerStatus: 'ACTIVE' },
        { id: 'v4', name: { firstName: 'Old', lastName: 'Hand' }, backgroundCheckExpires: '2026-09-01', volunteerStatus: 'INACTIVE' },
      ],
      donations: [],
      grants: [],
    });

    const summary = await runNightlySweep(sweepDeps(fake.client));
    const titles = fake.rows('tasks').map((task) => task.title);

    expect(summary.backgroundCheckTasksCreated).toBe(2);
    expect(titles).toEqual(
      expect.arrayContaining(['Background check expires 2026-10-20: Sam Rivera', 'Background check expired 2026-09-01: Lee Park']),
    );
  });
});

describe('nightly sweep: self-healing', () => {
  const asOf = '2026-10-06';

  it('repairs totals that were never updated because a change event was lost', async () => {
    const fake = createFakeClient({
      people: [
        { id: 'vol', name: { firstName: 'Sam', lastName: 'Rivera' }, contactTypes: [], volunteerHours: null },
      ],
      companies: [{ id: 'org', name: 'Acme Co', totalGiven: null }],
      fundraisingCampaigns: [{ id: 'camp', goalAmount: eur(1000), raisedAmount: null }],
      donations: [
        { id: 'd1', name: 'x', status: 'RECEIVED', giftType: 'ONE_TIME', amount: eur(400), giftDate: '2026-08-01', donorId: null, organizationDonorId: 'org', campaignId: 'camp', grantId: null },
      ],
      volunteerLogs: [{ id: 'v1', volunteerId: 'vol', hours: 6, activityDate: '2026-09-01', status: 'APPROVED' }],
      cultivationPlans: [{ id: 'plan', stage: 'CULTIVATION', askAmount: eur(8000), weightedAmount: null }],
      programMetrics: [{ id: 'pm', name: 'Tutoring', peopleServed: 50, totalCost: eur(1000), costPerPerson: null }],
      grants: [],
    });

    const summary = await runNightlySweep(sweepDeps(fake.client, asOf));

    expect(fake.row('fundraisingCampaigns', 'camp')).toMatchObject({ raisedAmount: { amountMicros: 400_000_000 }, percentOfGoal: 40 });
    expect(fake.row('companies', 'org')!.totalGiven).toMatchObject({ amountMicros: 400_000_000 });
    expect(fake.row('people', 'vol')).toMatchObject({ volunteerHours: 6, volunteerStatus: 'ACTIVE' });
    expect(fake.row('cultivationPlans', 'plan')!.weightedAmount).toMatchObject({ amountMicros: 2_000_000_000 });
    expect(fake.row('programMetrics', 'pm')!.costPerPerson).toMatchObject({ amountMicros: 20_000_000 });
    expect(summary).toMatchObject({
      campaignsReconciled: 1, organizationsReconciled: 1, volunteersReconciled: 1, plansReconciled: 1, programResultsReconciled: 1,
    });
  });

  it('is quiet once everything is already correct', async () => {
    const fake = createFakeClient({
      people: [], companies: [], grants: [],
      fundraisingCampaigns: [{ id: 'camp', goalAmount: eur(1000) }],
      donations: [{ id: 'd1', name: 'x', status: 'RECEIVED', giftType: 'ONE_TIME', amount: eur(400), giftDate: '2026-08-01', donorId: null, organizationDonorId: null, campaignId: 'camp', grantId: null }],
    });

    await runNightlySweep(sweepDeps(fake.client, asOf));
    fake.clearWrites();
    const second = await runNightlySweep(sweepDeps(fake.client, asOf));

    expect(fake.writes).toEqual([]);
    expect(second.campaignsReconciled).toBe(0);
  });
});
