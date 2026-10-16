import { defineObject } from 'twenty-sdk/define';

import { SUBGRANTEE_STATUS_SEEDS } from 'src/constants/enums';
import { OBJECT_ID, SUBGRANTEE_FIELD } from 'src/constants/universal-identifiers';
import { currencyField, nameField, selectField } from 'src/objects/field-helpers';

export default defineObject({
  universalIdentifier: OBJECT_ID.subgrantee,
  nameSingular: 'subgrantee',
  namePlural: 'subgrantees',
  labelSingular: 'Subgrantee',
  labelPlural: 'Subgrantees',
  description: 'A partner organization that receives part of a grant and reports its own KPIs back up to you.',
  icon: 'IconHierarchy2',
  labelIdentifierFieldMetadataUniversalIdentifier: SUBGRANTEE_FIELD.name,
  fields: [
    nameField(SUBGRANTEE_FIELD.name, 'Subgrantee', "The partner organization's name."),
    selectField(SUBGRANTEE_FIELD.status, 'status', 'Status', SUBGRANTEE_STATUS_SEEDS, {
      defaultValue: 'PENDING',
    }),
    currencyField(SUBGRANTEE_FIELD.allocatedAmount, 'allocatedAmount', 'Allocated amount', {
      description: 'How much of the grant is passed through to this partner.',
    }),
  ],
});
