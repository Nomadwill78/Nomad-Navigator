import { defineField, FieldType, OnDeleteAction, RelationType } from 'twenty-sdk/define';

import { GRANT_ALLOCATION_FIELD, GRANT_FIELD, OBJECT_ID } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: GRANT_ALLOCATION_FIELD.grant,
  objectUniversalIdentifier: OBJECT_ID.grantAllocation,
  type: FieldType.RELATION,
  name: 'grant',
  label: 'Grant',
  description: 'The grant receiving this allocation.',
  icon: 'IconAward',
  isNullable: false,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.grant,
  relationTargetFieldMetadataUniversalIdentifier: GRANT_FIELD.allocations,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.RESTRICT,
    joinColumnName: 'grantId',
  },
});
