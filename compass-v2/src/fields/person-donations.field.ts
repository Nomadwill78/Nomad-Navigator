import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  DONATION_FIELD,
  OBJECT_ID,
  PERSON_FIELD,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_FIELD.donations,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.RELATION,
  name: 'donations',
  label: 'Donations',
  description: 'Gifts and pledges from this person.',
  icon: 'IconHeartHandshake',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.donation,
  relationTargetFieldMetadataUniversalIdentifier: DONATION_FIELD.donor,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
