import { defineRole } from 'twenty-sdk/define';

import { ROLE_ID } from 'src/constants/universal-identifiers';
import { OBJECT, read } from 'src/roles/team-roles';

export default defineRole({
  universalIdentifier: ROLE_ID.boardViewer,
  label: 'Compass: Board viewer',
  description:
    'Read-only view of grants, KPIs, program results, campaigns and funders. Cannot see individual donors, gifts or volunteers, and cannot change or export anything.',
  icon: 'IconEye',
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canBeAssignedToUsers: true,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  objectPermissions: [
    read(OBJECT.grant),
    read(OBJECT.grantKpi),
    read(OBJECT.subgrantee),
    read(OBJECT.programMetric),
    read(OBJECT.fundraisingCampaign),
    read(OBJECT.company),
    read(OBJECT.workspaceMember),
  ],
  fieldPermissions: [],
  permissionFlagUniversalIdentifiers: [],
});
