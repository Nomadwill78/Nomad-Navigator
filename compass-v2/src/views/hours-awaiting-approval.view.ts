import { defineView, ViewFilterOperand, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { OBJECT_ID, VIEW_ID, VOLUNTEER_LOG_FIELD } from 'src/constants/universal-identifiers';
import { columns, filterId, sortId } from 'src/views/view-helpers';

const VIEW_KEY = 'hoursAwaitingApproval';

export default defineView({
  universalIdentifier: VIEW_ID.hoursAwaitingApproval,
  name: 'Hours awaiting approval',
  objectUniversalIdentifier: OBJECT_ID.volunteerLog,
  type: ViewType.TABLE,
  icon: 'IconClockCheck',
  position: 13,
  fields: columns(VIEW_KEY, [
    [VOLUNTEER_LOG_FIELD.name, 280],
    [VOLUNTEER_LOG_FIELD.volunteer, 200],
    [VOLUNTEER_LOG_FIELD.activityDate, 130],
    [VOLUNTEER_LOG_FIELD.hours, 100],
    [VOLUNTEER_LOG_FIELD.activity, 220],
    [VOLUNTEER_LOG_FIELD.grant, 200],
  ]),
  filters: [
    {
      universalIdentifier: filterId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: VOLUNTEER_LOG_FIELD.status,
      operand: ViewFilterOperand.IS,
      value: ['LOGGED'],
    },
  ],
  sorts: [
    {
      universalIdentifier: sortId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: VOLUNTEER_LOG_FIELD.activityDate,
      direction: ViewSortDirection.DESC,
    },
  ],
});
