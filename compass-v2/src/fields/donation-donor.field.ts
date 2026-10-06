import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  DONATION_FIELD,
  OBJECT_ID,
  PERSON_FIELD,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: DONATION_FIELD.donor,
  objectUniversalIdentifier: OBJECT_ID.donation,
  type: FieldType.RELATION,
  name: 'donor',
  label: 'Donor',
  description: 'The person who gave.',
  icon: 'IconUser',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: PERSON_FIELD.donations,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'donorId',
  },
});
