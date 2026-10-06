import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { dateField } from 'src/objects/field-helpers';

export default defineField({
  ...dateField(PERSON_FIELD.firstGiftDate, 'firstGiftDate', 'First gift date', { system: true, description: 'Date of their earliest received gift. Calculated.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
