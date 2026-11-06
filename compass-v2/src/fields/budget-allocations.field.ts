import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import { BUDGET_FIELD, GRANT_ALLOCATION_FIELD, OBJECT_ID } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: BUDGET_FIELD.allocations,
  objectUniversalIdentifier: OBJECT_ID.budget,
  type: FieldType.RELATION,
  name: 'allocations',
  label: 'Grant allocations',
  description: 'Grant allocations funded by this budget.',
  icon: 'IconHierarchy2',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.grantAllocation,
  relationTargetFieldMetadataUniversalIdentifier: GRANT_ALLOCATION_FIELD.budget,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
