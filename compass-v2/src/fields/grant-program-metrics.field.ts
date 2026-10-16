import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import {
  GRANT_FIELD,
  OBJECT_ID,
  PROGRAM_METRIC_FIELD,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: GRANT_FIELD.programMetrics,
  objectUniversalIdentifier: OBJECT_ID.grant,
  type: FieldType.RELATION,
  name: 'programMetrics',
  label: 'Program results',
  description: 'Monthly results reported against this grant.',
  icon: 'IconChartBar',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.programMetric,
  relationTargetFieldMetadataUniversalIdentifier: PROGRAM_METRIC_FIELD.grant,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
