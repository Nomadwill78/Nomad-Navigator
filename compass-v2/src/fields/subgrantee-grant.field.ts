import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import {
  GRANT_FIELD,
  OBJECT_ID,
  SUBGRANTEE_FIELD,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: SUBGRANTEE_FIELD.grant,
  objectUniversalIdentifier: OBJECT_ID.subgrantee,
  type: FieldType.RELATION,
  name: 'grant',
  label: 'Grant',
  description: 'The grant that funds this subgrantee.',
  icon: 'IconAward',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.grant,
  relationTargetFieldMetadataUniversalIdentifier: GRANT_FIELD.subgrantees,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'grantId',
  },
});
