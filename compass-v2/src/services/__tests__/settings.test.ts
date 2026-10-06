import { describe, expect, it } from 'vitest';

import { readSettings, settingsProblems } from 'src/services/settings';

describe('readSettings', () => {
  it('uses safe defaults when nothing is set', () => {
    expect(readSettings({})).toEqual({
      currency: 'USD',
      majorGiftThreshold: 1000,
      aiIncludeFreeText: false,
      aiWeeklyInsightsEnabled: false,
      aiWeeklyInsightLimit: 20,
    });
  });

  it('keeps AI features off unless explicitly turned on', () => {
    expect(readSettings({ AI_WEEKLY_INSIGHTS_ENABLED: 'yes', AI_INCLUDE_FREE_TEXT: 'True' })).toMatchObject({
      aiWeeklyInsightsEnabled: false,
      aiIncludeFreeText: false,
    });
    expect(readSettings({ AI_WEEKLY_INSIGHTS_ENABLED: 'true', AI_INCLUDE_FREE_TEXT: 'true' })).toMatchObject({
      aiWeeklyInsightsEnabled: true,
      aiIncludeFreeText: true,
    });
  });

  it('falls back instead of breaking on a typo', () => {
    expect(readSettings({ MAJOR_GIFT_THRESHOLD: 'lots', REPORTING_CURRENCY: 'dollars' })).toMatchObject({
      majorGiftThreshold: 1000,
      currency: 'USD',
    });
    expect(readSettings({ MAJOR_GIFT_THRESHOLD: '-5' }).majorGiftThreshold).toBe(1000);
  });

  it('accepts valid values, case-insensitively for currency', () => {
    expect(readSettings({ MAJOR_GIFT_THRESHOLD: '2500', REPORTING_CURRENCY: 'cad' })).toMatchObject({
      majorGiftThreshold: 2500,
      currency: 'CAD',
    });
  });

  it('caps the weekly AI batch so a typo cannot spend all credits', () => {
    expect(readSettings({ AI_WEEKLY_INSIGHT_LIMIT: '5000' }).aiWeeklyInsightLimit).toBe(100);
    expect(readSettings({ AI_WEEKLY_INSIGHT_LIMIT: '7' }).aiWeeklyInsightLimit).toBe(7);
  });
});

describe('settingsProblems', () => {
  it('is empty for good settings and explains bad ones in plain words', () => {
    expect(settingsProblems({ REPORTING_CURRENCY: 'USD', MAJOR_GIFT_THRESHOLD: '1000' })).toEqual([]);
    expect(settingsProblems({ REPORTING_CURRENCY: 'dollars', MAJOR_GIFT_THRESHOLD: 'x' })).toHaveLength(2);
  });
});
