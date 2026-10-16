import { defineView, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, ViewFilterOperand, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { PERSON_FIELD, VIEW_ID } from 'src/constants/universal-identifiers';
import { columns, filterId, sortId } from 'src/views/view-helpers';

const VIEW_KEY = 'aiInsights';

export default defineView({
  universalIdentifier: VIEW_ID.aiInsights,
  name: 'AI donor insights',
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconSparkles',
  position: 3,
  fields: columns(VIEW_KEY, [
    [STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.fields.name.universalIdentifier, 200],
    [PERSON_FIELD.aiRetentionRisk, 130],
    [PERSON_FIELD.aiSummary, 320],
    [PERSON_FIELD.aiNextBestAction, 320],
    [PERSON_FIELD.aiSuggestedAsk, 140],
    [PERSON_FIELD.aiGeneratedAt, 170],
  ]),
  filters: [
    {
      universalIdentifier: filterId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: PERSON_FIELD.aiGeneratedAt,
      operand: ViewFilterOperand.IS_NOT_EMPTY,
      value: '',
    },
  ],
  sorts: [
    {
      universalIdentifier: sortId(VIEW_KEY, 0),
      fieldMetadataUniversalIdentifier: PERSON_FIELD.aiGeneratedAt,
      direction: ViewSortDirection.DESC,
    },
  ],
});
