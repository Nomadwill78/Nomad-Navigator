import { defineFrontComponent } from 'twenty-sdk/define';
import { Command, enqueueSnackbar, useRecordId } from 'twenty-sdk/front-component';

import { FRONT_COMPONENT_ID } from 'src/constants/universal-identifiers';
import { describeAiOutcome } from 'src/lib/outcome-messages';
import { runCompassAction } from 'src/front-components/run-compass-action';

const DonorInsight = () => {
  const personId = useRecordId();

  const execute = async () => {
    if (!personId) {
      await enqueueSnackbar({ variant: 'info', message: 'Open a person\'s page first, then run AI donor insight.' });

      return;
    }

    await enqueueSnackbar({ variant: 'info', message: 'Writing the insight. This takes a few seconds.', duration: 4000 });
    await runCompassAction('/s/compass/donor-insight', { personId }, (outcome) => describeAiOutcome('donor insight', outcome));
  };

  return <Command execute={execute} />;
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_ID.donorInsight,
  name: 'donor-insight',
  description: 'Writes an AI insight for the open person and shows the facts it relied on.',
  isHeadless: true,
  component: DonorInsight,
});
