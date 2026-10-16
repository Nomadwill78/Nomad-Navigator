import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { stableUuid } from 'src/constants/stable-uuid';
import { FOLDER_ID, VIEW_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: stableUuid('navigation:grantPipeline'),
  name: 'Grant pipeline',
  icon: 'IconLayoutKanban',
  position: 0,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: VIEW_ID.grantPipeline,
  folderUniversalIdentifier: FOLDER_ID.grants,
});
