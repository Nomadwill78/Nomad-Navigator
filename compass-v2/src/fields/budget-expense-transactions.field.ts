import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import { BUDGET_FIELD, EXPENSE_TRANSACTION_FIELD, OBJECT_ID } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: BUDGET_FIELD.expenseTransactions,
  objectUniversalIdentifier: OBJECT_ID.budget,
  type: FieldType.RELATION,
  name: 'expenseTransactions',
  label: 'Expense transactions',
  description: 'Expenses charged to this budget.',
  icon: 'IconReceipt',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.expenseTransaction,
  relationTargetFieldMetadataUniversalIdentifier: EXPENSE_TRANSACTION_FIELD.budget,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
