import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import {
  DONATION_FIELD,
  GRANT_FIELD,
  OBJECT_ID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: GRANT_FIELD.donations,
  objectUniversalIdentifier: OBJECT_ID.grant,
  type: FieldType.RELATION,
  name: 'donations',
  label: 'Payments',
  description: 'Donations recorded as payments on this grant.',
  icon: 'IconCashBanknote',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.donation,
  relationTargetFieldMetadataUniversalIdentifier: DONATION_FIELD.grant,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
