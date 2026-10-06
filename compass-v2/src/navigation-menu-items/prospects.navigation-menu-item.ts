import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { stableUuid } from 'src/constants/stable-uuid';
import { FOLDER_ID, VIEW_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: stableUuid('navigation:prospects'),
  name: 'Prospects',
  icon: 'IconUserSearch',
  position: 2,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: VIEW_ID.prospects,
  folderUniversalIdentifier: FOLDER_ID.fundraising,
});
