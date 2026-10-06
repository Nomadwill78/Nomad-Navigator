import { describe, expect, it } from 'vitest';

import { importFromV1, monthStart, parseV1Payload } from 'src/services/import-v1';
import { createFakeClient } from 'src/services/__tests__/fake-client';

// Shaped exactly like the file v1's "Export JSON" button produces.
const v1Grants = [
  {
    id: 'a1',
    name: 'Clean Water Initiative',
    funder: 'Memphis Community Foundation',
    amount: 50000,
    spentAmount: 12000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'active',
    kpis: [
      { id: 'k1', name: 'Households served', target: 400, current: 150, unit: 'households' },
      { id: 'k2', name: 'Wells built', target: 12, current: 4, unit: 'wells' },
    ],
    subgrantees: [
      {
        id: 's1',
        name: 'Community Wells Co-op',
        allocatedAmount: 15000,
        status: 'active',
        kpis: [{ id: 'sk1', name: 'Crew trained', target: 30, current: 10, unit: 'people' }],
      },
    ],
  },
  {
    id: 'a2',
    name: 'Literacy Pilot',
    funder: 'Memphis Community Foundation',
    amount: 20000,
    startDate: '2026-03-01',
    endDate: '2027-02-28',
    status: 'pending',
    kpis: [],
    subgrantees: [],
  },
];

const v1Programs = [
  { id: '1', name: 'Jan', month: 'Jan', peopleServed: 1200, totalCost: 15000, costPerPerson: 12.5 },
  { id: '2', name: 'Feb', month: 'Feb', peopleServed: 1800, totalCost: 18500, costPerPerson: 10.2 },
];

const run = (client: Parameters<typeof importFromV1>[0], body: unknown) =>
  importFromV1(client, body, { currency: 'USD', thisYear: 2026 });

describe('parseV1Payload', () => {
  it('maps v1 statuses and keeps real values', () => {
    const parsed = parseV1Payload({ grants: v1Grants }, 2026);

    expect(parsed.problems).toEqual([]);
    expect(parsed.grants.map((grant) => grant.status)).toEqual(['ACTIVE', 'PENDING']);
    expect(parsed.grants[0].kpis).toHaveLength(2);
    expect(parsed.grants[0].subgrantees[0].kpis).toHaveLength(1);
  });

  it('skips a grant that is missing a name, funder, valid amount or known status, and says why', () => {
    const parsed = parseV1Payload(
      {
        grants: [
          { name: '', funder: 'X', amount: 1, status: 'active' },
          { name: 'No funder', funder: ' ', amount: 1, status: 'active' },
          { name: 'Bad amount', funder: 'X', amount: 'lots', status: 'active' },
          { name: 'Odd status', funder: 'X', amount: 1, status: 'archived' },
          { name: 'Fine', funder: 'X', amount: 1, status: 'completed' },
        ],
      },
      2026,
    );

    expect(parsed.grants.map((grant) => grant.name)).toEqual(['Fine']);
    expect(parsed.problems).toHaveLength(4);
    expect(parsed.problems.join(' ')).toContain('archived');
  });

  it('drops unreadable dates with a note instead of storing nonsense', () => {
    const parsed = parseV1Payload({ grants: [{ name: 'G', funder: 'F', amount: 1, status: 'active', startDate: '31/12/2026', endDate: '2026-12-31' }] }, 2026);

    expect(parsed.grants[0]).toMatchObject({ startDate: '', endDate: '2026-12-31' });
    expect(parsed.problems.join(' ')).toContain('start date could not be read');
  });

  it('copes with garbage input without throwing', () => {
    for (const body of [null, undefined, 'text', 42, [], { grants: 'nope' }, { grants: [null, 5, 'x'] }]) {
      expect(() => parseV1Payload(body, 2026)).not.toThrow();
    }
  });

  it('ignores an absurd year and uses this year', () => {
    expect(parseV1Payload({ year: 9999 }, 2026).year).toBe(2026);
    expect(parseV1Payload({ year: 2024 }, 2026).year).toBe(2024);
  });
});

describe('monthStart', () => {
  it('reads month names and dates', () => {
    expect(monthStart('Jan', 2026)).toBe('2026-01-01');
    expect(monthStart('September', 2025)).toBe('2025-09-01');
    expect(monthStart('2026-03', 2020)).toBe('2026-03-01');
    expect(monthStart('2026-13', 2020)).toBeNull();
    expect(monthStart('Q1', 2026)).toBeNull();
  });
});

