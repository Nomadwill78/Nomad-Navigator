import { describe, expect, it } from 'vitest';

import { recordDonation, validateInboundDonation } from 'src/services/record-donation';
import { createFakeClient } from 'src/services/__tests__/fake-client';

const TODAY = '2026-10-06';

const valid = (overrides: Record<string, unknown> = {}) =>
  validateInboundDonation({ email: 'Maria@Example.org', firstName: 'Maria', amount: 50, ...overrides }, TODAY);

describe('validateInboundDonation', () => {
  it('accepts a minimal gift and fills in sensible defaults', () => {
    expect(valid()).toEqual({
      ok: true,
      value: expect.objectContaining({
        email: 'maria@example.org',
        amount: 50,
        currency: 'USD',
        giftDate: TODAY,
        status: 'RECEIVED',
        giftType: 'ONE_TIME',
        isAnonymous: false,
      }),
    });
  });

  it('accepts amounts sent as text, as many form tools do', () => {
    expect(valid({ amount: '25.50' })).toMatchObject({ ok: true, value: { amount: 25.5 } });
  });

  it('rejects bad amounts', () => {
    for (const amount of [0, -5, 'abc', null, undefined, Infinity, 99_999_999]) {
      expect(valid({ amount })).toMatchObject({ ok: false });
    }
  });

  it('requires saying who gave, but not both a person and an organization', () => {
    expect(validateInboundDonation({ amount: 10 }, TODAY)).toMatchObject({ ok: false });
    expect(valid({ organizationName: 'Acme' })).toMatchObject({ ok: false });
    expect(validateInboundDonation({ amount: 10, organizationName: 'Acme' }, TODAY)).toMatchObject({ ok: true });
  });

  it('rejects malformed emails, dates, currencies and choices', () => {
    expect(valid({ email: 'not-an-email' })).toMatchObject({ ok: false });
    expect(valid({ giftDate: '2026-02-30' })).toMatchObject({ ok: false });
    expect(valid({ currency: 'dollars' })).toMatchObject({ ok: false });
    expect(valid({ giftType: 'BRIBE' })).toMatchObject({ ok: false });
    expect(valid({ isAnonymous: 'yes' })).toMatchObject({ ok: false });
  });

  it('reports every problem at once so the sender can fix them in one go', () => {
    const result = validateInboundDonation({ amount: -1, email: 'x', giftDate: 'nope' }, TODAY);

    expect(result.ok === false && result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects things that are not objects', () => {
    for (const body of [null, 'text', 5, [1, 2]]) {
      expect(validateInboundDonation(body, TODAY)).toMatchObject({ ok: false });
    }
  });

  it('normalizes enums typed in lowercase', () => {
    expect(valid({ giftType: 'recurring', status: 'pledged' })).toMatchObject({ ok: true, value: { giftType: 'RECURRING', status: 'PLEDGED' } });
  });
});

describe('recordDonation', () => {
  const gift = (overrides: Record<string, unknown> = {}) => {
    const result = valid(overrides);
    if (!result.ok) throw new Error(result.errors.join(' '));

    return result.value;
  };

  it('creates a donor and a gift for someone new', async () => {
    const fake = createFakeClient({ people: [], donations: [], fundraisingCampaigns: [] });

    const result = await recordDonation(fake.client, gift({ firstName: 'Maria', lastName: 'Lopez', referenceNumber: 'ch_1' }));

    expect(result.status).toBe('created');
    expect(fake.rows('people')[0]).toMatchObject({
      name: { firstName: 'Maria', lastName: 'Lopez' },
      emails: { primaryEmail: 'maria@example.org' },
      contactTypes: ['DONOR'],
    });
    expect(fake.rows('donations')[0]).toMatchObject({
      donorId: result.personId,
      amount: { amountMicros: 50_000_000, currencyCode: 'USD' },
      referenceNumber: 'ch_1',
      status: 'RECEIVED',
    });
  });

  it('adds the gift to an existing donor instead of creating a duplicate person', async () => {
    const fake = createFakeClient({
      people: [{ id: 'p1', emails: { primaryEmail: 'maria@example.org' }, contactTypes: ['VOLUNTEER'] }],
      donations: [],
    });

    const result = await recordDonation(fake.client, gift());

    expect(fake.rows('people')).toHaveLength(1);
    expect(result.personId).toBe('p1');
    expect(fake.rows('donations')[0].donorId).toBe('p1');
  });

  it('does not record the same payment twice', async () => {
    const fake = createFakeClient({ people: [], donations: [] });

    const first = await recordDonation(fake.client, gift({ referenceNumber: 'ch_1' }));
    const second = await recordDonation(fake.client, gift({ referenceNumber: 'ch_1' }));

    expect(second).toMatchObject({ status: 'duplicate', donationId: first.donationId });
    expect(fake.rows('donations')).toHaveLength(1);
  });

  it('records an organization gift against an existing or new company', async () => {
    const fake = createFakeClient({ companies: [{ id: 'c1', name: 'Acme Co' }], donations: [] });

    const existing = await recordDonation(fake.client, gift({ email: undefined, firstName: undefined, organizationName: 'Acme Co' }));
    const created = await recordDonation(fake.client, gift({ email: undefined, firstName: undefined, organizationName: 'New Foundation' }));

    expect(existing.companyId).toBe('c1');
    expect(fake.rows('companies')).toHaveLength(2);
    expect(created.companyId).toBeDefined();
  });

  it('links a campaign only when its name matches exactly', async () => {
    const fake = createFakeClient({ people: [], donations: [], fundraisingCampaigns: [{ id: 'camp1', name: 'Spring Appeal' }] });

    await recordDonation(fake.client, gift({ campaignName: 'Spring Appeal' }));
    await recordDonation(fake.client, gift({ campaignName: 'Spring appeal ' }));

    expect(fake.rows('donations')[0].campaignId).toBe('camp1');
    expect(fake.rows('donations')[1].campaignId).toBeUndefined();
    expect(fake.rows('fundraisingCampaigns')).toHaveLength(1);
  });
});
