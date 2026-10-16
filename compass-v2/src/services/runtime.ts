import { CoreApiClient } from 'twenty-client-sdk/core';
import { kv, runAgent } from 'twenty-sdk/logic-function';

import { AGENT_ID } from 'src/constants/universal-identifiers';
import { todayIso } from 'src/lib/dates';

import { type AiDeps } from 'src/services/ai-insights';
import { type RollupDeps } from 'src/services/rollups';
import { type GraphqlClient } from 'src/services/repo';
import { readSettings } from 'src/services/settings';
import { type KeyValueStore } from 'src/services/tasks';

// The one place that touches Twenty's live runtime. Everything else receives
// what it needs as arguments, which is what makes it testable.

export const liveSettings = () => readSettings(process.env);

export const liveClient = (): GraphqlClient => new CoreApiClient() as unknown as GraphqlClient;

export const liveStore = (): KeyValueStore => ({
  get: (key) => kv.get(key),
  set: (key, value) => kv.set(key, value),
});

export const liveRollupDeps = (): RollupDeps => ({
  client: liveClient(),
  asOf: todayIso(),
  currency: liveSettings().currency,
});

export const liveAiDeps = (): AiDeps => {
  const settings = liveSettings();

  return {
    ...liveRollupDeps(),
    runAgent: (input) => runAgent(input),
    donorAgentId: AGENT_ID.donorInsights,
    reportAgentId: AGENT_ID.grantReportWriter,
    includeFreeText: settings.aiIncludeFreeText,
    now: new Date(),
  };
};
