import { defineObject } from 'twenty-sdk/define';

import { CAMPAIGN_STATUS_SEEDS, CAMPAIGN_TYPE_SEEDS } from 'src/constants/enums';
import { CAMPAIGN_FIELD, OBJECT_ID } from 'src/constants/universal-identifiers';
import {
  currencyField,
  dateField,
  numberField,
  selectField,
  nameField,
} from 'src/objects/field-helpers';

export default defineObject({
  universalIdentifier: OBJECT_ID.fundraisingCampaign,
  nameSingular: 'fundraisingCampaign',
  namePlural: 'fundraisingCampaigns',
  labelSingular: 'Campaign',
  labelPlural: 'Campaigns',
  description: 'A fundraising effort with a goal, such as an annual appeal, a gala or a giving day.',
  icon: 'IconSpeakerphone',
  labelIdentifierFieldMetadataUniversalIdentifier: CAMPAIGN_FIELD.name,
  fields: [
    nameField(CAMPAIGN_FIELD.name, 'Campaign', 'For example: Spring Appeal 2026'),
    selectField(CAMPAIGN_FIELD.campaignType, 'campaignType', 'Type', CAMPAIGN_TYPE_SEEDS, { icon: 'IconCategory' }),
    selectField(CAMPAIGN_FIELD.status, 'status', 'Status', CAMPAIGN_STATUS_SEEDS, { defaultValue: 'PLANNING' }),
    currencyField(CAMPAIGN_FIELD.goalAmount, 'goalAmount', 'Goal', { icon: 'IconFlag' }),
    dateField(CAMPAIGN_FIELD.startDate, 'startDate', 'Start date'),
    dateField(CAMPAIGN_FIELD.endDate, 'endDate', 'End date'),
    currencyField(CAMPAIGN_FIELD.raisedAmount, 'raisedAmount', 'Raised', {
      description: 'Cash received from donations linked to this campaign. Calculated.',
      system: true,
    }),
    currencyField(CAMPAIGN_FIELD.pledgedAmount, 'pledgedAmount', 'Pledged, not yet received', {
      description: 'Promised but not yet received. Not included in Raised. Calculated.',
      system: true,
    }),
    numberField(CAMPAIGN_FIELD.donorCount, 'donorCount', 'Donors', {
      description: 'Distinct people and organizations who gave. Calculated.',
      integer: true,
      icon: 'IconUsers',
      system: true,
    }),
    numberField(CAMPAIGN_FIELD.percentOfGoal, 'percentOfGoal', 'Percent of goal', {
      description: 'Raised divided by goal. Empty when there is no goal. Calculated.',
      percentage: true,
      icon: 'IconPercentage',
      system: true,
    }),
  ],
});
