import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  OBJECT_ID,
  PERSON_FIELD,
  PLAN_FIELD,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PLAN_FIELD.donor,
  objectUniversalIdentifier: OBJECT_ID.cultivationPlan,
  type: FieldType.RELATION,
  name: 'donor',
  label: 'Donor or prospect',
  description: 'The person this plan is about.',
  icon: 'IconUser',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: PERSON_FIELD.cultivationPlans,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'donorId',
  },
});
