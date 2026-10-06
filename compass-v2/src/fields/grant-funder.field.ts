import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  COMPANY_FIELD,
  GRANT_FIELD,
  OBJECT_ID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: GRANT_FIELD.funder,
  objectUniversalIdentifier: OBJECT_ID.grant,
  type: FieldType.RELATION,
  name: 'funder',
  label: 'Funder',
  description: 'The organization that funds this grant.',
  icon: 'IconBuildingSkyscraper',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: COMPANY_FIELD.grants,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'funderId',
  },
});
