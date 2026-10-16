import { defineObject } from 'twenty-sdk/define';

import { OBJECT_ID, PROGRAM_METRIC_FIELD } from 'src/constants/universal-identifiers';
import { currencyField, dateField, nameField, numberField } from 'src/objects/field-helpers';

export default defineObject({
  universalIdentifier: OBJECT_ID.programMetric,
  nameSingular: 'programMetric',
  namePlural: 'programMetrics',
  labelSingular: 'Program result',
  labelPlural: 'Program results',
  description: 'One month of results for a program: people served, what it cost, and the cost per person.',
  icon: 'IconChartBar',
  labelIdentifierFieldMetadataUniversalIdentifier: PROGRAM_METRIC_FIELD.name,
  fields: [
    nameField(PROGRAM_METRIC_FIELD.name, 'Program', 'The program these results are for.'),
    dateField(PROGRAM_METRIC_FIELD.period, 'period', 'Month', {
      description: 'Any date inside the month these results cover. Use the first of the month.',
    }),
    numberField(PROGRAM_METRIC_FIELD.peopleServed, 'peopleServed', 'People served', {
      integer: true,
      icon: 'IconUsers',
    }),
    currencyField(PROGRAM_METRIC_FIELD.totalCost, 'totalCost', 'Total cost', {
      description: 'What the program cost that month.',
    }),
    currencyField(PROGRAM_METRIC_FIELD.costPerPerson, 'costPerPerson', 'Cost per person', {
      description: 'Total cost divided by people served. Calculated. Empty when nobody was served.',
      icon: 'IconCoin',
      system: true,
    }),
  ],
});
