import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import {
  GRANT_FIELD,
  OBJECT_ID,
  SUBGRANTEE_FIELD,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: GRANT_FIELD.subgrantees,
  objectUniversalIdentifier: OBJECT_ID.grant,
  type: FieldType.RELATION,
  name: 'subgrantees',
  label: 'Subgrantees',
  description: 'Partner organizations that receive part of this grant.',
  icon: 'IconHierarchy2',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.subgrantee,
  relationTargetFieldMetadataUniversalIdentifier: SUBGRANTEE_FIELD.grant,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
