import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { currencyField } from 'src/objects/field-helpers';

export default defineField({
  ...currencyField(PERSON_FIELD.aiSuggestedAsk, 'aiSuggestedAsk', 'AI insight: suggested ask', { icon: 'IconSparkles', system: true, description: 'Never more than five times their largest past gift, never set for people who asked for thank-yous only, and empty when there is no giving history.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
