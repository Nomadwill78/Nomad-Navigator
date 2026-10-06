import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { FOLDER_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: FOLDER_ID.volunteers,
  name: 'Volunteers',
  icon: 'IconHandStop',
  position: 3,
  type: NavigationMenuItemType.FOLDER,
});
