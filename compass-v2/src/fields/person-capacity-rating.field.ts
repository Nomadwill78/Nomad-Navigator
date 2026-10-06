import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { CAPACITY_SEEDS } from 'src/constants/enums';
import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { selectField } from 'src/objects/field-helpers';

export default defineField({
  ...selectField(PERSON_FIELD.capacityRating, 'capacityRating', 'Giving capacity (your estimate)', CAPACITY_SEEDS, { icon: 'IconScale', description: 'Your team\'s own estimate of what this person could give, from what they have told you or from their giving here. Do not guess from age, ethnicity, neighborhood or other personal traits.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
