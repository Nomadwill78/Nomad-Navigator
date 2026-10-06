import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { RISK_SEEDS } from 'src/constants/enums';
import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { selectField } from 'src/objects/field-helpers';

export default defineField({
  ...selectField(PERSON_FIELD.aiRetentionRisk, 'aiRetentionRisk', 'AI insight: chance they stop giving', RISK_SEEDS, { icon: 'IconSparkles', system: true, description: 'The AI\'s read on whether this donor may stop giving.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
