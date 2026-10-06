import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { textField } from 'src/objects/field-helpers';

export default defineField({
  ...textField(PERSON_FIELD.aiBasis, 'aiBasis', 'AI insight: based on', { icon: 'IconListCheck', system: true, description: 'Which facts the insight rests on, plus any figures that could not be matched to your records. Read this before relying on the insight.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
