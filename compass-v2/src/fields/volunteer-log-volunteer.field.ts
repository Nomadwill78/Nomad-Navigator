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
  VOLUNTEER_LOG_FIELD,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: VOLUNTEER_LOG_FIELD.volunteer,
  objectUniversalIdentifier: OBJECT_ID.volunteerLog,
  type: FieldType.RELATION,
  name: 'volunteer',
  label: 'Volunteer',
  description: 'The person who gave the hours.',
  icon: 'IconUser',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: PERSON_FIELD.volunteerLogs,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'volunteerId',
  },
});
