import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { currencyField } from 'src/objects/field-helpers';

export default defineField({
  ...currencyField(PERSON_FIELD.largestGift, 'largestGift', 'Largest gift', { icon: 'IconTrophy', system: true, description: 'Their biggest received cash gift. Calculated.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
