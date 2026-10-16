import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { stableUuid } from 'src/constants/stable-uuid';
import { FOLDER_ID, VIEW_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: stableUuid('navigation:kpisBehind'),
  name: 'KPIs that are behind',
  icon: 'IconTrendingDown',
  position: 5,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: VIEW_ID.kpisBehind,
  folderUniversalIdentifier: FOLDER_ID.grants,
});
