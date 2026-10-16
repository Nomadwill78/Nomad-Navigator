import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  COMPANY_FIELD,
  DONATION_FIELD,
  OBJECT_ID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: COMPANY_FIELD.donations,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'donations',
  label: 'Donations',
  description: 'Gifts and pledges from this organization, including grant payments.',
  icon: 'IconHeartHandshake',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.donation,
  relationTargetFieldMetadataUniversalIdentifier: DONATION_FIELD.organizationDonor,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
