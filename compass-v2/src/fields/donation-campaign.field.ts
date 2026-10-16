import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import {
  CAMPAIGN_FIELD,
  DONATION_FIELD,
  OBJECT_ID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: DONATION_FIELD.campaign,
  objectUniversalIdentifier: OBJECT_ID.donation,
  type: FieldType.RELATION,
  name: 'campaign',
  label: 'Campaign',
  description: 'The campaign this gift counts toward.',
  icon: 'IconSpeakerphone',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.fundraisingCampaign,
  relationTargetFieldMetadataUniversalIdentifier: CAMPAIGN_FIELD.donations,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'campaignId',
  },
});
