import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { FOLDER_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: FOLDER_ID.grants,
  name: 'Grants and impact',
  icon: 'IconAward',
  position: 2,
  type: NavigationMenuItemType.FOLDER,
});
