import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { textField } from 'src/objects/field-helpers';

export default defineField({
  ...textField(PERSON_FIELD.aiNextBestAction, 'aiNextBestAction', 'AI insight: suggested next step', { icon: 'IconSparkles', system: true, description: 'What the AI suggests you do next. It is a suggestion, not an instruction.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
