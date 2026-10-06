import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  COMPANY_FIELD,
  GRANT_FIELD,
  OBJECT_ID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: COMPANY_FIELD.grants,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'grants',
  label: 'Grants',
  description: 'Grants this organization has funded or been asked to fund.',
  icon: 'IconAward',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.grant,
  relationTargetFieldMetadataUniversalIdentifier: GRANT_FIELD.funder,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
