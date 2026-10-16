import { describe, expect, it } from 'vitest';

import {
  recomputeProgramMetric,
  recomputeCampaignRollup,
  recomputeCompanyRollup,
  recomputeDonorRollup,
  recomputeGrant,
  recomputePlanRollup,
  recomputeVolunteerRollup,
  type RollupDeps,
} from 'src/services/rollups';
import { createFakeClient, eur } from 'src/services/__tests__/fake-client';

const ASOF = '2026-10-06';
const deps = (client: RollupDeps['client']): RollupDeps => ({ client, asOf: ASOF, currency: 'USD' });

const donation = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: id,
  status: 'RECEIVED',
  giftType: 'ONE_TIME',
  amount: eur(100),
  giftDate: '2026-08-01',
  donorId: 'p1',
  organizationDonorId: null,
  campaignId: null,
  grantId: null,
  ...overrides,
});

describe('recomputeDonorRollup', () => {
  const setup = () =>
    createFakeClient({
      people: [{ id: 'p1', name: { firstName: 'Maria', lastName: 'Lopez' }, contactTypes: ['PROSPECT'], givingStatus: null, giftCount: null }],
      donations: [
        donation('d1', { amount: eur(250), giftDate: '2025-12-20' }),
        donation('d2', { amount: eur(100), giftDate: '2026-08-01' }),
        donation('d3', { amount: eur(9000), status: 'PLEDGED' }),
        donation('other', { donorId: 'p2', amount: eur(777) }),
      ],
    });

  it('fills in totals, dates and status from the donor\'s received gifts only', async () => {
    const fake = setup();
    const result = await recomputeDonorRollup(deps(fake.client), 'p1');
    const person = fake.row('people', 'p1')!;

    expect(result.status).toBe('updated');
    expect(person).toMatchObject({
      giftCount: 2,
      firstGiftDate: '2025-12-20',
      lastGiftDate: '2026-08-01',
      // first gift was nine months ago, so still inside the "new donor" year
      givingStatus: 'NEW',
      lifetimeGiving: { amountMicros: 350_000_000, currencyCode: 'USD' },
      lastGiftAmount: { amountMicros: 100_000_000, currencyCode: 'USD' },
      largestGift: { amountMicros: 250_000_000, currencyCode: 'USD' },
    });
  });

  it('marks someone who gave as a donor without removing what was already there', async () => {
    const fake = setup();

    await recomputeDonorRollup(deps(fake.client), 'p1');

    expect(fake.row('people', 'p1')!.contactTypes).toEqual(['PROSPECT', 'DONOR']);
  });

  it('writes nothing the second time, so nightly runs stay quiet', async () => {
    const fake = setup();

    await recomputeDonorRollup(deps(fake.client), 'p1');
    fake.clearWrites();
    const second = await recomputeDonorRollup(deps(fake.client), 'p1');

    expect(second.status).toBe('unchanged');
    expect(fake.writes).toEqual([]);
  });

  it('returns the previous giving status so callers can spot a transition', async () => {
    const fake = createFakeClient({
      people: [{ id: 'p1', name: {}, contactTypes: ['DONOR'], givingStatus: 'ACTIVE' }],
      donations: [donation('d1', { giftDate: '2026-01-06' })],
    });

    const result = await recomputeDonorRollup(deps(fake.client), 'p1');

    expect(result.previousGivingStatus).toBe('ACTIVE');
    expect(result.summary?.givingStatus).toBe('AT_RISK');
  });

  it('reverts a person to prospect when their only gift is deleted', async () => {
    const fake = createFakeClient({
      people: [{ id: 'p1', name: {}, contactTypes: ['DONOR'], givingStatus: 'ACTIVE', giftCount: 1, lastGiftDate: '2026-08-01', lifetimeGiving: eur(100) }],
      donations: [],
    });

    await recomputeDonorRollup(deps(fake.client), 'p1');

    expect(fake.row('people', 'p1')).toMatchObject({ giftCount: 0, givingStatus: 'PROSPECT', lastGiftDate: null });
  });

  it('reports a missing person instead of throwing', async () => {
    const fake = createFakeClient();

    expect((await recomputeDonorRollup(deps(fake.client), 'nope')).status).toBe('missing');
  });

  it('pages through donors with more than 60 gifts', async () => {
    const fake = createFakeClient({
      people: [{ id: 'p1', name: {}, contactTypes: [] }],
      donations: Array.from({ length: 150 }, (_, index) => donation(`d${index}`, { amount: eur(10), giftDate: '2026-08-01' })),
    });

    await recomputeDonorRollup(deps(fake.client), 'p1');

    expect(fake.row('people', 'p1')).toMatchObject({ giftCount: 150, lifetimeGiving: { amountMicros: 1_500_000_000 } });
  });
});

