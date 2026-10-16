import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import {
  GRANT_KPI_FIELD,
  OBJECT_ID,
  SUBGRANTEE_FIELD,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: SUBGRANTEE_FIELD.kpis,
  objectUniversalIdentifier: OBJECT_ID.subgrantee,
  type: FieldType.RELATION,
  name: 'kpis',
  label: 'KPIs',
  description: 'KPIs this subgrantee reports.',
  icon: 'IconTarget',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.grantKpi,
  relationTargetFieldMetadataUniversalIdentifier: GRANT_KPI_FIELD.subgrantee,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
