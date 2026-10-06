import { defineObject } from 'twenty-sdk/define';

import {
  GRANT_STATUS_SEEDS,
  GRANT_PACE_SEEDS,
  REPORT_FREQUENCY_SEEDS,
} from 'src/constants/enums';
import { GRANT_FIELD, OBJECT_ID } from 'src/constants/universal-identifiers';
import {
  currencyField,
  dateField,
  dateTimeField,
  numberField,
  selectField,
  textField,
  nameField,
} from 'src/objects/field-helpers';

export default defineObject({
  universalIdentifier: OBJECT_ID.grant,
  nameSingular: 'grant',
  namePlural: 'grants',
  labelSingular: 'Grant',
  labelPlural: 'Grants',
  description:
    'A grant you are pursuing, were awarded, or have completed, with its budget, reporting schedule and results.',
  icon: 'IconAward',
  labelIdentifierFieldMetadataUniversalIdentifier: GRANT_FIELD.name,
  fields: [
    nameField(GRANT_FIELD.name, 'Grant name', 'For example: Clean Water Initiative 2026'),
    selectField(GRANT_FIELD.status, 'status', 'Status', GRANT_STATUS_SEEDS, {
      defaultValue: 'PROSPECT',
      icon: 'IconProgress',
      description: 'Where this grant is in its life, from prospect to completed.',
    }),
    currencyField(GRANT_FIELD.awardAmount, 'awardAmount', 'Award amount', {
      description: 'The amount the funder awarded. Leave empty until it is awarded.',
    }),
    currencyField(GRANT_FIELD.requestedAmount, 'requestedAmount', 'Amount requested', {
      description: 'What you asked for, while the grant is still a prospect or application.',
    }),
    currencyField(GRANT_FIELD.spentAmount, 'spentAmount', 'Spent so far', {
      description: 'Total spent against this grant to date. Update it as you close each month.',
      icon: 'IconReceipt',
    }),
    currencyField(GRANT_FIELD.receivedAmount, 'receivedAmount', 'Payments received', {
      description: 'Calculated from the donations you link to this grant that are marked Received.',
      icon: 'IconCashBanknote',
      system: true,
    }),
    dateField(GRANT_FIELD.startDate, 'startDate', 'Start date', { description: 'First day of the grant period.' }),
    dateField(GRANT_FIELD.endDate, 'endDate', 'End date', { description: 'Last day of the grant period.' }),
    dateField(GRANT_FIELD.applicationDeadline, 'applicationDeadline', 'Application deadline', {
      icon: 'IconCalendarDue',
    }),
    selectField(GRANT_FIELD.reportFrequency, 'reportFrequency', 'Reporting frequency', REPORT_FREQUENCY_SEEDS, {
      icon: 'IconRepeat',
      description: 'How often the funder wants a report. Used to schedule reminders.',
    }),
    dateField(GRANT_FIELD.nextReportDue, 'nextReportDue', 'Next report due', {
      icon: 'IconCalendarDue',
      description: 'You get a reminder task 14 days before this date.',
    }),
    dateField(GRANT_FIELD.lastReportSubmittedOn, 'lastReportSubmittedOn', 'Last report submitted on', {
      icon: 'IconSend',
      description: 'Set this after you send a report. Compass then moves Next report due to the next cycle.',
    }),
    textField(GRANT_FIELD.purpose, 'purpose', 'What it pays for', {
      description: 'A sentence or two on what the funds are for. Shown to the AI report writer when you opt in to free text.',
    }),
    numberField(GRANT_FIELD.kpiProgressPercent, 'kpiProgressPercent', 'KPI progress', {
      description: 'Average progress across KPIs that have a target, each capped at 100%. Calculated.',
      percentage: true,
      icon: 'IconTarget',
      system: true,
    }),
    numberField(GRANT_FIELD.timeElapsedPercent, 'timeElapsedPercent', 'Time elapsed', {
      description: 'How much of the grant period has passed. Calculated from the start and end dates.',
      percentage: true,
      icon: 'IconHourglass',
      system: true,
    }),
    numberField(GRANT_FIELD.percentSpent, 'percentSpent', 'Percent of award spent', {
      description: 'Spent so far divided by the award amount. Calculated.',
      percentage: true,
      icon: 'IconPercentage',
      system: true,
    }),
    selectField(GRANT_FIELD.pace, 'pace', 'Pace', GRANT_PACE_SEEDS, {
      defaultValue: 'NOT_ENOUGH_DATA',
      icon: 'IconGauge',
      system: true,
      description:
        'Compares KPI progress with time elapsed. More than 10 points behind is Slipping, more than 25 is Off pace. Only judged for active grants with dates and KPI targets.',
    }),
    textField(GRANT_FIELD.dataCheck, 'dataCheck', 'Data check', {
      description: 'Problems Compass found in this grant\'s numbers or dates. Calculated.',
      icon: 'IconAlertTriangle',
      system: true,
    }),
    textField(GRANT_FIELD.aiReportDraft, 'aiReportDraft', 'AI report draft', {
      description: 'A starting draft for the funder report, written by AI from this grant\'s records. Always check it before sending.',
      icon: 'IconSparkles',
      system: true,
    }),
    dateTimeField(GRANT_FIELD.aiReportGeneratedAt, 'aiReportGeneratedAt', 'AI report drafted at', {
      icon: 'IconSparkles',
      system: true,
    }),
  ],
});
