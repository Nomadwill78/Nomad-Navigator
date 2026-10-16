import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { COMPANY_FIELD } from 'src/constants/universal-identifiers';
import { currencyField } from 'src/objects/field-helpers';

export default defineField({
  ...currencyField(COMPANY_FIELD.totalGiven, 'totalGiven', 'Total given', { icon: 'IconCoins', system: true, description: 'Total of received cash donations from this organization, including payments on its grants. Calculated.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
});
