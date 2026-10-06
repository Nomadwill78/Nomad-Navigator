import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  OBJECT_ID,
  PERSON_FIELD,
  VOLUNTEER_LOG_FIELD,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_FIELD.volunteerLogs,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.RELATION,
  name: 'volunteerLogs',
  label: 'Volunteer hours',
  description: 'Hours this person has given.',
  icon: 'IconClockHour4',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_ID.volunteerLog,
  relationTargetFieldMetadataUniversalIdentifier: VOLUNTEER_LOG_FIELD.volunteer,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
