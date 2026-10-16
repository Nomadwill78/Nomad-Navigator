import { defineView, ViewType } from 'twenty-sdk/define';

import { GRANT_STATUS_SEEDS } from 'src/constants/enums';
import { GRANT_FIELD, OBJECT_ID, VIEW_ID } from 'src/constants/universal-identifiers';
import { boardGroups, columns } from 'src/views/view-helpers';

const VIEW_KEY = 'grantPipeline';

export default defineView({
  universalIdentifier: VIEW_ID.grantPipeline,
  name: 'Grant pipeline',
  objectUniversalIdentifier: OBJECT_ID.grant,
  type: ViewType.KANBAN,
  icon: 'IconLayoutKanban',
  position: 8,
  fields: columns(VIEW_KEY, [
    [GRANT_FIELD.name, 240],
    [GRANT_FIELD.funder, 180],
    [GRANT_FIELD.awardAmount, 130],
    [GRANT_FIELD.requestedAmount, 130],
    [GRANT_FIELD.applicationDeadline, 150],
  ]),
  mainGroupByFieldMetadataUniversalIdentifier: GRANT_FIELD.status,
  groups: boardGroups(VIEW_KEY, GRANT_STATUS_SEEDS),
});
