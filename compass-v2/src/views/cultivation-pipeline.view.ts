import { defineView, ViewType } from 'twenty-sdk/define';

import { CULTIVATION_STAGE_SEEDS } from 'src/constants/enums';
import { OBJECT_ID, PLAN_FIELD, VIEW_ID } from 'src/constants/universal-identifiers';
import { boardGroups, columns } from 'src/views/view-helpers';

const VIEW_KEY = 'cultivationPipeline';

export default defineView({
  universalIdentifier: VIEW_ID.cultivationPipeline,
  name: 'Cultivation pipeline',
  objectUniversalIdentifier: OBJECT_ID.cultivationPlan,
  type: ViewType.KANBAN,
  icon: 'IconLayoutKanban',
  position: 5,
  fields: columns(VIEW_KEY, [
    [PLAN_FIELD.name, 220],
    [PLAN_FIELD.donor, 180],
    [PLAN_FIELD.askAmount, 130],
    [PLAN_FIELD.nextStepDate, 130],
    [PLAN_FIELD.owner, 160],
  ]),
  mainGroupByFieldMetadataUniversalIdentifier: PLAN_FIELD.stage,
  groups: boardGroups(VIEW_KEY, CULTIVATION_STAGE_SEEDS),
});
