import { defineHealthCheck, type ApplicationHealthCheckResult } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_ID } from 'src/constants/universal-identifiers';
import { settingsProblems } from 'src/services/settings';

const handler = async (): Promise<ApplicationHealthCheckResult> => {
  const problems = settingsProblems(process.env);

  if (problems.length === 0) return { status: 'OK' };

  return {
    status: 'WARNING',
    title: 'A Nomad Compass setting needs a look',
    description: `${problems.join(' ')} Compass is using safe default values until this is fixed.`,
    action: { label: 'Open the app settings', location: '/settings/applications' },
  };
};

export default defineHealthCheck({
  universalIdentifier: LOGIC_FUNCTION_ID.healthCheck,
  name: 'health-check',
  description: 'Warns on the app settings page when a Nomad Compass setting has a value that cannot be used.',
  timeoutSeconds: 30,
  handler,
});
