import { defineObject } from 'twenty-sdk/define';

import { KPI_STATUS_SEEDS } from 'src/constants/enums';
import { GRANT_KPI_FIELD, OBJECT_ID } from 'src/constants/universal-identifiers';
import {
  dateField,
  numberField,
  selectField,
  textField,
  nameField,
} from 'src/objects/field-helpers';

export default defineObject({
  universalIdentifier: OBJECT_ID.grantKpi,
  nameSingular: 'grantKpi',
  namePlural: 'grantKpis',
  labelSingular: 'KPI',
  labelPlural: 'KPIs',
  description:
    'A measurable result a grant is expected to deliver, with a target, the result so far, and how it was measured.',
  icon: 'IconTarget',
  labelIdentifierFieldMetadataUniversalIdentifier: GRANT_KPI_FIELD.name,
  fields: [
    nameField(GRANT_KPI_FIELD.name, 'KPI', 'For example: Households with clean water access'),
    numberField(GRANT_KPI_FIELD.target, 'target', 'Target', {
      description: 'The number the grant promised to reach. A KPI with no target is shown as No target, never as a percentage.',
      icon: 'IconTargetArrow',
    }),
    numberField(GRANT_KPI_FIELD.current, 'current', 'Result so far', {
      description: 'The measured result to date.',
      icon: 'IconChartLine',
    }),
    textField(GRANT_KPI_FIELD.unit, 'unit', 'Unit', { description: 'What is being counted, such as people, households or workshops.' }),
    dateField(GRANT_KPI_FIELD.asOfDate, 'asOfDate', 'Measured on', {
      description: 'The date the result so far was measured. Results older than 90 days are flagged on active grants.',
    }),
    textField(GRANT_KPI_FIELD.measurementMethod, 'measurementMethod', 'How it was measured', {
      description: 'For example: sign-in sheets, intake database, annual survey. A funder may ask.',
      icon: 'IconRuler2',
    }),
    selectField(GRANT_KPI_FIELD.status, 'status', 'Status', KPI_STATUS_SEEDS, {
      defaultValue: 'NO_TARGET',
      system: true,
      description: 'Calculated from the target and result: Behind under 50%, On track from 50%, Met at 100%, Exceeded above 100%.',
    }),
    numberField(GRANT_KPI_FIELD.progressPercent, 'progressPercent', 'Progress', {
      description: 'Result divided by target, rounded down. Calculated.',
      percentage: true,
      icon: 'IconPercentage',
      system: true,
    }),
  ],
});
