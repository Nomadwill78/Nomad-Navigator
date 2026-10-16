import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { VOLUNTEER_SKILL_SEEDS } from 'src/constants/enums';
import { PERSON_FIELD } from 'src/constants/universal-identifiers';
import { multiSelectField } from 'src/objects/field-helpers';

export default defineField({
  ...multiSelectField(PERSON_FIELD.volunteerSkills, 'volunteerSkills', 'Volunteer skills', VOLUNTEER_SKILL_SEEDS, { icon: 'IconTools', description: 'What they are good at and happy to help with.' }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
