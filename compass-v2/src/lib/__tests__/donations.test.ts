import { describe, expect, it } from 'vitest';

import {
  percentOfGoal,
  resolveGivingStatus,
  summarizeDonorGiving,
  summarizeFunding,
  type DonationRow,
} from 'src/lib/donations';

const gift = (overrides: Partial<DonationRow> & { id: string }): DonationRow => ({
  amountUnits: 100,
  currency: 'USD',
  giftDate: '2026-01-15',
  status: 'RECEIVED',
  giftType: 'ONE_TIME',
  ...overrides,
});

describe('resolveGivingStatus', () => {
  const asOf = '2026-10-06';
  const status = (lastGiftDate: string, firstGiftDate = '2020-01-01') =>
    resolveGivingStatus({ giftCount: 3, firstGiftDate, lastGiftDate, asOf });

  it('treats someone with no gifts as a prospect', () => {
    expect(resolveGivingStatus({ giftCount: 0, firstGiftDate: null, lastGiftDate: null, asOf })).toBe('PROSPECT');
  });

  it('moves through the stages as months pass since the last gift', () => {
    expect(status('2026-09-01')).toBe('ACTIVE');
    expect(status('2026-01-07')).toBe('ACTIVE'); // 8 full months
    expect(status('2026-01-06')).toBe('AT_RISK'); // 9 full months
    expect(status('2025-09-07')).toBe('AT_RISK'); // 12 full months, still in the grace window
    expect(status('2025-09-06')).toBe('LAPSED'); // 13 full months
    expect(status('2024-09-06')).toBe('INACTIVE'); // 25 full months
  });

  it('calls a donor new only during the first year, and only while they are current', () => {
    expect(status('2026-08-01', '2026-08-01')).toBe('NEW');
    expect(status('2026-08-01', '2025-10-07')).toBe('NEW');
    expect(status('2026-08-01', '2025-10-06')).toBe('ACTIVE');
    // a first-time donor who has gone quiet is at risk, not "new"
    expect(status('2026-01-06', '2026-01-06')).toBe('AT_RISK');
  });

  it('is unknown when gifts exist but no date does', () => {
    expect(resolveGivingStatus({ giftCount: 2, firstGiftDate: null, lastGiftDate: null, asOf })).toBeNull();
  });
});

describe('summarizeDonorGiving', () => {
  const asOf = '2026-10-06';

  it('totals only received cash gifts', () => {
    const summary = summarizeDonorGiving(
      [
        gift({ id: 'a', amountUnits: 100, giftDate: '2025-01-01' }),
        gift({ id: 'b', amountUnits: 250.5, giftDate: '2026-03-01' }),
        gift({ id: 'c', amountUnits: 9999, status: 'PLEDGED' }),
        gift({ id: 'd', amountUnits: 9999, status: 'WRITTEN_OFF' }),
        gift({ id: 'e', amountUnits: 9999, giftType: 'IN_KIND' }),
      ],
      asOf,
    );

    expect(summary).toMatchObject({
      lifetimeGiving: 350.5,
      giftCount: 2,
      firstGiftDate: '2025-01-01',
      lastGiftDate: '2026-03-01',
      lastGiftAmount: 250.5,
      largestGift: 250.5,
      givingStatus: 'ACTIVE',
      skippedGiftCount: 0,
    });
  });

  it('does not add up different currencies, and says so', () => {
    const summary = summarizeDonorGiving(
      [gift({ id: 'a', amountUnits: 100 }), gift({ id: 'b', amountUnits: 5000, currency: 'EUR' })],
      asOf,
    );

    expect(summary.lifetimeGiving).toBe(100);
    expect(summary.skippedGiftCount).toBe(1);
  });

  it('ignores zero, negative and missing amounts', () => {
    const summary = summarizeDonorGiving(
      [gift({ id: 'a', amountUnits: 0 }), gift({ id: 'b', amountUnits: -50 }), gift({ id: 'c', amountUnits: null })],
      asOf,
    );

    expect(summary).toMatchObject({ giftCount: 0, lifetimeGiving: 0, givingStatus: 'PROSPECT', skippedGiftCount: 3 });
  });

  it('takes the latest dated gift as last, even if listed out of order', () => {
    const summary = summarizeDonorGiving(
      [
        gift({ id: 'new', amountUnits: 75, giftDate: '2026-08-01' }),
        gift({ id: 'old', amountUnits: 500, giftDate: '2019-01-01' }),
      ],
      asOf,
    );

    expect(summary).toMatchObject({ firstGiftDate: '2019-01-01', lastGiftDate: '2026-08-01', lastGiftAmount: 75, largestGift: 500 });
  });

  it('still counts a gift with no date but cannot date it', () => {
    const summary = summarizeDonorGiving([gift({ id: 'a', giftDate: null })], asOf);

    expect(summary).toMatchObject({ giftCount: 1, lastGiftDate: null, givingStatus: null });
  });

  it('avoids floating point drift in totals', () => {
    const summary = summarizeDonorGiving(
      [gift({ id: 'a', amountUnits: 0.1 }), gift({ id: 'b', amountUnits: 0.2 })],
      asOf,
    );

    expect(summary.lifetimeGiving).toBe(0.3);
  });
});

describe('summarizeFunding', () => {
  it('separates received from pledged and counts distinct contributors', () => {
    const summary = summarizeFunding([
      gift({ id: 'a', amountUnits: 100, donorId: 'p1' }),
      gift({ id: 'b', amountUnits: 50, donorId: 'p1' }),
      gift({ id: 'c', amountUnits: 1000, companyId: 'c1' }),
      gift({ id: 'd', amountUnits: 400, status: 'PLEDGED', donorId: 'p2' }),
      gift({ id: 'e', amountUnits: 77, giftType: 'IN_KIND', donorId: 'p3' }),
    ]);

    expect(summary).toEqual({ receivedAmount: 1150, pledgedAmount: 400, giftCount: 3, contributorCount: 2 });
  });
});

describe('percentOfGoal', () => {
  it('is null without a usable goal', () => {
    expect(percentOfGoal(500, null)).toBeNull();
    expect(percentOfGoal(500, 0)).toBeNull();
  });

  it('computes progress and allows going over', () => {
    expect(percentOfGoal(2500, 10000)).toBe(25);
    expect(percentOfGoal(12500, 10000)).toBe(125);
  });
});
