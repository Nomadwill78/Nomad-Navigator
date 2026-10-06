import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { ORGANIZATION_TYPE_SEEDS } from 'src/constants/enums';
import { COMPANY_FIELD } from 'src/constants/universal-identifiers';
import { multiSelectField } from 'src/objects/field-helpers';

export default defineField({
  ...multiSelectField(COMPANY_FIELD.organizationTypes, 'organizationTypes', 'Organization types', ORGANIZATION_TYPE_SEEDS, { icon: 'IconTags', description: 'What kind of organization this is, for example Foundation or Corporate funder.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
});
