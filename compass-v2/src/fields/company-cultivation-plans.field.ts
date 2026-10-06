import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  COMPANY_FIELD,
  OBJECT_ID,
  PLAN_FIELD,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: COMPANY_FIELD.cultivationPlans,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'cultivationPlans',
  label: 'Cultivation plans',
  description: 'Plans to build this relationship.',
  icon: 'IconSeeding',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.cultivationPlan,
  relationTargetFieldMetadataUniversalIdentifier: PLAN_FIELD.organization,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
