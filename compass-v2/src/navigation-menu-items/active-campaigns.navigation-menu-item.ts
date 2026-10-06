import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { stableUuid } from 'src/constants/stable-uuid';
import { FOLDER_ID, VIEW_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: stableUuid('navigation:activeCampaigns'),
  name: 'Active campaigns',
  icon: 'IconSpeakerphone',
  position: 8,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: VIEW_ID.activeCampaigns,
  folderUniversalIdentifier: FOLDER_ID.fundraising,
});
