import { defineView, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, ViewFilterOperand, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { PERSON_FIELD, VIEW_ID } from 'src/constants/universal-identifiers';
import { columns, filterId, sortId } from 'src/views/view-helpers';

const VIEW_KEY = 'volunteers';

export default defineView({
  universalIdentifier: VIEW_ID.volunteers,
  name: 'Volunteers',
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconHandStop',
  position: 12,
  fields: columns(VIEW_KEY, [
    [STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.fields.name.universalIdentifier, 220],
    [PERSON_FIELD.volunteerStatus, 140],
    [PERSON_FIELD.volunteerHours, 140],
    [PERSON_FIELD.lastVolunteeredOn, 150],
    [PERSON_FIELD.volunteerSkills, 220],
    [PERSON_FIELD.backgroundCheckStatus, 150],
    [PERSON_FIELD.backgroundCheckExpires, 170],
  ]),
  filters: [
    {
      universalIdentifier: filterId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: PERSON_FIELD.contactTypes,
      operand: ViewFilterOperand.CONTAINS,
      value: ['VOLUNTEER'],
    },
  ],
  sorts: [
    {
      universalIdentifier: sortId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: PERSON_FIELD.lastVolunteeredOn,
      direction: ViewSortDirection.DESC,
    },
  ],
});
