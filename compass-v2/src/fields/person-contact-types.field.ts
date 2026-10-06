import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { CONTACT_TYPE_SEEDS } from 'src/constants/enums';
import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { multiSelectField } from 'src/objects/field-helpers';

export default defineField({
  ...multiSelectField(PERSON_FIELD.contactTypes, 'contactTypes', 'Contact types', CONTACT_TYPE_SEEDS, { icon: 'IconTags', description: 'How this person relates to your organization. Pick all that apply, for example Donor and Volunteer.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
