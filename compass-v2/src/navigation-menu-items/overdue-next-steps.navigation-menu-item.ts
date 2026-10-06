import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { stableUuid } from 'src/constants/stable-uuid';
import { FOLDER_ID, VIEW_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: stableUuid('navigation:overdueSteps'),
  name: 'Overdue next steps',
  icon: 'IconAlarm',
  position: 4,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: VIEW_ID.overdueSteps,
  folderUniversalIdentifier: FOLDER_ID.fundraising,
});