describe('recomputeCampaignRollup', () => {
  it('totals what was raised, what is pledged, and how many gave', async () => {
    const fake = createFakeClient({
      fundraisingCampaigns: [{ id: 'c1', goalAmount: eur(1000) }],
      donations: [
        donation('d1', { campaignId: 'c1', amount: eur(300), donorId: 'p1' }),
        donation('d2', { campaignId: 'c1', amount: eur(200), donorId: 'p2' }),
        donation('d3', { campaignId: 'c1', amount: eur(100), donorId: 'p1' }),
        donation('d4', { campaignId: 'c1', amount: eur(500), status: 'PLEDGED', donorId: 'p3' }),
        donation('d5', { campaignId: 'c2', amount: eur(9999) }),
      ],
    });

    await recomputeCampaignRollup(deps(fake.client), 'c1');

    expect(fake.row('fundraisingCampaigns', 'c1')).toMatchObject({
      raisedAmount: { amountMicros: 600_000_000 },
      pledgedAmount: { amountMicros: 500_000_000 },
      donorCount: 2,
      percentOfGoal: 60,
    });
  });

  it('leaves percent of goal empty when no goal is set', async () => {
    const fake = createFakeClient({ fundraisingCampaigns: [{ id: 'c1', goalAmount: null }], donations: [donation('d1', { campaignId: 'c1' })] });

    await recomputeCampaignRollup(deps(fake.client), 'c1');

    expect(fake.row('fundraisingCampaigns', 'c1')!.percentOfGoal ?? null).toBeNull();
  });
});

describe('recomputeGrant', () => {
  const baseGrant = {
    id: 'g1',
    name: 'Clean Water',
    status: 'ACTIVE',
    funderId: 'f1',
    awardAmount: eur(50000),
    spentAmount: eur(20000),
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    reportFrequency: 'QUARTERLY',
  };

  const setup = () =>
    createFakeClient({
      companies: [{ id: 'f1' }],
      grants: [baseGrant, { ...baseGrant, id: 'g2', status: 'PROSPECT', funderId: 'f1', awardAmount: eur(99999) }],
      grantKpis: [
        { id: 'k1', name: 'Households', grantId: 'g1', target: 400, current: 310, asOfDate: '2026-09-30' },
        { id: 'k2', name: 'Workshops', grantId: 'g1', target: 20, current: 5, asOfDate: '2026-09-30' },
        { id: 'k3', name: 'Other grant', grantId: 'g9', target: 10, current: 10 },
      ],
      donations: [donation('pay1', { grantId: 'g1', donorId: null, organizationDonorId: 'f1', amount: eur(25000), giftType: 'GRANT_PAYMENT' })],
    });

  it('calculates KPI statuses, progress, pace, spend and payments received', async () => {
    const fake = setup();

    await recomputeGrant(deps(fake.client), 'g1');

    expect(fake.row('grantKpis', 'k1')).toMatchObject({ status: 'ON_TRACK', progressPercent: 77.5 });
    expect(fake.row('grantKpis', 'k2')).toMatchObject({ status: 'BEHIND', progressPercent: 25 });
    expect(fake.row('grants', 'g1')).toMatchObject({
      kpiProgressPercent: 51.2,
      percentSpent: 40,
      // 278 of 364 days have passed; KPIs average 51.2%, a gap of 25.2 points
      timeElapsedPercent: 76.4,
      pace: 'OFF_PACE',
      receivedAmount: { amountMicros: 25_000_000_000 },
      dataCheck: 'No problems found.',
    });
  });

  it('rolls the grant up to its funder, counting only awarded grants', async () => {
    const fake = setup();

    await recomputeGrant(deps(fake.client), 'g1');

    expect(fake.row('companies', 'f1')).toMatchObject({
      totalAwarded: { amountMicros: 50_000_000_000 },
      activeGrantCount: 1,
      totalGiven: { amountMicros: 25_000_000_000 },
    });
  });

  it('flags problems instead of hiding them', async () => {
    const fake = createFakeClient({
      grants: [{ ...baseGrant, endDate: '2025-06-01', spentAmount: eur(70000), funderId: null }],
      grantKpis: [{ id: 'k1', name: 'No target KPI', grantId: 'g1', target: 0, current: 5 }],
    });

    await recomputeGrant(deps(fake.client), 'g1');
    const check = fake.row('grants', 'g1')!.dataCheck as string;

    expect(check).toContain('No funder is linked');
    expect(check).toContain('Spent is more than the award');
    expect(check).toContain('end date is before the start date');
    expect(check).toContain('no target');
  });

  it('says there is no KPI progress rather than 0% when nothing has a target', async () => {
    const fake = createFakeClient({ grants: [baseGrant], grantKpis: [{ id: 'k1', grantId: 'g1', name: 'x', target: null, current: 4 }] });

    await recomputeGrant(deps(fake.client), 'g1');

    expect(fake.row('grants', 'g1')!.kpiProgressPercent ?? null).toBeNull();
    expect(fake.row('grants', 'g1')!.pace).toBe('NOT_ENOUGH_DATA');
  });

  it('is idempotent', async () => {
    const fake = setup();

    await recomputeGrant(deps(fake.client), 'g1');
    fake.clearWrites();
    await recomputeGrant(deps(fake.client), 'g1');

    expect(fake.writes).toEqual([]);
  });
});

