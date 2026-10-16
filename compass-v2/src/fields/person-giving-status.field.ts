import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { GIVING_STATUS_SEEDS } from 'src/constants/enums';
import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { selectField } from 'src/objects/field-helpers';

export default defineField({
  ...selectField(PERSON_FIELD.givingStatus, 'givingStatus', 'Giving status', GIVING_STATUS_SEEDS, { icon: 'IconHeartHandshake', system: true, description: 'Calculated from their last gift: Active under 9 months, At risk 9 to 12 months, Lapsed 13 months or more, Inactive 25 months or more. New means their first gift was in the last year.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
