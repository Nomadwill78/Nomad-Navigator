import { defineRole } from 'twenty-sdk/define';

import { ROLE_ID } from 'src/constants/universal-identifiers';
import { edit, everyday, FLAG, OBJECT, read, remove } from 'src/roles/team-roles';

export default defineRole({
  universalIdentifier: ROLE_ID.fundraiser,
  label: 'Compass: Fundraiser',
  description:
    'Works with donors, gifts, campaigns and cultivation plans. Can see grants but not change them. Can import and export contact lists and use AI insights.',
  icon: 'IconHeartHandshake',
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
    edit(OBJECT.company),
    remove(OBJECT.donation),
    edit(OBJECT.fundraisingCampaign),
    remove(OBJECT.cultivationPlan),
    read(OBJECT.volunteerLog),
    read(OBJECT.grant),
    read(OBJECT.grantKpi),
    read(OBJECT.subgrantee),
    read(OBJECT.programMetric),
  ],
  fieldPermissions: [],
  permissionFlagUniversalIdentifiers: [FLAG.AI, FLAG.IMPORT_CSV, FLAG.EXPORT_CSV],
});
