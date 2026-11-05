import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import { EXPENSE_TRANSACTION_FIELD, GRANT_FIELD, OBJECT_ID } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: GRANT_FIELD.expenseTransactions,
  objectUniversalIdentifier: OBJECT_ID.grant,
  type: FieldType.RELATION,
  name: 'expenseTransactions',
  label: 'Expense transactions',
  description: 'Expense transactions charged to this grant.',
  icon: 'IconReceipt',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.expenseTransaction,
  relationTargetFieldMetadataUniversalIdentifier: EXPENSE_TRANSACTION_FIELD.grant,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
