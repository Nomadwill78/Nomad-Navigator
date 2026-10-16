import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { dateField } from 'src/objects/field-helpers';

export default defineField({
  ...dateField(PERSON_FIELD.lastVolunteeredOn, 'lastVolunteeredOn', 'Last volunteered on', { system: true, description: 'Date of their most recent volunteer shift. Calculated.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
