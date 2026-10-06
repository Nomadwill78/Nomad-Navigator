import { defineObject } from 'twenty-sdk/define';

import { VOLUNTEER_LOG_STATUS_SEEDS } from 'src/constants/enums';
import { OBJECT_ID, VOLUNTEER_LOG_FIELD } from 'src/constants/universal-identifiers';
import { dateField, nameField, numberField, selectField, textField } from 'src/objects/field-helpers';

export default defineObject({
  universalIdentifier: OBJECT_ID.volunteerLog,
  nameSingular: 'volunteerLog',
  namePlural: 'volunteerLogs',
  labelSingular: 'Volunteer hours',
  labelPlural: 'Volunteer hours',
  description: 'A block of hours a volunteer gave. Only approved hours count toward their total.',
  icon: 'IconClockHour4',
  labelIdentifierFieldMetadataUniversalIdentifier: VOLUNTEER_LOG_FIELD.name,
  fields: [
    nameField(VOLUNTEER_LOG_FIELD.name, 'Shift', 'A short label. Compass fills this in if you leave it empty.'),
    dateField(VOLUNTEER_LOG_FIELD.activityDate, 'activityDate', 'Date', { icon: 'IconCalendarEvent' }),
    numberField(VOLUNTEER_LOG_FIELD.hours, 'hours', 'Hours', {
      decimals: 2,
      icon: 'IconClockHour4',
      description: 'Hours given, for example 2.5.',
    }),
    textField(VOLUNTEER_LOG_FIELD.activity, 'activity', 'What they did'),
    selectField(VOLUNTEER_LOG_FIELD.status, 'status', 'Status', VOLUNTEER_LOG_STATUS_SEEDS, {
      defaultValue: 'LOGGED',
      description: 'A coordinator marks hours Approved after confirming them. Only approved hours are reported.',
    }),
  ],
});
