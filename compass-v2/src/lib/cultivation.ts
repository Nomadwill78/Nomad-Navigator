import { type CultivationStage } from 'src/constants/enums';
import { daysBetween } from 'src/lib/dates';
import { roundTo, toNumber } from 'src/lib/money';

// How likely an ask is to turn into a gift at each stage of the cultivation
// cycle. These are starting points for forecasting, not facts: set a plan's own
// probability when you know better. A plan that has been won, declined or is
// being stewarded is no longer part of the forecast.
export const DEFAULT_STAGE_PROBABILITY: Record<CultivationStage, number> = {
  IDENTIFICATION: 5,
  QUALIFICATION: 10,
  CULTIVATION: 25,
  SOLICITATION: 50,
  STEWARDSHIP: 0,
  DECLINED: 0,
};

export const isOpenStage = (stage: unknown): boolean =>
  typeof stage === 'string' &&
  ['IDENTIFICATION', 'QUALIFICATION', 'CULTIVATION', 'SOLICITATION'].includes(stage);

export const weightedAskAmount = ({
  stage,
  askAmount,
  probabilityPercent,
}: {
  stage: unknown;
  askAmount: number | null;
  probabilityPercent?: unknown;
}): number | null => {
  if (askAmount === null || askAmount <= 0 || !isOpenStage(stage)) return null;

  const override = toNumber(probabilityPercent);
  const probability =
    override !== null && override >= 0 && override <= 100
      ? override
      : DEFAULT_STAGE_PROBABILITY[stage as CultivationStage];

  return roundTo((askAmount * probability) / 100, 2);
};

export type NextStepHealth = 'NONE' | 'OVERDUE' | 'DUE_SOON' | 'SCHEDULED';

export const DUE_SOON_DAYS = 7;

export const resolveNextStepHealth = ({
  stage,
  nextStep,
  nextStepDate,
  asOf,
}: {
  stage: unknown;
  nextStep?: string | null;
  nextStepDate?: string | null;
  asOf: string;
}): NextStepHealth => {
  if (!isOpenStage(stage)) return 'NONE';
  if (!nextStep?.trim() && !nextStepDate) return 'NONE';

  const days = nextStepDate ? daysBetween(asOf, nextStepDate) : null;

  if (days === null) return 'SCHEDULED';
  if (days < 0) return 'OVERDUE';
  if (days <= DUE_SOON_DAYS) return 'DUE_SOON';

  return 'SCHEDULED';
};
