import { defineView, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, ViewFilterOperand, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { PERSON_FIELD, VIEW_ID } from 'src/constants/universal-identifiers';
import { columns, filterId, sortId } from 'src/views/view-helpers';

const VIEW_KEY = 'donors';

export default defineView({
  universalIdentifier: VIEW_ID.donors,
  name: 'Donors',
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconHeartHandshake',
  position: 0,
  fields: columns(VIEW_KEY, [
    [STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.fields.name.universalIdentifier, 220],
    [PERSON_FIELD.givingStatus, 150],
    [PERSON_FIELD.lifetimeGiving, 140],
    [PERSON_FIELD.lastGiftDate, 130],
    [PERSON_FIELD.lastGiftAmount, 130],
    [PERSON_FIELD.giftCount, 110],
    [PERSON_FIELD.outreachPermission, 180],
  ]),
  filters: [
    {
      universalIdentifier: filterId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: PERSON_FIELD.contactTypes,
      operand: ViewFilterOperand.CONTAINS,
      value: ['DONOR'],
    },
  ],
  sorts: [
    {
      universalIdentifier: sortId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: PERSON_FIELD.lastGiftDate,
      direction: ViewSortDirection.DESC,
    },
  ],
});
