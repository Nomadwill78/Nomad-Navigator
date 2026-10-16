import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  OBJECT_ID,
  PLAN_FIELD,
  WORKSPACE_MEMBER_FIELD,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PLAN_FIELD.owner,
  objectUniversalIdentifier: OBJECT_ID.cultivationPlan,
  type: FieldType.RELATION,
  name: 'owner',
  label: 'Relationship manager',
  description: 'The team member who owns this relationship.',
  icon: 'IconUserCheck',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: WORKSPACE_MEMBER_FIELD.ownedCultivationPlans,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'ownerId',
  },
});
