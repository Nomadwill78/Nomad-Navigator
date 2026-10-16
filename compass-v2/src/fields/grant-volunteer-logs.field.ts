import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import {
  GRANT_FIELD,
  OBJECT_ID,
  VOLUNTEER_LOG_FIELD,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: GRANT_FIELD.volunteerLogs,
  objectUniversalIdentifier: OBJECT_ID.grant,
  type: FieldType.RELATION,
  name: 'volunteerLogs',
  label: 'Volunteer hours',
  description: 'Volunteer hours counted toward this grant.',
  icon: 'IconClockHour4',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.volunteerLog,
  relationTargetFieldMetadataUniversalIdentifier: VOLUNTEER_LOG_FIELD.grant,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
