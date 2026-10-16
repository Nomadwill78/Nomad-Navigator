import { DEFAULT_CURRENCY } from 'src/lib/money';
import { DEFAULT_MAJOR_GIFT_THRESHOLD } from 'src/lib/stewardship';

// Settings are Twenty "application variables" (Settings > Applications > Nomad
// Compass). They reach the code as text, so each one is parsed defensively: a
// typo in a setting falls back to the safe default instead of breaking a job.

export type CompassSettings = {
  currency: string;
  majorGiftThreshold: number;
  aiIncludeFreeText: boolean;
  aiWeeklyInsightsEnabled: boolean;
  aiWeeklyInsightLimit: number;
};

type Environment = Record<string, string | undefined>;

const isCurrencyCode = (value: string): boolean => {
  try {
    new Intl.NumberFormat('en-US', { style: 'currency', currency: value });

    return /^[A-Z]{3}$/.test(value);
  } catch {
    return false;
  }
};

const positiveNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);

  return value !== undefined && value.trim() !== '' && Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const readSettings = (environment: Environment): CompassSettings => {
  const currency = (environment.REPORTING_CURRENCY ?? '').trim().toUpperCase();

  return {
    currency: isCurrencyCode(currency) ? currency : DEFAULT_CURRENCY,
    majorGiftThreshold: positiveNumber(environment.MAJOR_GIFT_THRESHOLD, DEFAULT_MAJOR_GIFT_THRESHOLD),
    aiIncludeFreeText: environment.AI_INCLUDE_FREE_TEXT === 'true',
    aiWeeklyInsightsEnabled: environment.AI_WEEKLY_INSIGHTS_ENABLED === 'true',
    aiWeeklyInsightLimit: Math.min(Math.floor(positiveNumber(environment.AI_WEEKLY_INSIGHT_LIMIT, 20)), 100),
  };
};

export const settingsProblems = (environment: Environment): string[] => {
  const problems: string[] = [];
  const currency = (environment.REPORTING_CURRENCY ?? '').trim();

  if (currency && !isCurrencyCode(currency.toUpperCase())) {
    problems.push(`Reporting currency "${currency}" is not a valid 3-letter currency code, so USD is being used.`);
  }

  const threshold = environment.MAJOR_GIFT_THRESHOLD;
  if (threshold !== undefined && threshold.trim() !== '' && !(Number(threshold) > 0)) {
    problems.push(`Major gift threshold "${threshold}" is not a positive number, so ${DEFAULT_MAJOR_GIFT_THRESHOLD} is being used.`);
  }

  return problems;
};
