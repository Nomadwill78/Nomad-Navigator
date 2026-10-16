import { defineView, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, ViewFilterOperand, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { PERSON_FIELD, VIEW_ID } from 'src/constants/universal-identifiers';
import { columns, filterId, sortId } from 'src/views/view-helpers';

const VIEW_KEY = 'donorsToReach';

export default defineView({
  universalIdentifier: VIEW_ID.donorsToReach,
  name: 'Donors to reach out to',
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconPhoneCall',
  position: 1,
  fields: columns(VIEW_KEY, [
    [STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.fields.name.universalIdentifier, 220],
    [PERSON_FIELD.givingStatus, 150],
    [PERSON_FIELD.lastGiftDate, 130],
    [PERSON_FIELD.lastGiftAmount, 130],
    [PERSON_FIELD.lifetimeGiving, 140],
    [PERSON_FIELD.aiNextBestAction, 320],
    [PERSON_FIELD.outreachPermission, 180],
  ]),
  filters: [
    {
      universalIdentifier: filterId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: PERSON_FIELD.givingStatus,
      operand: ViewFilterOperand.IS,
      value: ['AT_RISK', 'LAPSED'],
    },
    {
      universalIdentifier: filterId(VIEW_KEY, 1),
      fieldMetadataUniversalIdentifier: PERSON_FIELD.outreachPermission,
      operand: ViewFilterOperand.IS_NOT,
      value: ['DO_NOT_CONTACT'],
    },
  ],
  sorts: [
    {
      universalIdentifier: sortId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: PERSON_FIELD.lifetimeGiving,
      direction: ViewSortDirection.DESC,
    },
  ],
});
