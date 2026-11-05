import { defineObject } from 'twenty-sdk/define';

import { GRANT_ALLOCATION_FIELD, OBJECT_ID } from 'src/constants/universal-identifiers';
import { currencyField, nameField } from 'src/objects/field-helpers';

export default defineObject({
  universalIdentifier: OBJECT_ID.grantAllocation,
  nameSingular: 'grantAllocation',
  namePlural: 'grantAllocations',
  labelSingular: 'Grant allocation',
  labelPlural: 'Grant allocations',
  description: 'An amount allocated from a program budget to a specific grant.',
  icon: 'IconHierarchy2',
  labelIdentifierFieldMetadataUniversalIdentifier: GRANT_ALLOCATION_FIELD.name,
  fields: [
    nameField(GRANT_ALLOCATION_FIELD.name, 'Allocation name'),
    currencyField(GRANT_ALLOCATION_FIELD.allocatedAmount, 'allocatedAmount', 'Allocated amount', { required: true }),
  ],
});
