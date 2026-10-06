import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { stableUuid } from 'src/constants/stable-uuid';
import { FOLDER_ID, VIEW_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: stableUuid('navigation:cultivationPipeline'),
  name: 'Cultivation pipeline',
  icon: 'IconLayoutKanban',
  position: 3,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: VIEW_ID.cultivationPipeline,
  folderUniversalIdentifier: FOLDER_ID.fundraising,
});
