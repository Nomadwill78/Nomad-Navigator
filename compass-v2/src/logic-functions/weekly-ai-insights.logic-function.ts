import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_ID } from 'src/constants/universal-identifiers';
import { runWeeklyInsights } from 'src/services/ai-insights';
import { liveAiDeps, liveSettings } from 'src/services/runtime';

const handler = async () => {
  const settings = liveSettings();

  // Off unless someone turns it on in the app's settings: it uses AI credits and
  // sends donor facts (never names or contact details) to the AI provider.
  if (!settings.aiWeeklyInsightsEnabled) return { skipped: 'Weekly AI insights are turned off in settings.' };

  const summary = await runWeeklyInsights(liveAiDeps(), settings.aiWeeklyInsightLimit);

  console.log('Weekly insights finished', JSON.stringify(summary));

  return summary;
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_ID.weeklyAiInsights,
  name: 'weekly-ai-insights',
  description:
    'Every Monday, if turned on in settings: writes AI insights for the donors where a timely conversation matters most.',
  timeoutSeconds: 900,
  cronTriggerSettings: { pattern: '0 12 * * 1' },
  handler,
});
