import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { COMPANY_FIELD } from 'src/constants/universal-identifiers';
import { numberField } from 'src/objects/field-helpers';

export default defineField({
  ...numberField(COMPANY_FIELD.activeGrantCount, 'activeGrantCount', 'Active grants', { integer: true, icon: 'IconAward', system: true, description: 'How many of this funder\'s grants are active right now. Calculated.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
});
