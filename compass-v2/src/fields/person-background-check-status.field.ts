import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { BACKGROUND_CHECK_SEEDS } from 'src/constants/enums';
import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { selectField } from 'src/objects/field-helpers';

export default defineField({
  ...selectField(PERSON_FIELD.backgroundCheckStatus, 'backgroundCheckStatus', 'Background check', BACKGROUND_CHECK_SEEDS, { icon: 'IconShieldLock', description: 'Needed for volunteers who work with children or other participants.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