describe('importFromV1', () => {
  it('creates the funder once, then each grant with its KPIs and subgrantees linked', async () => {
    const fake = createFakeClient({ companies: [], grants: [], grantKpis: [], subgrantees: [], programMetrics: [] });

    const summary = await run(fake.client, { grants: v1Grants });

    expect(summary).toMatchObject({
      funders: { created: 1, alreadyExisted: 0 },
      grants: { created: 2, alreadyExisted: 0 },
      kpis: 3,
      subgrantees: 1,
    });

    const [funder] = fake.rows('companies');
    const water = fake.rows('grants').find((grant) => grant.name === 'Clean Water Initiative')!;

    expect(funder.name).toBe('Memphis Community Foundation');
    expect(water).toMatchObject({
      status: 'ACTIVE',
      funderId: funder.id,
      awardAmount: { amountMicros: 50_000_000_000, currencyCode: 'USD' },
      spentAmount: { amountMicros: 12_000_000_000 },
      startDate: '2026-01-01',
    });

    const kpis = fake.rows('grantKpis');
    const [subgrantee] = fake.rows('subgrantees');

    expect(kpis).toHaveLength(3);
    expect(kpis.filter((kpi) => kpi.grantId === water.id)).toHaveLength(3);
    expect(kpis.find((kpi) => kpi.name === 'Crew trained')).toMatchObject({ subgranteeId: subgrantee.id, target: 30, current: 10 });
    expect(subgrantee).toMatchObject({ grantId: water.id, allocatedAmount: { amountMicros: 15_000_000_000 } });
  });

  it('reuses a funder that already exists', async () => {
    const fake = createFakeClient({ companies: [{ id: 'existing', name: 'Memphis Community Foundation' }], grants: [], grantKpis: [], subgrantees: [] });

    const summary = await run(fake.client, { grants: v1Grants });

    expect(summary.funders).toEqual({ created: 0, alreadyExisted: 1 });
    expect(fake.rows('companies')).toHaveLength(1);
    expect(fake.rows('grants')[0].funderId).toBe('existing');
  });

  it('can be run twice without duplicating anything', async () => {
    const fake = createFakeClient({ companies: [], grants: [], grantKpis: [], subgrantees: [], programMetrics: [] });

    await run(fake.client, { grants: v1Grants, programs: v1Programs });
    const second = await run(fake.client, { grants: v1Grants, programs: v1Programs });

    expect(second.grants).toEqual({ created: 0, alreadyExisted: 2 });
    expect(second.programResults).toEqual({ created: 0, alreadyExisted: 2 });
    expect(fake.rows('grants')).toHaveLength(2);
    expect(fake.rows('grantKpis')).toHaveLength(3);
    expect(fake.rows('programMetrics')).toHaveLength(2);
    expect(fake.rows('companies')).toHaveLength(1);
  });

  it('flags every v1 "pending" grant for a human to review rather than guessing', async () => {
    const fake = createFakeClient({ companies: [], grants: [] });

    const summary = await run(fake.client, { grants: v1Grants });

    expect(summary.reviewStatus).toEqual(['Literacy Pilot']);
  });

  it('writes nothing on a dry run, but reports exactly what would happen', async () => {
    const fake = createFakeClient({ companies: [], grants: [], grantKpis: [], subgrantees: [], programMetrics: [] });

    const summary = await run(fake.client, { grants: v1Grants, programs: v1Programs, dryRun: true });

    expect(summary).toMatchObject({ dryRun: true, grants: { created: 2 }, kpis: 3, subgrantees: 1, programResults: { created: 2 } });
    expect(fake.writes).toEqual([]);
  });

  it('turns v1 month names into real dates, and says which year it assumed', async () => {
    const fake = createFakeClient({ programMetrics: [] });

    const summary = await run(fake.client, { programs: v1Programs, year: 2025 });

    expect(fake.rows('programMetrics').map((row) => row.period)).toEqual(['2025-01-01', '2025-02-01']);
    expect(fake.rows('programMetrics')[0]).toMatchObject({ peopleServed: 1200, totalCost: { amountMicros: 15_000_000_000 } });
    expect(summary.problems.join(' ')).toContain('2025 was used as the year');
  });

  it('never imports v1\'s own cost-per-person, which Compass recalculates', async () => {
    const fake = createFakeClient({ programMetrics: [] });

    await run(fake.client, { programs: v1Programs });

    expect(fake.rows('programMetrics')[0]).not.toHaveProperty('costPerPerson');
  });
});