describe('recomputeCompanyRollup', () => {
  it('adds up gifts from an organization', async () => {
    const fake = createFakeClient({
      companies: [{ id: 'c1' }],
      donations: [
        donation('d1', { donorId: null, organizationDonorId: 'c1', amount: eur(5000) }),
        donation('d2', { donorId: null, organizationDonorId: 'c1', amount: eur(2500), status: 'PLEDGED' }),
      ],
      grants: [],
    });

    await recomputeCompanyRollup(deps(fake.client), 'c1');

    expect(fake.row('companies', 'c1')).toMatchObject({ totalGiven: { amountMicros: 5_000_000_000 }, activeGrantCount: 0 });
  });
});

describe('recomputeVolunteerRollup', () => {
  const setup = (person: Record<string, unknown> = {}) =>
    createFakeClient({
      people: [{ id: 'p1', contactTypes: ['DONOR'], volunteerStatus: null, volunteerSince: null, ...person }],
      volunteerLogs: [
        { id: 'v1', volunteerId: 'p1', hours: 3, activityDate: '2026-06-01', status: 'APPROVED' },
        { id: 'v2', volunteerId: 'p1', hours: 2, activityDate: '2026-09-15', status: 'APPROVED' },
        { id: 'v3', volunteerId: 'p1', hours: 4, activityDate: '2026-10-01', status: 'LOGGED' },
        { id: 'v4', volunteerId: 'p2', hours: 50, activityDate: '2026-10-01', status: 'APPROVED' },
      ],
    });

  it('totals approved hours and fills in sensible defaults', async () => {
    const fake = setup();

    await recomputeVolunteerRollup(deps(fake.client), 'p1');

    expect(fake.row('people', 'p1')).toMatchObject({
      volunteerHours: 5,
      lastVolunteeredOn: '2026-10-01',
      volunteerStatus: 'ACTIVE',
      volunteerSince: '2026-06-01',
      contactTypes: ['DONOR', 'VOLUNTEER'],
    });
  });

  it('never overrides a status or start date a coordinator chose', async () => {
    const fake = setup({ volunteerStatus: 'ONBOARDING', volunteerSince: '2025-01-01' });

    await recomputeVolunteerRollup(deps(fake.client), 'p1');

    expect(fake.row('people', 'p1')).toMatchObject({ volunteerStatus: 'ONBOARDING', volunteerSince: '2025-01-01' });
  });
});

describe('recomputePlanRollup', () => {
  it('forecasts only open plans', async () => {
    const fake = createFakeClient({
      cultivationPlans: [
        { id: 'a', stage: 'SOLICITATION', askAmount: eur(10000), probabilityPercent: null },
        { id: 'b', stage: 'STEWARDSHIP', askAmount: eur(10000), weightedAmount: eur(5000) },
      ],
    });

    await recomputePlanRollup(deps(fake.client), 'a');
    await recomputePlanRollup(deps(fake.client), 'b');

    expect(fake.row('cultivationPlans', 'a')!.weightedAmount).toEqual({ amountMicros: 5_000_000_000, currencyCode: 'USD' });
    expect(fake.row('cultivationPlans', 'b')!.weightedAmount).toBeNull();
  });
});

describe('recomputeProgramMetric', () => {
  const metric = (overrides: Record<string, unknown>) =>
    createFakeClient({ programMetrics: [{ id: 'm1', name: 'Tutoring', ...overrides }] });

  it('divides cost by people served', async () => {
    const fake = metric({ peopleServed: 120, totalCost: eur(14000) });

    await recomputeProgramMetric(deps(fake.client), 'm1');

    expect(fake.row('programMetrics', 'm1')!.costPerPerson).toEqual({ amountMicros: 116_670_000, currencyCode: 'USD' });
  });

  it('leaves it empty when nobody was served, instead of dividing by zero', async () => {
    for (const peopleServed of [0, null]) {
      const fake = metric({ peopleServed, totalCost: eur(500), costPerPerson: eur(9) });

      await recomputeProgramMetric(deps(fake.client), 'm1');

      expect(fake.row('programMetrics', 'm1')!.costPerPerson).toBeNull();
    }
  });

  it('leaves it empty when the cost is unknown, and is quiet when nothing changed', async () => {
    const unknown = metric({ peopleServed: 10, totalCost: null });

    await recomputeProgramMetric(deps(unknown.client), 'm1');
    expect(unknown.row('programMetrics', 'm1')!.costPerPerson ?? null).toBeNull();

    const settled = metric({ peopleServed: 10, totalCost: eur(100), costPerPerson: eur(10) });
    await recomputeProgramMetric(deps(settled.client), 'm1');
    expect(settled.writes).toEqual([]);
  });
});
