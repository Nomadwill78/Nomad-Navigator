import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import {
  GRANT_FIELD,
  GRANT_KPI_FIELD,
  OBJECT_ID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: GRANT_KPI_FIELD.grant,
  objectUniversalIdentifier: OBJECT_ID.grantKpi,
  type: FieldType.RELATION,
  name: 'grant',
  label: 'Grant',
  description: 'The grant this KPI belongs to.',
  icon: 'IconAward',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.grant,
  relationTargetFieldMetadataUniversalIdentifier: GRANT_FIELD.kpis,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'grantId',
  },
});
