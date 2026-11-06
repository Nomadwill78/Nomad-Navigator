import { defineField, FieldType, OnDeleteAction, RelationType } from 'twenty-sdk/define';

import { EXPENSE_TRANSACTION_FIELD, GRANT_FIELD, OBJECT_ID } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: EXPENSE_TRANSACTION_FIELD.grant,
  objectUniversalIdentifier: OBJECT_ID.expenseTransaction,
  type: FieldType.RELATION,
  name: 'grant',
  label: 'Restricted grant',
  description: 'Link this expense to a grant when it is charged to restricted funds.',
  icon: 'IconAward',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.grant,
  relationTargetFieldMetadataUniversalIdentifier: GRANT_FIELD.expenseTransactions,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'grantId',
  },
});
