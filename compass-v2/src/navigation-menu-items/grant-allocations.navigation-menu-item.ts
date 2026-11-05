import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { stableUuid } from 'src/constants/stable-uuid';
import { OBJECT_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: stableUuid('navigation:grant-allocations'),
  name: 'Grant allocations',
  icon: 'IconHierarchy2',
  position: 41,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: OBJECT_ID.grantAllocation,
});
