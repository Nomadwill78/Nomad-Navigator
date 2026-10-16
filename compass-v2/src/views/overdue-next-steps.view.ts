import { defineView, ViewFilterOperand, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { OBJECT_ID, PLAN_FIELD, VIEW_ID } from 'src/constants/universal-identifiers';
import { columns, filterId, sortId } from 'src/views/view-helpers';

const VIEW_KEY = 'overdueSteps';

export default defineView({
  universalIdentifier: VIEW_ID.overdueSteps,
  name: 'Overdue next steps',
  objectUniversalIdentifier: OBJECT_ID.cultivationPlan,
  type: ViewType.TABLE,
  icon: 'IconAlarm',
  position: 6,
  fields: columns(VIEW_KEY, [
    [PLAN_FIELD.name, 240],
    [PLAN_FIELD.stage, 160],
    [PLAN_FIELD.donor, 180],
    [PLAN_FIELD.nextStep, 300],
    [PLAN_FIELD.nextStepDate, 140],
    [PLAN_FIELD.owner, 160],
  ]),
  filters: [
    {
      universalIdentifier: filterId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: PLAN_FIELD.nextStepDate,
      operand: ViewFilterOperand.IS_IN_PAST,
      value: '',
    },
    {
      universalIdentifier: filterId(VIEW_KEY, 1),
      fieldMetadataUniversalIdentifier: PLAN_FIELD.stage,
      operand: ViewFilterOperand.IS,
      value: ['IDENTIFICATION', 'QUALIFICATION', 'CULTIVATION', 'SOLICITATION'],
    },
  ],
  sorts: [
    {
      universalIdentifier: sortId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: PLAN_FIELD.nextStepDate,
      direction: ViewSortDirection.ASC,
    },
  ],
});
