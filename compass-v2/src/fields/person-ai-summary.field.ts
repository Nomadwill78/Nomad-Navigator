import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { textField } from 'src/objects/field-helpers';

export default defineField({
  ...textField(PERSON_FIELD.aiSummary, 'aiSummary', 'AI insight: summary', { icon: 'IconSparkles', system: true, description: 'A short read on this person\'s giving and relationship, written by AI from the records in Compass. Always check it.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
