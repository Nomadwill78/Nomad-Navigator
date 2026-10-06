import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  OBJECT_ID,
  PERSON_FIELD,
  PLAN_FIELD,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_FIELD.cultivationPlans,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.RELATION,
  name: 'cultivationPlans',
  label: 'Cultivation plans',
  description: 'Plans to build this relationship.',
  icon: 'IconSeeding',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.cultivationPlan,
  relationTargetFieldMetadataUniversalIdentifier: PLAN_FIELD.donor,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
