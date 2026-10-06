import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { dateField } from 'src/objects/field-helpers';

export default defineField({
  ...dateField(PERSON_FIELD.volunteerSince, 'volunteerSince', 'Volunteer since', { description: 'The date they started volunteering.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
