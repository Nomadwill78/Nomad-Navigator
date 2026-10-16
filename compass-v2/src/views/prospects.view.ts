import { defineView, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, ViewFilterOperand, ViewType } from 'twenty-sdk/define';

import { PERSON_FIELD, VIEW_ID } from 'src/constants/universal-identifiers';
import { columns, filterId } from 'src/views/view-helpers';

const VIEW_KEY = 'prospects';

export default defineView({
  universalIdentifier: VIEW_ID.prospects,
  name: 'Prospects',
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconUserSearch',
  position: 2,
  fields: columns(VIEW_KEY, [
    [STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.fields.name.universalIdentifier, 220],
    [STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.fields.emails.universalIdentifier, 220],
    [PERSON_FIELD.capacityRating, 180],
    [PERSON_FIELD.outreachPermission, 180],
  ]),
  filters: [
    {
      universalIdentifier: filterId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: PERSON_FIELD.contactTypes,
      operand: ViewFilterOperand.CONTAINS,
      value: ['PROSPECT'],
    },
  ],
});
