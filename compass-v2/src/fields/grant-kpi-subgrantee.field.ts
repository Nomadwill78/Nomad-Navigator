import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import {
  GRANT_KPI_FIELD,
  OBJECT_ID,
  SUBGRANTEE_FIELD,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: GRANT_KPI_FIELD.subgrantee,
  objectUniversalIdentifier: OBJECT_ID.grantKpi,
  type: FieldType.RELATION,
  name: 'subgrantee',
  label: 'Subgrantee',
  description: 'Set when a subgrantee reports this KPI. Leave empty for a KPI your own organization reports.',
  icon: 'IconHierarchy2',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.subgrantee,
  relationTargetFieldMetadataUniversalIdentifier: SUBGRANTEE_FIELD.kpis,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'subgranteeId',
  },
});
