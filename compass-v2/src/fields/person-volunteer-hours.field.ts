import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { numberField } from 'src/objects/field-helpers';

export default defineField({
  ...numberField(PERSON_FIELD.volunteerHours, 'volunteerHours', 'Approved volunteer hours', { decimals: 2, icon: 'IconClockHour4', system: true, description: 'Total of their approved volunteer hours. Hours still waiting for approval are not counted. Calculated.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
