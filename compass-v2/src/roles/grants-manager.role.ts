import { defineRole } from 'twenty-sdk/define';

import { ROLE_ID } from 'src/constants/universal-identifiers';
import { edit, everyday, FLAG, hideDonorFields, OBJECT, read, remove } from 'src/roles/team-roles';

export default defineRole({
  universalIdentifier: ROLE_ID.grantsManager,
  label: 'Compass: Grants manager',
  description:
    'Manages grants, KPIs, subgrantees and program results, and can draft funder reports. Sees funders and their contacts but not individual donors\' giving history.',
  icon: 'IconAward',
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
    remove(OBJECT.grant),
    remove(OBJECT.grantKpi),
    remove(OBJECT.subgrantee),
    remove(OBJECT.programMetric),
    edit(OBJECT.company),
    edit(OBJECT.person),
    read(OBJECT.fundraisingCampaign),
    read(OBJECT.volunteerLog),
  ],
  fieldPermissions: hideDonorFields,
  permissionFlagUniversalIdentifiers: [FLAG.AI, FLAG.IMPORT_CSV, FLAG.EXPORT_CSV],
});
