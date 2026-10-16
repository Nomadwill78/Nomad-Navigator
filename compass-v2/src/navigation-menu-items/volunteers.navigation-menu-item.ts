import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { stableUuid } from 'src/constants/stable-uuid';
import { FOLDER_ID, VIEW_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: stableUuid('navigation:volunteers'),
  name: 'Volunteers',
  icon: 'IconHandStop',
  position: 0,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: VIEW_ID.volunteers,
  folderUniversalIdentifier: FOLDER_ID.volunteers,
});
