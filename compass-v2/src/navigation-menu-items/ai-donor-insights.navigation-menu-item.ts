import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { stableUuid } from 'src/constants/stable-uuid';
import { FOLDER_ID, VIEW_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: stableUuid('navigation:aiInsights'),
  name: 'AI donor insights',
  icon: 'IconSparkles',
  position: 10,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: VIEW_ID.aiInsights,
  folderUniversalIdentifier: FOLDER_ID.fundraising,
});
