import { defineFrontComponent } from 'twenty-sdk/define';
import { Command, enqueueSnackbar, useRecordId } from 'twenty-sdk/front-component';

import { FRONT_COMPONENT_ID } from 'src/constants/universal-identifiers';
import { describeAiOutcome } from 'src/lib/outcome-messages';
import { runCompassAction } from 'src/front-components/run-compass-action';

const GrantReport = () => {
  const grantId = useRecordId();

  const execute = async () => {
    if (!grantId) {
      await enqueueSnackbar({ variant: 'info', message: 'Open a grant first, then run Draft funder report.' });

      return;
    }

    await enqueueSnackbar({ variant: 'info', message: 'Drafting the report. This can take up to a minute.', duration: 5000 });
    await runCompassAction('/s/compass/grant-report', { grantId }, (outcome) => describeAiOutcome('funder report draft', outcome));
  };

  return <Command execute={execute} />;
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_ID.grantReport,
  name: 'grant-report',
  description: 'Drafts a funder report for the open grant from its records, with placeholders for anything missing.',
  isHeadless: true,
  component: GrantReport,
});
