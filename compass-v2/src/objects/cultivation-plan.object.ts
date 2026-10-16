import { defineObject } from 'twenty-sdk/define';

import { CULTIVATION_STAGE_SEEDS } from 'src/constants/enums';
import { OBJECT_ID, PLAN_FIELD } from 'src/constants/universal-identifiers';
import {
  currencyField,
  dateField,
  numberField,
  selectField,
  textField,
  nameField,
} from 'src/objects/field-helpers';

export default defineObject({
  universalIdentifier: OBJECT_ID.cultivationPlan,
  nameSingular: 'cultivationPlan',
  namePlural: 'cultivationPlans',
  labelSingular: 'Cultivation plan',
  labelPlural: 'Cultivation plans',
  description:
    'Your plan to build a relationship with one donor or prospect and move toward a gift: who owns it, what the next step is, and when.',
  icon: 'IconSeeding',
  labelIdentifierFieldMetadataUniversalIdentifier: PLAN_FIELD.name,
  fields: [
    nameField(PLAN_FIELD.name, 'Plan', 'For example: Maria Lopez, major gift 2026'),
    selectField(PLAN_FIELD.stage, 'stage', 'Stage', CULTIVATION_STAGE_SEEDS, {
      defaultValue: 'IDENTIFICATION',
      icon: 'IconRoute',
      description: 'Identify, qualify, cultivate, ask, then steward. Drag cards between stages on the board.',
    }),
    currencyField(PLAN_FIELD.askAmount, 'askAmount', 'Planned ask', {
      description: 'The amount you plan to ask for.',
      icon: 'IconTargetArrow',
    }),
    numberField(PLAN_FIELD.probabilityPercent, 'probabilityPercent', 'Likelihood', {
      description: 'Your own estimate, 0 to 100. Leave empty to use the standard for the stage (identify 5%, qualify 10%, cultivate 25%, ask 50%).',
      percentage: true,
      icon: 'IconDice',
    }),
    currencyField(PLAN_FIELD.weightedAmount, 'weightedAmount', 'Forecast value', {
      description: 'Planned ask times likelihood. Only open plans count. Calculated.',
      icon: 'IconChartInfographic',
      system: true,
    }),
    textField(PLAN_FIELD.purpose, 'purpose', 'What the ask is for', {
      description: 'The program, fund or naming opportunity.',
    }),
    dateField(PLAN_FIELD.targetAskDate, 'targetAskDate', 'Target ask date', { icon: 'IconCalendarDue' }),
    textField(PLAN_FIELD.nextStep, 'nextStep', 'Next step', {
      description: 'The single next thing that moves this relationship forward.',
      icon: 'IconArrowRight',
    }),
    dateField(PLAN_FIELD.nextStepDate, 'nextStepDate', 'Next step date', {
      description: 'Plans with an overdue next step appear in the Overdue next steps view.',
      icon: 'IconCalendarDue',
    }),
    dateField(PLAN_FIELD.lastContactDate, 'lastContactDate', 'Last contact', { icon: 'IconPhoneCall' }),
    textField(PLAN_FIELD.strategy, 'strategy', 'Strategy', {
      description: 'Why this donor, what they care about, who should be involved.',
      icon: 'IconCompass',
    }),
  ],
});
