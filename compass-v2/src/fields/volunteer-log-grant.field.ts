import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import {
  GRANT_FIELD,
  OBJECT_ID,
  VOLUNTEER_LOG_FIELD,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: VOLUNTEER_LOG_FIELD.grant,
  objectUniversalIdentifier: OBJECT_ID.volunteerLog,
  type: FieldType.RELATION,
  name: 'grant',
  label: 'Grant',
  description: 'Link hours to a grant when they count as in-kind match or are reported to the funder.',
  icon: 'IconAward',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.grant,
  relationTargetFieldMetadataUniversalIdentifier: GRANT_FIELD.volunteerLogs,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'grantId',
  },
});
