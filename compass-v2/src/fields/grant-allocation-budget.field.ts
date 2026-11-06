import { defineField, FieldType, OnDeleteAction, RelationType } from 'twenty-sdk/define';

import { BUDGET_FIELD, GRANT_ALLOCATION_FIELD, OBJECT_ID } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: GRANT_ALLOCATION_FIELD.budget,
  objectUniversalIdentifier: OBJECT_ID.grantAllocation,
  type: FieldType.RELATION,
  name: 'budget',
  label: 'Budget',
  description: 'The budget funding this grant allocation.',
  icon: 'IconCurrencyDollar',
  isNullable: false,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.budget,
  relationTargetFieldMetadataUniversalIdentifier: BUDGET_FIELD.allocations,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.RESTRICT,
    joinColumnName: 'budgetId',
  },
});
