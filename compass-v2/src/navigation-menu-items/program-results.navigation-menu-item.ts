import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { stableUuid } from 'src/constants/stable-uuid';
import { FOLDER_ID, OBJECT_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: stableUuid('navigation:programResults'),
  name: 'Program results',
  icon: 'IconChartBar',
  position: 6,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: OBJECT_ID.programMetric,
  folderUniversalIdentifier: FOLDER_ID.grants,
});
