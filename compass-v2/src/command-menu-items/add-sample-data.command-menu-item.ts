import { defineCommandMenuItem } from 'twenty-sdk/define';

import { COMMAND_ID, FRONT_COMPONENT_ID } from 'src/constants/universal-identifiers';

export default defineCommandMenuItem({
  universalIdentifier: COMMAND_ID.addSampleData,
  label: 'Add sample data',
  availabilityType: 'GLOBAL',
  frontComponentUniversalIdentifier: FRONT_COMPONENT_ID.addSampleData,
});
