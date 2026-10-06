import { defineFrontComponent } from 'twenty-sdk/define';
import { CommandModal } from 'twenty-sdk/front-component';

import { FRONT_COMPONENT_ID } from 'src/constants/universal-identifiers';
import { describeSeedOutcome } from 'src/lib/outcome-messages';
import { runCompassAction } from 'src/front-components/run-compass-action';

const AddSampleData = () => (
  <CommandModal
    title="Add sample data?"
    subtitle="This adds made-up donors, gifts, grants and volunteers, all labeled (SAMPLE), so you can try Compass. You can remove them with one command."
    confirmButtonText="Add sample data"
    execute={() => runCompassAction('/s/compass/sample-data', undefined, describeSeedOutcome)}
  />
);

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_ID.addSampleData,
  name: 'add-sample-data',
  description: 'Adds clearly labeled sample records to try Compass.',
  isHeadless: true,
  component: AddSampleData,
});
