import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { dateTimeField } from 'src/objects/field-helpers';

export default defineField({
  ...dateTimeField(PERSON_FIELD.aiGeneratedAt, 'aiGeneratedAt', 'AI insight: generated at', { icon: 'IconSparkles', system: true, description: 'When the insight was last written.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
