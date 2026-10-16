import { defineView, ViewFilterOperand, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { CAMPAIGN_FIELD, OBJECT_ID, VIEW_ID } from 'src/constants/universal-identifiers';
import { columns, filterId, sortId } from 'src/views/view-helpers';

const VIEW_KEY = 'activeCampaigns';

export default defineView({
  universalIdentifier: VIEW_ID.activeCampaigns,
  name: 'Active campaigns',
  objectUniversalIdentifier: OBJECT_ID.fundraisingCampaign,
  type: ViewType.TABLE,
  icon: 'IconSpeakerphone',
  position: 7,
  fields: columns(VIEW_KEY, [
    [CAMPAIGN_FIELD.name, 240],
    [CAMPAIGN_FIELD.campaignType, 150],
    [CAMPAIGN_FIELD.goalAmount, 130],
    [CAMPAIGN_FIELD.raisedAmount, 130],
    [CAMPAIGN_FIELD.percentOfGoal, 130],
    [CAMPAIGN_FIELD.donorCount, 100],
    [CAMPAIGN_FIELD.endDate, 130],
  ]),
  filters: [
    {
      universalIdentifier: filterId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: CAMPAIGN_FIELD.status,
      operand: ViewFilterOperand.IS,
      value: ['ACTIVE'],
    },
  ],
  sorts: [
    {
      universalIdentifier: sortId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: CAMPAIGN_FIELD.endDate,
      direction: ViewSortDirection.ASC,
    },
  ],
});
