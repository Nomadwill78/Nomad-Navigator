import { defineView, ViewFilterOperand, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { GRANT_FIELD, OBJECT_ID, VIEW_ID } from 'src/constants/universal-identifiers';
import { columns, filterId, sortId } from 'src/views/view-helpers';

const VIEW_KEY = 'grantsNeedingAttention';

export default defineView({
  universalIdentifier: VIEW_ID.grantsNeedingAttention,
  name: 'Grants needing attention',
  objectUniversalIdentifier: OBJECT_ID.grant,
  type: ViewType.TABLE,
  icon: 'IconAlertTriangle',
  position: 10,
  fields: columns(VIEW_KEY, [
    [GRANT_FIELD.name, 240],
    [GRANT_FIELD.funder, 180],
    [GRANT_FIELD.pace, 130],
    [GRANT_FIELD.kpiProgressPercent, 120],
    [GRANT_FIELD.timeElapsedPercent, 120],
    [GRANT_FIELD.nextReportDue, 140],
    [GRANT_FIELD.dataCheck, 320],
  ]),
  filters: [
    {
      universalIdentifier: filterId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: GRANT_FIELD.status,
      operand: ViewFilterOperand.IS,
      value: ['ACTIVE'],
    },
    {
      universalIdentifier: filterId(VIEW_KEY, 1),
      fieldMetadataUniversalIdentifier: GRANT_FIELD.pace,
      operand: ViewFilterOperand.IS,
      value: ['SLIPPING', 'OFF_PACE'],
    },
  ],
  sorts: [
    {
      universalIdentifier: sortId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: GRANT_FIELD.nextReportDue,
      direction: ViewSortDirection.ASC,
    },
  ],
});
