import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { stableUuid } from 'src/constants/stable-uuid';
import { FOLDER_ID, VIEW_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: stableUuid('navigation:grantsNeedingAttention'),
  name: 'Grants needing attention',
  icon: 'IconAlertTriangle',
  position: 2,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: VIEW_ID.grantsNeedingAttention,
  folderUniversalIdentifier: FOLDER_ID.grants,
});
