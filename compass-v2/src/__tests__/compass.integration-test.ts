import { CoreApiClient } from 'twenty-client-sdk/core';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { afterAll, describe, expect, it } from 'vitest';

import { todayIso, addDays } from 'src/lib/dates';

// End-to-end checks against a REAL Twenty server (see SETUP.md, "Running the
// live tests"). They install the app, then do what a person would do (add a
// gift, add a grant and a KPI) and wait for Compass to react.
//
// The rest of the test suite uses a stand-in for Twenty's API. These are the
// tests that prove the real server accepts the queries and field names Compass
// uses, so a failure here is the most useful kind of failure.

const client = new CoreApiClient() as any;
const created: { mutation: string; id: string }[] = [];

const make = async (name: string, data: Record<string, unknown>): Promise<string> => {
  const mutation = `create${name}`;
  const result = await client.mutation({ [mutation]: { __args: { data }, id: true } });

  created.push({ mutation: `destroy${name}`, id: result[mutation].id });

  return result[mutation].id;
};

// Compass reacts to changes in the background, so poll instead of waiting once.
const eventually = async <TValue>(read: () => Promise<TValue>, done: (value: TValue) => boolean, timeoutMs = 90_000): Promise<TValue> => {
  const deadline = Date.now() + timeoutMs;
  let last = await read();

  while (!done(last) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    last = await read();
  }

  return last;
};

afterAll(async () => {
  for (const { mutation, id } of created.reverse()) {
    await client.mutation({ [mutation]: { __args: { id }, id: true } }).catch(() => {});
  }
});

describe('the schema Compass adds', () => {
  it.each([
    ['grants', 'name status pace kpiProgressPercent awardAmount { amountMicros currencyCode } nextReportDue dataCheck'],
    ['grantKpis', 'name target current status progressPercent grantId subgranteeId asOfDate'],
    ['subgrantees', 'name status allocatedAmount { amountMicros } grantId'],
    ['programMetrics', 'name period peopleServed totalCost { amountMicros } costPerPerson { amountMicros }'],
    ['donations', 'name status giftType amount { amountMicros currencyCode } giftDate donorId organizationDonorId campaignId grantId thankYouTaskCreated'],
    ['fundraisingCampaigns', 'name status raisedAmount { amountMicros } percentOfGoal donorCount'],
    ['cultivationPlans', 'name stage askAmount { amountMicros } weightedAmount { amountMicros } nextStepDate donorId organizationId ownerId'],
    ['volunteerLogs', 'name hours activityDate status volunteerId grantId'],
    ['people', 'contactTypes outreachPermission givingStatus lifetimeGiving { amountMicros } giftCount lastGiftDate volunteerHours backgroundCheckExpires aiSummary aiBasis aiGeneratedAt'],
    ['companies', 'organizationTypes totalGiven { amountMicros } totalAwarded { amountMicros } activeGrantCount'],
  ])('can read %s with every field Compass uses', async (collection, fields) => {
    // Building the query from text keeps this list readable.
    const selection = Object.fromEntries(
      fields.split(/\s+(?![^{]*})/).map((field) => {
        const [name, ...rest] = field.split(' ');

        return [name, rest.length === 0 ? true : Object.fromEntries(field.match(/\{([^}]*)\}/)![1].trim().split(/\s+/).map((sub) => [sub, true]))];
      }),
    );

    const result = await client.query({ [collection]: { __args: { first: 1 }, edges: { node: { id: true, ...selection } } } });

    expect(result[collection]).toBeDefined();
  });
});

describe('recording a gift', () => {
  it('updates the donor, names the gift and creates a thank-you for a recent gift', async () => {
    const personId = await make('Person', {
      name: { firstName: 'Integration', lastName: 'Donor' },
      emails: { primaryEmail: `integration.${Date.now()}@example.invalid` },
    });

    await make('Donation', {
      name: '',
      status: 'RECEIVED',
      giftType: 'ONE_TIME',
      amount: { amountMicros: 150_000_000, currencyCode: 'USD' },
      giftDate: todayIso(),
      donorId: personId,
    });

    const person = await eventually(
      async () => (await client.query({ person: { __args: { filter: { id: { eq: personId } } }, id: true, giftCount: true, givingStatus: true, lifetimeGiving: { amountMicros: true }, contactTypes: true } })).person,
      (value) => value?.giftCount === 1,
    );

    expect(person).toMatchObject({ giftCount: 1, givingStatus: 'NEW', lifetimeGiving: { amountMicros: 150_000_000 } });
    expect(person.contactTypes).toContain('DONOR');

    const targets = await eventually<{ node: { taskId: string } }[]>(
      async () => (await client.query({ taskTargets: { __args: { filter: { targetPersonId: { eq: personId } } }, edges: { node: { id: true, taskId: true } } } })).taskTargets.edges,
      (edges) => edges.length > 0,
    );

    expect(targets.length).toBe(1);
    created.push({ mutation: 'destroyTask', id: targets[0].node.taskId });
  });
});

describe('tracking a grant', () => {
  it('works out KPI status, progress and pace', async () => {
    const funderId = await make('Company', { name: `Integration Funder ${Date.now()}` });
    const grantId = await make('Grant', {
      name: 'Integration grant',
      status: 'ACTIVE',
      funderId,
      awardAmount: { amountMicros: 10_000_000_000, currencyCode: 'USD' },
      startDate: addDays(todayIso(), -50),
      endDate: addDays(todayIso(), 50),
      reportFrequency: 'QUARTERLY',
    });

    const kpiId = await make('GrantKpi', { name: 'People served', target: 100, current: 40, asOfDate: todayIso(), grantId });

    const kpi = await eventually(
      async () => (await client.query({ grantKpi: { __args: { filter: { id: { eq: kpiId } } }, id: true, status: true, progressPercent: true } })).grantKpi,
      (value) => value?.status === 'BEHIND',
    );
    expect(kpi).toMatchObject({ status: 'BEHIND', progressPercent: 40 });

    const grant = await eventually(
      async () => (await client.query({ grant: { __args: { filter: { id: { eq: grantId } } }, id: true, kpiProgressPercent: true, pace: true } })).grant,
      (value) => value?.kpiProgressPercent === 40,
    );

    // 50% of the period has passed and KPIs are at 40%: a 10 point gap is still on pace.
    expect(grant).toMatchObject({ kpiProgressPercent: 40, pace: 'ON_PACE' });
  });
});

describe('the donation route for Zapier and other tools', () => {
  it('records a gift once, even if the same payment is sent twice', async () => {
    const rest = new RestApiClient();
    const body = { email: `route.${Date.now()}@example.invalid`, firstName: 'Route', amount: 25, referenceNumber: `it-${Date.now()}` };

    const first = await rest.post<{ status: string; donationId: string; personId: string }>('/s/compass/record-donation', body);
    const second = await rest.post<{ status: string; donationId: string }>('/s/compass/record-donation', body);

    created.push({ mutation: 'destroyDonation', id: first.donationId }, { mutation: 'destroyPerson', id: first.personId });

    expect(first.status).toBe('created');
    expect(second).toMatchObject({ status: 'duplicate', donationId: first.donationId });
  });

  it('refuses a malformed gift with a clear message', async () => {
    await expect(new RestApiClient().post('/s/compass/record-donation', { amount: -5 })).rejects.toThrow();
  });
});
