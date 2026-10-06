import { defineRole } from 'twenty-sdk/define';

import { ROLE_ID } from 'src/constants/universal-identifiers';
import { edit, everyday, FLAG, hideDonorFields, OBJECT, read, remove } from 'src/roles/team-roles';

export default defineRole({
  universalIdentifier: ROLE_ID.volunteerCoordinator,
  label: 'Compass: Volunteer coordinator',
  description:
    'Manages volunteers and their hours. Cannot see gifts or any donor\'s giving history. Can import a volunteer list but not export contacts.',
  icon: 'IconClockHour4',
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canBeAssignedToUsers: true,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  objectPermissions: [
    ...everyday,
    edit(OBJECT.person),
    remove(OBJECT.volunteerLog),
    read(OBJECT.company),
    read(OBJECT.grant),
  ],
  fieldPermissions: hideDonorFields,
  permissionFlagUniversalIdentifiers: [FLAG.IMPORT_CSV],
});
