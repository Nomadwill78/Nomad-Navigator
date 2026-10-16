import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  COMPANY_FIELD,
  OBJECT_ID,
  PLAN_FIELD,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PLAN_FIELD.organization,
  objectUniversalIdentifier: OBJECT_ID.cultivationPlan,
  type: FieldType.RELATION,
  name: 'organization',
  label: 'Organization',
  description: 'Use when the prospect is an organization, such as a corporate sponsor.',
  icon: 'IconBuildingSkyscraper',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: COMPANY_FIELD.cultivationPlans,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'organizationId',
  },
});
