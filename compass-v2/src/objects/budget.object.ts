import { defineObject } from 'twenty-sdk/define';

import { FISCAL_YEAR_SEEDS } from 'src/constants/enums';
import { BUDGET_FIELD, OBJECT_ID } from 'src/constants/universal-identifiers';
import { currencyField, nameField, selectField, textField } from 'src/objects/field-helpers';

export default defineObject({
  universalIdentifier: OBJECT_ID.budget,
  nameSingular: 'budget',
  namePlural: 'budgets',
  labelSingular: 'Budget',
  labelPlural: 'Budgets',
  description: 'A program budget for one fiscal year, with expense totals calculated from its ledger entries.',
  icon: 'IconCurrencyDollar',
  labelIdentifierFieldMetadataUniversalIdentifier: BUDGET_FIELD.name,
  fields: [
    nameField(BUDGET_FIELD.name, 'Budget name'),
    selectField(BUDGET_FIELD.fiscalYear, 'fiscalYear', 'Fiscal year', FISCAL_YEAR_SEEDS),
    textField(BUDGET_FIELD.programName, 'programName', 'Program', {
      description: 'The program this budget covers. Compass v2 does not currently define a separate Program record.',
    }),
    currencyField(BUDGET_FIELD.totalBudgetAmount, 'totalBudgetAmount', 'Total budget amount'),
    currencyField(BUDGET_FIELD.totalSpentAmount, 'totalSpentAmount', 'Total spent', {
      description: 'Calculated from expense transactions linked to this budget.',
      system: true,
    }),
    currencyField(BUDGET_FIELD.remainingBalance, 'remainingBalance', 'Remaining balance', {
      description: 'Total budget amount minus linked expense transactions. Empty until a budget amount is entered.',
      system: true,
    }),
  ],
});
