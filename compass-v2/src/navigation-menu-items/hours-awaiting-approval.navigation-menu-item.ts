import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { stableUuid } from 'src/constants/stable-uuid';
import { FOLDER_ID, VIEW_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: stableUuid('navigation:hoursAwaitingApproval'),
  name: 'Hours awaiting approval',
  icon: 'IconClockCheck',
  position: 1,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: VIEW_ID.hoursAwaitingApproval,
  folderUniversalIdentifier: FOLDER_ID.volunteers,
});
