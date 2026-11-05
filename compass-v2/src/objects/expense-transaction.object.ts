import { defineObject } from 'twenty-sdk/define';

import { EXPENSE_CATEGORY_SEEDS } from 'src/constants/enums';
import { EXPENSE_TRANSACTION_FIELD, OBJECT_ID } from 'src/constants/universal-identifiers';
import { currencyField, dateField, nameField, selectField, textField } from 'src/objects/field-helpers';

export default defineObject({
  universalIdentifier: OBJECT_ID.expenseTransaction,
  nameSingular: 'expenseTransaction',
  namePlural: 'expenseTransactions',
  labelSingular: 'Expense transaction',
  labelPlural: 'Expense transactions',
  description: 'One program expenditure. Its linked budget and grant totals are recalculated from ledger entries.',
  icon: 'IconReceipt',
  labelIdentifierFieldMetadataUniversalIdentifier: EXPENSE_TRANSACTION_FIELD.name,
  fields: [
    nameField(EXPENSE_TRANSACTION_FIELD.name, 'Expense description'),
    dateField(EXPENSE_TRANSACTION_FIELD.transactionDate, 'transactionDate', 'Transaction date', { required: true }),
    currencyField(EXPENSE_TRANSACTION_FIELD.amount, 'amount', 'Amount', { required: true }),
    textField(EXPENSE_TRANSACTION_FIELD.vendor, 'vendor', 'Vendor'),
    selectField(EXPENSE_TRANSACTION_FIELD.expenseCategory, 'expenseCategory', 'Category', EXPENSE_CATEGORY_SEEDS),
  ],
});
