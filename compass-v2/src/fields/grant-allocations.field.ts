import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import { GRANT_ALLOCATION_FIELD, GRANT_FIELD, OBJECT_ID } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: GRANT_FIELD.allocations,
  objectUniversalIdentifier: OBJECT_ID.grant,
  type: FieldType.RELATION,
  name: 'allocations',
  label: 'Budget allocations',
  description: 'Budget amounts allocated to this grant.',
  icon: 'IconHierarchy2',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.grantAllocation,
  relationTargetFieldMetadataUniversalIdentifier: GRANT_ALLOCATION_FIELD.grant,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
