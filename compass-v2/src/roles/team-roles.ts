import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  SystemPermissionFlag,
} from 'twenty-sdk/define';

import { OBJECT_ID, PERSON_FIELD } from 'src/constants/universal-identifiers';

// Shared building blocks for the team roles. A "can read" entry never lets
// anyone change a record; "can edit" lets them add and change records; "can
// remove" lets them move a record to the trash (always recoverable).

const STANDARD = STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS;

type Access = 'read' | 'edit' | 'remove';

const grant = (objectUniversalIdentifier: string, access: Access) => ({
  objectUniversalIdentifier,
  canReadObjectRecords: true,
  canUpdateObjectRecords: access === 'edit' || access === 'remove',
  canSoftDeleteObjectRecords: access === 'remove',
  canDestroyObjectRecords: false,
});

export const OBJECT = {
  person: STANDARD.person.universalIdentifier,
  company: STANDARD.company.universalIdentifier,
  task: STANDARD.task.universalIdentifier,
  taskTarget: STANDARD.taskTarget.universalIdentifier,
  note: STANDARD.note.universalIdentifier,
  noteTarget: STANDARD.noteTarget.universalIdentifier,
  workspaceMember: STANDARD.workspaceMember.universalIdentifier,
  ...OBJECT_ID,
} as const;

// Everyone who works in the app needs tasks and notes, and needs to see their
// colleagues' names to assign things.
export const everyday = [
  grant(OBJECT.task, 'remove'),
  grant(OBJECT.taskTarget, 'remove'),
  grant(OBJECT.note, 'remove'),
  grant(OBJECT.noteTarget, 'remove'),
  grant(OBJECT.workspaceMember, 'read'),
];

export const read = (objectUniversalIdentifier: string) => grant(objectUniversalIdentifier, 'read');
export const edit = (objectUniversalIdentifier: string) => grant(objectUniversalIdentifier, 'edit');
export const remove = (objectUniversalIdentifier: string) => grant(objectUniversalIdentifier, 'remove');

// Fields about a person's giving, our estimate of their capacity and the AI's
// read on them. People who do not work with donors should not see these.
const DONOR_PRIVATE_FIELDS = [
  PERSON_FIELD.capacityRating, PERSON_FIELD.givingStatus, PERSON_FIELD.lifetimeGiving,
  PERSON_FIELD.giftCount, PERSON_FIELD.firstGiftDate, PERSON_FIELD.lastGiftDate,
  PERSON_FIELD.lastGiftAmount, PERSON_FIELD.largestGift, PERSON_FIELD.aiSummary,
  PERSON_FIELD.aiNextBestAction, PERSON_FIELD.aiSuggestedAsk, PERSON_FIELD.aiRetentionRisk,
  PERSON_FIELD.aiBasis, PERSON_FIELD.aiGeneratedAt,
];

export const hideDonorFields = DONOR_PRIVATE_FIELDS.map((fieldUniversalIdentifier) => ({
  objectUniversalIdentifier: OBJECT.person,
  fieldUniversalIdentifier,
  canReadFieldValue: false,
  canUpdateFieldValue: false,
}));

export const FLAG = SystemPermissionFlag;
