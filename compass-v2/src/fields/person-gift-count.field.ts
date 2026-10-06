import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { numberField } from 'src/objects/field-helpers';

export default defineField({
  ...numberField(PERSON_FIELD.giftCount, 'giftCount', 'Number of gifts', { integer: true, icon: 'IconHash', system: true, description: 'How many received cash gifts they have given. Calculated.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
