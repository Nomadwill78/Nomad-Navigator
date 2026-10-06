import { defineCommandMenuItem } from 'twenty-sdk/define';

import { COMMAND_ID, FRONT_COMPONENT_ID, OBJECT_ID } from 'src/constants/universal-identifiers';

export default defineCommandMenuItem({
  universalIdentifier: COMMAND_ID.grantReport,
  label: 'Draft funder report',
  shortLabel: 'Draft report',
  isPinned: true,
  availabilityType: 'GLOBAL_OBJECT_CONTEXT',
  availabilityObjectUniversalIdentifier: OBJECT_ID.grant,
  frontComponentUniversalIdentifier: FRONT_COMPONENT_ID.grantReport,
});
