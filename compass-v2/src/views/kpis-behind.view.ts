import { defineView, ViewFilterOperand, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { GRANT_KPI_FIELD, OBJECT_ID, VIEW_ID } from 'src/constants/universal-identifiers';
import { columns, filterId, sortId } from 'src/views/view-helpers';

const VIEW_KEY = 'kpisBehind';

export default defineView({
  universalIdentifier: VIEW_ID.kpisBehind,
  name: 'KPIs that are behind',
  objectUniversalIdentifier: OBJECT_ID.grantKpi,
  type: ViewType.TABLE,
  icon: 'IconTrendingDown',
  position: 11,
  fields: columns(VIEW_KEY, [
    [GRANT_KPI_FIELD.name, 260],
    [GRANT_KPI_FIELD.grant, 220],
    [GRANT_KPI_FIELD.subgrantee, 180],
    [GRANT_KPI_FIELD.target, 110],
    [GRANT_KPI_FIELD.current, 110],
    [GRANT_KPI_FIELD.progressPercent, 110],
    [GRANT_KPI_FIELD.asOfDate, 130],
  ]),
  filters: [
    {
      universalIdentifier: filterId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: GRANT_KPI_FIELD.status,
      operand: ViewFilterOperand.IS,
      value: ['BEHIND'],
    },
  ],
  sorts: [
    {
      universalIdentifier: sortId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: GRANT_KPI_FIELD.progressPercent,
      direction: ViewSortDirection.ASC,
    },
  ],
});
