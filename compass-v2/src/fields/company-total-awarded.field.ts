import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { COMPANY_FIELD } from 'src/constants/universal-identifiers';
import { currencyField } from 'src/objects/field-helpers';

export default defineField({
  ...currencyField(COMPANY_FIELD.totalAwarded, 'totalAwarded', 'Total awarded in grants', { icon: 'IconAward', system: true, description: 'Sum of award amounts on this funder\'s grants that are awarded, active or completed. Calculated.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
});
