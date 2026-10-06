import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { FOLDER_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: FOLDER_ID.fundraising,
  name: 'Fundraising',
  icon: 'IconHeartHandshake',
  position: 1,
  type: NavigationMenuItemType.FOLDER,
});
