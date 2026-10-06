import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import {
  DONATION_FIELD,
  GRANT_FIELD,
  OBJECT_ID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: DONATION_FIELD.grant,
  objectUniversalIdentifier: OBJECT_ID.donation,
  type: FieldType.RELATION,
  name: 'grant',
  label: 'Grant',
  description: 'Link a grant payment to its grant so Payments received stays accurate.',
  icon: 'IconAward',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.grant,
  relationTargetFieldMetadataUniversalIdentifier: GRANT_FIELD.donations,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'grantId',
  },
});
