import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import {
  GRANT_FIELD,
  OBJECT_ID,
  PROGRAM_METRIC_FIELD,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PROGRAM_METRIC_FIELD.grant,
  objectUniversalIdentifier: OBJECT_ID.programMetric,
  type: FieldType.RELATION,
  name: 'grant',
  label: 'Grant',
  description: 'The grant these results are reported against, if any.',
  icon: 'IconAward',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.grant,
  relationTargetFieldMetadataUniversalIdentifier: GRANT_FIELD.programMetrics,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'grantId',
  },
});
