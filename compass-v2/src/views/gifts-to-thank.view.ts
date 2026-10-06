import { defineView, ViewFilterOperand, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { DONATION_FIELD, OBJECT_ID, VIEW_ID } from 'src/constants/universal-identifiers';
import { columns, filterId, sortId } from 'src/views/view-helpers';

const VIEW_KEY = 'giftsToThank';

export default defineView({
  universalIdentifier: VIEW_ID.giftsToThank,
  name: 'Gifts to thank',
  objectUniversalIdentifier: OBJECT_ID.donation,
  type: ViewType.TABLE,
  icon: 'IconMailHeart',
  position: 4,
  fields: columns(VIEW_KEY, [
    [DONATION_FIELD.name, 280],
    [DONATION_FIELD.amount, 130],
    [DONATION_FIELD.giftDate, 130],
    [DONATION_FIELD.donor, 200],
    [DONATION_FIELD.organizationDonor, 200],
    [DONATION_FIELD.giftType, 160],
  ]),
  filters: [
    {
      universalIdentifier: filterId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: DONATION_FIELD.acknowledged,
      operand: ViewFilterOperand.IS,
      value: 'false',
    },
    {
      universalIdentifier: filterId(VIEW_KEY, 1),
      fieldMetadataUniversalIdentifier: DONATION_FIELD.status,
      operand: ViewFilterOperand.IS,
      value: ['RECEIVED'],
    },
  ],
  sorts: [
    {
      universalIdentifier: sortId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: DONATION_FIELD.giftDate,
      direction: ViewSortDirection.DESC,
    },
  ],
});
