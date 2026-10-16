import { describe, expect, it } from 'vitest';

import { resolveNextStepHealth, weightedAskAmount } from 'src/lib/cultivation';
import { summarizeVolunteerHours } from 'src/lib/volunteer';

describe('summarizeVolunteerHours', () => {
  const asOf = '2026-10-06';

  it('counts only approved hours as total, and tracks pending separately', () => {
    const summary = summarizeVolunteerHours(
      [
        { hours: 3, activityDate: '2026-09-01', status: 'APPROVED' },
        { hours: 2.5, activityDate: '2026-09-15', status: 'APPROVED' },
        { hours: 4, activityDate: '2026-10-01', status: 'LOGGED' },
      ],
      asOf,
    );

    expect(summary).toEqual({ approvedHours: 5.5, pendingHours: 4, lastVolunteeredOn: '2026-10-01', logCount: 3 });
  });

  it('ignores zero, negative and non-numeric hours', () => {
    const summary = summarizeVolunteerHours(
      [
        { hours: 0, activityDate: '2026-09-01', status: 'APPROVED' },
        { hours: -3, activityDate: '2026-09-01', status: 'APPROVED' },
        { hours: 'lots', activityDate: '2026-09-01', status: 'APPROVED' },
      ],
      asOf,
    );

    expect(summary).toMatchObject({ approvedHours: 0, logCount: 0, lastVolunteeredOn: null });
  });

  it('never reports a future date as the last time someone volunteered', () => {
    const summary = summarizeVolunteerHours(
      [
        { hours: 2, activityDate: '2026-09-01', status: 'APPROVED' },
        { hours: 2, activityDate: '2027-01-01', status: 'APPROVED' },
      ],
      asOf,
    );

    expect(summary.lastVolunteeredOn).toBe('2026-09-01');
  });

  it('avoids floating point drift', () => {
    const summary = summarizeVolunteerHours(
      [
        { hours: 0.1, activityDate: '2026-09-01', status: 'APPROVED' },
        { hours: 0.2, activityDate: '2026-09-01', status: 'APPROVED' },
      ],
      asOf,
    );

    expect(summary.approvedHours).toBe(0.3);
  });
});

describe('weightedAskAmount', () => {
  it('uses the stage default probability', () => {
    expect(weightedAskAmount({ stage: 'SOLICITATION', askAmount: 10000 })).toBe(5000);
    expect(weightedAskAmount({ stage: 'CULTIVATION', askAmount: 10000 })).toBe(2500);
  });

  it('prefers a valid probability set on the plan', () => {
    expect(weightedAskAmount({ stage: 'SOLICITATION', askAmount: 10000, probabilityPercent: 80 })).toBe(8000);
    expect(weightedAskAmount({ stage: 'SOLICITATION', askAmount: 10000, probabilityPercent: 0 })).toBe(0);
  });

  it('ignores an out-of-range override rather than inflating the forecast', () => {
    expect(weightedAskAmount({ stage: 'SOLICITATION', askAmount: 10000, probabilityPercent: 250 })).toBe(5000);
    expect(weightedAskAmount({ stage: 'SOLICITATION', askAmount: 10000, probabilityPercent: -5 })).toBe(5000);
  });

  it('forecasts nothing for closed plans or missing asks', () => {
    expect(weightedAskAmount({ stage: 'STEWARDSHIP', askAmount: 10000 })).toBeNull();
    expect(weightedAskAmount({ stage: 'DECLINED', askAmount: 10000 })).toBeNull();
    expect(weightedAskAmount({ stage: 'CULTIVATION', askAmount: null })).toBeNull();
    expect(weightedAskAmount({ stage: 'CULTIVATION', askAmount: 0 })).toBeNull();
  });
});

describe('resolveNextStepHealth', () => {
  const asOf = '2026-10-06';
  const health = (nextStepDate: string | null, nextStep: string | null = 'Coffee', stage = 'CULTIVATION') =>
    resolveNextStepHealth({ stage, nextStep, nextStepDate, asOf });

  it('flags overdue, due soon, and scheduled steps', () => {
    expect(health('2026-10-05')).toBe('OVERDUE');
    expect(health('2026-10-06')).toBe('DUE_SOON');
    expect(health('2026-10-13')).toBe('DUE_SOON');
    expect(health('2026-10-14')).toBe('SCHEDULED');
  });

  it('reports none when nothing is planned or the plan is closed', () => {
    expect(health(null, null)).toBe('NONE');
    expect(health('2026-10-01', 'Call', 'DECLINED')).toBe('NONE');
  });

  it('treats a step with no date as scheduled but undated', () => {
    expect(health(null, 'Send invitation')).toBe('SCHEDULED');
  });
});
