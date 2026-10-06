import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { stableUuid } from 'src/constants/stable-uuid';
import { FOLDER_ID, VIEW_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: stableUuid('navigation:giftsToThank'),
  name: 'Gifts to thank',
  icon: 'IconMailHeart',
  position: 6,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: VIEW_ID.giftsToThank,
  folderUniversalIdentifier: FOLDER_ID.fundraising,
});
