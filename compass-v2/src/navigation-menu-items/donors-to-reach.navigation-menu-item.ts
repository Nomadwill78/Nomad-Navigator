import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { stableUuid } from 'src/constants/stable-uuid';
import { FOLDER_ID, VIEW_ID } from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: stableUuid('navigation:donorsToReach'),
  name: 'Donors to reach out to',
  icon: 'IconPhoneCall',
  position: 1,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: VIEW_ID.donorsToReach,
  folderUniversalIdentifier: FOLDER_ID.fundraising,
});
