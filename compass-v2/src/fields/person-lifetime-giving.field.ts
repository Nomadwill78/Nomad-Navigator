import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { currencyField } from 'src/objects/field-helpers';

export default defineField({
  ...currencyField(PERSON_FIELD.lifetimeGiving, 'lifetimeGiving', 'Lifetime giving', { icon: 'IconCoins', system: true, description: 'Total of their received cash gifts. Pledges, in-kind gifts and written-off gifts are not counted. Calculated.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
