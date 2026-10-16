import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { stableUuid } from 'src/constants/stable-uuid';
import { FOLDER_ID, OBJECT_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: stableUuid('navigation:campaigns'),
  name: 'All campaigns',
  icon: 'IconSpeakerphone',
  position: 7,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: OBJECT_ID.fundraisingCampaign,
  folderUniversalIdentifier: FOLDER_ID.fundraising,
});
