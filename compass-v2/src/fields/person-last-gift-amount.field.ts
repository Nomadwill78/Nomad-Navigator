import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { currencyField } from 'src/objects/field-helpers';

export default defineField({
  ...currencyField(PERSON_FIELD.lastGiftAmount, 'lastGiftAmount', 'Last gift amount', { system: true, description: 'Amount of their most recent received gift. Calculated.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
