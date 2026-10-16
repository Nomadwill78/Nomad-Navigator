import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import {
  CAMPAIGN_FIELD,
  DONATION_FIELD,
  OBJECT_ID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CAMPAIGN_FIELD.donations,
  objectUniversalIdentifier: OBJECT_ID.fundraisingCampaign,
  type: FieldType.RELATION,
  name: 'donations',
  label: 'Donations',
  description: 'Gifts counted toward this campaign.',
  icon: 'IconHeartHandshake',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.donation,
  relationTargetFieldMetadataUniversalIdentifier: DONATION_FIELD.campaign,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
