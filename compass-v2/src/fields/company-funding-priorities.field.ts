import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { COMPANY_FIELD } from 'src/constants/universal-identifiers';
import { textField } from 'src/objects/field-helpers';

export default defineField({
  ...textField(COMPANY_FIELD.fundingPriorities, 'fundingPriorities', 'Funding priorities', { icon: 'IconTargetArrow', description: 'What this funder says it supports. Copy the key lines from their guidelines.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
});
