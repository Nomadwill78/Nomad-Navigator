import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { stableUuid } from 'src/constants/stable-uuid';
import { FOLDER_ID, OBJECT_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: stableUuid('navigation:kpis'),
  name: 'All KPIs',
  icon: 'IconTarget',
  position: 4,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: OBJECT_ID.grantKpi,
  folderUniversalIdentifier: FOLDER_ID.grants,
});
