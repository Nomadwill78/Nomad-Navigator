import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import {
  GRANT_FIELD,
  GRANT_KPI_FIELD,
  OBJECT_ID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: GRANT_FIELD.kpis,
  objectUniversalIdentifier: OBJECT_ID.grant,
  type: FieldType.RELATION,
  name: 'kpis',
  label: 'KPIs',
  description: 'Results this grant is expected to deliver.',
  icon: 'IconTarget',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.grantKpi,
  relationTargetFieldMetadataUniversalIdentifier: GRANT_KPI_FIELD.grant,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
