import {
  AggregateOperations,
  definePageLayout,
  ObjectRecordGroupByDateGranularity,
  PageLayoutTabLayoutMode,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { stableUuid } from 'src/constants/stable-uuid';
import {
  DONATION_FIELD,
  GRANT_FIELD,
  OBJECT_ID,
  PAGE_LAYOUT_ID,
  PERSON_FIELD,
  PLAN_FIELD,
  VIEW_ID,
} from 'src/constants/universal-identifiers';

// The home page: the few numbers a director checks first, then the lists that
// say who to call and what is due. Every figure is a live count or sum of real
// records, never an estimate.

const PERSON = STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person;

const grid = (row: number, column: number, rowSpan: number, columnSpan: number) => ({
  layoutMode: PageLayoutTabLayoutMode.GRID as const,
  row,
  column,
  rowSpan,
  columnSpan,
});

const widgetId = (name: string) => stableUuid(`page-layout:home:widget:${name}`);

const COMMON = { timezone: 'UTC', firstDayOfTheWeek: 1 } as const;

const BAR = {
  layout: 'VERTICAL',
  primaryAxisOrderBy: 'FIELD_ASC',
  axisNameDisplay: 'NONE',
  color: 'auto',
  ...COMMON,
} as const;

const only = (fieldMetadataUniversalIdentifier: string, operand: 'IS' | 'IS_NOT' | 'CONTAINS', values: string[]) => ({
  fieldMetadataUniversalIdentifier,
  operand,
  value: JSON.stringify(values),
});

export default definePageLayout({
  universalIdentifier: PAGE_LAYOUT_ID.home,
  name: 'Compass home',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: stableUuid('page-layout:home:tab:overview'),
      title: 'Overview',
      position: 0,
      icon: 'IconCompass',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        {
          universalIdentifier: widgetId('cash-received'),
          title: 'Cash received (all time)',
          type: 'GRAPH',
          objectUniversalIdentifier: OBJECT_ID.donation,
          position: grid(0, 0, 2, 3),
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier: DONATION_FIELD.amount,
            aggregateOperation: AggregateOperations.SUM,
            displayDataLabel: true,
            ...COMMON,
            filter: {
              recordFilters: [
                only(DONATION_FIELD.status, 'IS', ['RECEIVED']),
                only(DONATION_FIELD.giftType, 'IS_NOT', ['IN_KIND']),
              ],
            },
          },
        },
        {
          universalIdentifier: widgetId('active-grants-awarded'),
          title: 'Active grants (amount awarded)',
          type: 'GRAPH',
          objectUniversalIdentifier: OBJECT_ID.grant,
          position: grid(0, 3, 2, 3),
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier: GRANT_FIELD.awardAmount,
            aggregateOperation: AggregateOperations.SUM,
            displayDataLabel: true,
            ...COMMON,
            filter: { recordFilters: [only(GRANT_FIELD.status, 'IS', ['ACTIVE'])] },
          },
        },
        {
          universalIdentifier: widgetId('donors-at-risk'),
          title: 'Donors at risk of lapsing',
          type: 'GRAPH',
          objectUniversalIdentifier: PERSON.universalIdentifier,
          position: grid(0, 6, 2, 3),
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier: PERSON.fields.name.universalIdentifier,
            aggregateOperation: AggregateOperations.COUNT,
            displayDataLabel: true,
            ...COMMON,
            filter: { recordFilters: [only(PERSON_FIELD.givingStatus, 'IS', ['AT_RISK'])] },
          },
        },
        {
          universalIdentifier: widgetId('pipeline-forecast'),
          title: 'Cultivation forecast (ask x likelihood)',
          type: 'GRAPH',
          objectUniversalIdentifier: OBJECT_ID.cultivationPlan,
          position: grid(0, 9, 2, 3),
          configuration: {
            configurationType: 'AGGREGATE_CHART',
            aggregateFieldMetadataUniversalIdentifier: PLAN_FIELD.weightedAmount,
            aggregateOperation: AggregateOperations.SUM,
            displayDataLabel: true,
            ...COMMON,
          },
        },
        {
          universalIdentifier: widgetId('donors-by-status'),
          title: 'Donors by giving status',
          type: 'GRAPH',
          objectUniversalIdentifier: PERSON.universalIdentifier,
          position: grid(2, 0, 5, 6),
          configuration: {
            configurationType: 'PIE_CHART',
            aggregateFieldMetadataUniversalIdentifier: PERSON.fields.name.universalIdentifier,
            aggregateOperation: AggregateOperations.COUNT,
            groupByFieldMetadataUniversalIdentifier: PERSON_FIELD.givingStatus,
            displayLegend: true,
            ...COMMON,
            filter: { recordFilters: [only(PERSON_FIELD.contactTypes, 'CONTAINS', ['DONOR'])] },
          },
        },
        {
          universalIdentifier: widgetId('gifts-by-month'),
          title: 'Cash gifts by month',
          type: 'GRAPH',
          objectUniversalIdentifier: OBJECT_ID.donation,
          position: grid(2, 6, 5, 6),
          configuration: {
            configurationType: 'BAR_CHART',
            aggregateFieldMetadataUniversalIdentifier: DONATION_FIELD.amount,
            aggregateOperation: AggregateOperations.SUM,
            primaryAxisGroupByFieldMetadataUniversalIdentifier: DONATION_FIELD.giftDate,
            primaryAxisDateGranularity: ObjectRecordGroupByDateGranularity.MONTH,
            ...BAR,
            filter: {
              recordFilters: [
                only(DONATION_FIELD.status, 'IS', ['RECEIVED']),
                only(DONATION_FIELD.giftType, 'IS_NOT', ['IN_KIND']),
              ],
            },
          },
        },
        {
          universalIdentifier: widgetId('grants-by-pace'),
          title: 'Active grants by pace',
          type: 'GRAPH',
          objectUniversalIdentifier: OBJECT_ID.grant,
          position: grid(7, 0, 5, 6),
          configuration: {
            configurationType: 'PIE_CHART',
            aggregateFieldMetadataUniversalIdentifier: GRANT_FIELD.name,
            aggregateOperation: AggregateOperations.COUNT,
            groupByFieldMetadataUniversalIdentifier: GRANT_FIELD.pace,
            displayLegend: true,
            ...COMMON,
            filter: { recordFilters: [only(GRANT_FIELD.status, 'IS', ['ACTIVE'])] },
          },
        },
        {
          universalIdentifier: widgetId('reports-due'),
          title: 'Active grants, next report due first',
          type: 'RECORD_TABLE',
          position: grid(7, 6, 5, 6),
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: VIEW_ID.activeGrants,
            recordLimit: 6,
            isUIEditable: false,
          },
        },
        {
          universalIdentifier: widgetId('donors-to-reach'),
          title: 'Donors to reach out to',
          type: 'RECORD_TABLE',
          position: grid(12, 0, 6, 6),
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: VIEW_ID.donorsToReach,
            recordLimit: 6,
            isUIEditable: false,
          },
        },
        {
          universalIdentifier: widgetId('overdue-steps'),
          title: 'Overdue next steps',
          type: 'RECORD_TABLE',
          position: grid(12, 6, 6, 6),
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: VIEW_ID.overdueSteps,
            recordLimit: 6,
            isUIEditable: false,
          },
        },
      ],
    },
  ],
});
