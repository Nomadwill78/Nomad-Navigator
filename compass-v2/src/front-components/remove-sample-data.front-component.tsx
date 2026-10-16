import { defineFrontComponent } from 'twenty-sdk/define';
import { CommandModal } from 'twenty-sdk/front-component';

import { FRONT_COMPONENT_ID } from 'src/constants/universal-identifiers';
import { describeRemoveOutcome } from 'src/lib/outcome-messages';
import { runCompassAction } from 'src/front-components/run-compass-action';

const RemoveSampleData = () => (
  <CommandModal
    title="Remove sample data?"
    subtitle="This removes the sample records Compass added, and the reminders created for them. Your own records are never touched."
    confirmButtonText="Remove sample data"
    confirmButtonAccent="danger"
    execute={() => runCompassAction('/s/compass/sample-data/remove', undefined, describeRemoveOutcome)}
  />
);

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_ID.removeSampleData,
  name: 'remove-sample-data',
  description: 'Removes exactly the sample records Compass added.',
  isHeadless: true,
  component: RemoveSampleData,
});
