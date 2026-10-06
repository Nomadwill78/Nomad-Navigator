import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { dateField } from 'src/objects/field-helpers';

export default defineField({
  ...dateField(PERSON_FIELD.backgroundCheckExpires, 'backgroundCheckExpires', 'Background check expires', { icon: 'IconCalendarDue', description: 'You get a reminder task 30 days before this date.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
