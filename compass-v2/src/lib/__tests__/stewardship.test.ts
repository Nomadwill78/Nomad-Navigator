import { describe, expect, it } from 'vitest';

import {
  planBackgroundCheckTask,
  planRenewalTask,
  planReportDueTask,
  planThankYouTask,
} from 'src/lib/stewardship';

const baseGift = {
  donationId: 'don-1',
  donorId: 'p1',
  donorName: 'Maria Lopez',
  amount: 250,
  currency: 'USD',
  giftDate: '2026-10-05',
  status: 'RECEIVED',
  isFirstGift: false,
  isAnonymous: false,
  outreachPermission: 'OK_TO_CONTACT' as const,
  asOf: '2026-10-06',
};

describe('planThankYouTask', () => {
  it('creates a thank-you due two days after the gift', () => {
    const plan = planThankYouTask(baseGift);

    expect(plan).toMatchObject({
      title: 'Thank Maria Lopez for $250 gift',
      dueDate: '2026-10-07',
      dedupeKey: 'compass:thank-you:don-1',
      targetPersonId: 'p1',
    });
    expect(plan?.body).toContain('Reference: compass:thank-you:don-1');
  });

  it('asks for a personal call on major gifts', () => {
    const plan = planThankYouTask({ ...baseGift, amount: 5000 });

    expect(plan?.title).toBe('Call to thank Maria Lopez for $5,000 gift');
    expect(plan?.body).toContain('personal-thank-you amount');
  });

  it('welcomes first-time donors', () => {
    expect(planThankYouTask({ ...baseGift, isFirstGift: true })?.title).toBe(
      'Welcome and thank Maria Lopez for first gift ($250)',
    );
  });

  it('thanks for pledges too, but says pledge', () => {
    expect(planThankYouTask({ ...baseGift, status: 'PLEDGED' })?.title).toContain('pledge');
  });

  it('never creates a task for someone who asked not to be contacted', () => {
    expect(planThankYouTask({ ...baseGift, outreachPermission: 'DO_NOT_CONTACT' })).toBeNull();
  });

  it('keeps no-ask donors on thank-yous only', () => {
    expect(planThankYouTask({ ...baseGift, outreachPermission: 'NO_ASKS' })?.body).toContain('Do not include an ask');
  });

  it('protects anonymous donors', () => {
    expect(planThankYouTask({ ...baseGift, isAnonymous: true })?.body).toContain('anonymous');
  });

  it('skips written-off, zero and unattributed gifts', () => {
    expect(planThankYouTask({ ...baseGift, status: 'WRITTEN_OFF' })).toBeNull();
    expect(planThankYouTask({ ...baseGift, amount: 0 })).toBeNull();
    expect(planThankYouTask({ ...baseGift, donorId: null, companyId: null })).toBeNull();
  });

  it('never schedules a task in the past for a gift entered a few days late', () => {
    expect(planThankYouTask({ ...baseGift, giftDate: '2026-09-26' })?.dueDate).toBe('2026-10-06');
  });

  it('does not thank for history: gifts older than two weeks are skipped', () => {
    expect(planThankYouTask({ ...baseGift, giftDate: '2026-09-22' })).not.toBeNull();
    expect(planThankYouTask({ ...baseGift, giftDate: '2026-09-21' })).toBeNull();
    expect(planThankYouTask({ ...baseGift, giftDate: '2020-01-01' })).toBeNull();
  });

  it('can target an organization donor', () => {
    const plan = planThankYouTask({ ...baseGift, donorId: null, companyId: 'c1', donorName: 'Acme Co' });

    expect(plan).toMatchObject({ targetCompanyId: 'c1', targetPersonId: undefined });
  });
});

describe('planRenewalTask', () => {
  const base = {
    personId: 'p1',
    personName: 'Maria Lopez',
    lastGiftDate: '2025-12-20',
    lastGiftAmount: 100,
    currency: 'USD',
    outreachPermission: 'OK_TO_CONTACT' as const,
    asOf: '2026-10-06',
  };

  it('keys the reminder to the last gift so a later lapse creates a fresh one', () => {
    expect(planRenewalTask(base)?.dedupeKey).toBe('compass:renewal:p1:2025-12-20');
    expect(planRenewalTask({ ...base, lastGiftDate: '2026-02-01' })?.dedupeKey).toBe('compass:renewal:p1:2026-02-01');
  });

  it('does not ask no-ask donors for anything', () => {
    const plan = planRenewalTask({ ...base, outreachPermission: 'NO_ASKS' });

    expect(plan?.title).toContain('Check in with');
    expect(plan?.body).toContain('no asks');
  });

  it('creates nothing for do-not-contact', () => {
    expect(planRenewalTask({ ...base, outreachPermission: 'DO_NOT_CONTACT' })).toBeNull();
  });
});

describe('planReportDueTask', () => {
  const base = { grantId: 'g1', grantName: 'Clean Water', funderId: 'c1', asOf: '2026-10-06' };

  it('reminds inside the 14 day window and not before', () => {
    expect(planReportDueTask({ ...base, nextReportDue: '2026-10-20' })).not.toBeNull();
    expect(planReportDueTask({ ...base, nextReportDue: '2026-10-21' })).toBeNull();
  });

  it('keys by grant and due date so each cycle gets its own reminder', () => {
    expect(planReportDueTask({ ...base, nextReportDue: '2026-10-15' })?.dedupeKey).toBe('compass:report-due:g1:2026-10-15');
  });

  it('makes overdue reports loud, due today, and links the funder', () => {
    const plan = planReportDueTask({ ...base, nextReportDue: '2026-10-01' });

    expect(plan?.title).toBe('OVERDUE: report for Clean Water was due 2026-10-01');
    expect(plan?.dueDate).toBe('2026-10-06');
    expect(plan?.targetCompanyId).toBe('c1');
  });

  it('schedules the task three days before the deadline', () => {
    expect(planReportDueTask({ ...base, nextReportDue: '2026-10-15' })?.dueDate).toBe('2026-10-12');
  });
});

describe('planBackgroundCheckTask', () => {
  const base = { personId: 'p1', personName: 'Sam Rivera', asOf: '2026-10-06' };

  it('reminds within 30 days and for expired checks', () => {
    expect(planBackgroundCheckTask({ ...base, expiresOn: '2026-11-05' })).not.toBeNull();
    expect(planBackgroundCheckTask({ ...base, expiresOn: '2026-11-06' })).toBeNull();
    expect(planBackgroundCheckTask({ ...base, expiresOn: '2026-09-01' })?.title).toContain('expired');
  });
});
