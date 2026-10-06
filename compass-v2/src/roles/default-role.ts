import { defineApplicationRole, SystemPermissionFlag } from 'twenty-sdk/define';

import { DEFAULT_ROLE_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

// What Compass's own background jobs are allowed to do: read everything and
// update records (to keep totals and statuses current and to create reminders),
// and move records to the trash (only used by "Remove sample data", and only for
// the exact records it added). It cannot permanently destroy anything.
export default defineApplicationRole({
  universalIdentifier: DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'Nomad Compass automation',
  description: 'Used by Nomad Compass background jobs to keep totals current and create reminders. Cannot permanently delete records.',
  icon: 'IconRobot',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: true,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canBeAssignedToUsers: false,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  // runAgent() needs the AI permission.
  permissionFlagUniversalIdentifiers: [SystemPermissionFlag.AI],
});
