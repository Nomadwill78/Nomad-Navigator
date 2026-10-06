import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  OBJECT_ID,
  PLAN_FIELD,
  WORKSPACE_MEMBER_FIELD,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: WORKSPACE_MEMBER_FIELD.ownedCultivationPlans,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  type: FieldType.RELATION,
  name: 'ownedCultivationPlans',
  label: 'Cultivation plans owned',
  description: 'Relationships this team member is responsible for.',
  icon: 'IconSeeding',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.cultivationPlan,
  relationTargetFieldMetadataUniversalIdentifier: PLAN_FIELD.owner,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
