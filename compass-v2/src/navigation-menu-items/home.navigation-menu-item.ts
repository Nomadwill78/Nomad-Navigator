import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { stableUuid } from 'src/constants/stable-uuid';
import { PAGE_LAYOUT_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: stableUuid('navigation:home'),
  name: 'Compass home',
  icon: 'IconCompass',
  position: 0,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier: PAGE_LAYOUT_ID.home,
});
