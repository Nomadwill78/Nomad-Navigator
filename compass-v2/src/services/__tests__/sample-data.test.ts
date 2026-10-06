import { describe, expect, it } from 'vitest';

import { recomputeDonorRollup } from 'src/services/rollups';
import { removeSampleData, seedSampleData, SAMPLE_TAG } from 'src/services/sample-data';
import { type KeyValueStore } from 'src/services/tasks';
import { createFakeClient } from 'src/services/__tests__/fake-client';

const ASOF = '2026-10-06';

const memoryStore = (): KeyValueStore => {
  const entries = new Map<string, unknown>();

  return {
    get: async <TValue>(key: string) => (entries.get(key) as TValue | undefined) ?? null,
    set: async (key, value) => { entries.set(key, value); },
  };
};

describe('seedSampleData', () => {
  it('adds a full picture, and everything carries the SAMPLE label', async () => {
    const fake = createFakeClient();

    const result = await seedSampleData(fake.client, memoryStore(), ASOF);

    expect(result.status).toBe('created');
    for (const plural of ['people', 'companies', 'grants', 'fundraisingCampaigns', 'cultivationPlans', 'subgrantees']) {
      for (const row of fake.rows(plural)) {
        const label = row.name?.lastName ?? row.name;
        expect(label, `${plural} row`).toContain(SAMPLE_TAG);
      }
    }
  });

  it('uses email addresses that can never receive mail', async () => {
    const fake = createFakeClient();

    await seedSampleData(fake.client, memoryStore(), ASOF);

    for (const person of fake.rows('people')) {
      expect(person.emails.primaryEmail).toMatch(/@example\.invalid$/);
    }
  });

  it('shows every giving status once the totals are calculated', async () => {
    const fake = createFakeClient();
    await seedSampleData(fake.client, memoryStore(), ASOF);

    const statuses = new Set<string | null>();
    for (const person of fake.rows('people')) {
      const result = await recomputeDonorRollup({ client: fake.client, asOf: ASOF, currency: 'USD' }, person.id);

      statuses.add(result.summary?.givingStatus ?? null);
    }

    expect([...statuses].sort()).toEqual(['ACTIVE', 'AT_RISK', 'INACTIVE', 'LAPSED', 'NEW', 'PROSPECT'].sort());
  });

  it('never leaves a gift recent enough to trigger a thank-you task', async () => {
    const fake = createFakeClient();
    await seedSampleData(fake.client, memoryStore(), ASOF);

    for (const donation of fake.rows('donations')) {
      expect(donation.giftDate < '2026-09-22').toBe(true);
    }
  });

  it('refuses to add a second copy', async () => {
    const fake = createFakeClient();
    const store = memoryStore();

    await seedSampleData(fake.client, store, ASOF);
    const before = fake.rows('people').length;

    expect(await seedSampleData(fake.client, store, ASOF)).toEqual({ status: 'already-present' });
    expect(fake.rows('people')).toHaveLength(before);
  });
});

describe('removeSampleData', () => {
  it('removes exactly what was added and leaves real records alone', async () => {
    const fake = createFakeClient({
      people: [{ id: 'real-person', name: { firstName: 'Real', lastName: 'Donor' } }],
      companies: [{ id: 'real-company', name: 'Real Co' }],
      grants: [{ id: 'real-grant', name: 'Real Grant' }],
      donations: [{ id: 'real-gift', donorId: 'real-person' }],
      tasks: [{ id: 'real-task' }],
      taskTargets: [{ id: 'real-target', taskId: 'real-task', targetPersonId: 'real-person' }],
    });
    const store = memoryStore();

    await seedSampleData(fake.client, store, ASOF);
    const result = await removeSampleData(fake.client, store);

    expect(result.status).toBe('removed');
    expect(result.removed).toBeGreaterThan(30);
    expect(fake.rows('people').map((p) => p.id)).toEqual(['real-person']);
    expect(fake.rows('companies').map((c) => c.id)).toEqual(['real-company']);
    expect(fake.rows('grants').map((g) => g.id)).toEqual(['real-grant']);
    expect(fake.rows('donations').map((d) => d.id)).toEqual(['real-gift']);
    expect(fake.rows('tasks').map((t) => t.id)).toEqual(['real-task']);
  });

  it('also removes reminders Compass created for sample people', async () => {
    const fake = createFakeClient();
    const store = memoryStore();

    await seedSampleData(fake.client, store, ASOF);
    const carla = fake.rows('people').find((person) => person.name.firstName === 'Carla')!;
    fake.rows('tasks').push({ id: 'sample-task', title: 'Renewal check-in' });
    fake.rows('taskTargets').push({ id: 'tt1', taskId: 'sample-task', targetPersonId: carla.id });
    fake.rows('tasks').push({ id: 'other-task', title: 'Unrelated' });

    const result = await removeSampleData(fake.client, store);

    expect(result.tasksRemoved).toBe(1);
    expect(fake.rows('tasks').map((task) => task.id)).toEqual(['other-task']);
    expect(fake.rows('taskTargets')).toEqual([]);
  });

  it('does nothing when there is nothing to remove, and can seed again afterwards', async () => {
    const fake = createFakeClient();
    const store = memoryStore();

    expect(await removeSampleData(fake.client, store)).toMatchObject({ status: 'nothing-to-remove' });

    await seedSampleData(fake.client, store, ASOF);
    await removeSampleData(fake.client, store);

    expect(await seedSampleData(fake.client, store, ASOF)).toMatchObject({ status: 'created' });
  });
});
