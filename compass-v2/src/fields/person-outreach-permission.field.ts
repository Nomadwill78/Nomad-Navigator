import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { OUTREACH_PERMISSION_SEEDS } from 'src/constants/enums';
import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { selectField } from 'src/objects/field-helpers';

export default defineField({
  ...selectField(PERSON_FIELD.outreachPermission, 'outreachPermission', 'Outreach permission', OUTREACH_PERMISSION_SEEDS, { defaultValue: 'OK_TO_CONTACT', icon: 'IconShieldCheck', description: 'Respect this before any outreach. Do not contact means no tasks, no AI insights and no messages. Thank-yous only means never ask for a gift.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
