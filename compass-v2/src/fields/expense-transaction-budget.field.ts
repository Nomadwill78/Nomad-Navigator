import { defineField, FieldType, OnDeleteAction, RelationType } from 'twenty-sdk/define';

import { BUDGET_FIELD, EXPENSE_TRANSACTION_FIELD, OBJECT_ID } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: EXPENSE_TRANSACTION_FIELD.budget,
  objectUniversalIdentifier: OBJECT_ID.expenseTransaction,
  type: FieldType.RELATION,
  name: 'budget',
  label: 'Budget',
  description: 'The budget charged for this expense.',
  icon: 'IconCurrencyDollar',
  isNullable: false,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.budget,
  relationTargetFieldMetadataUniversalIdentifier: BUDGET_FIELD.expenseTransactions,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.RESTRICT,
    joinColumnName: 'budgetId',
  },
});
