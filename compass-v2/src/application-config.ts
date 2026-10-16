import { defineApplication, FieldType } from 'twenty-sdk/define';

import {
  APP_DESCRIPTION,
  APP_DISPLAY_NAME,
  APPLICATION_UNIVERSAL_IDENTIFIER,
  SETTING_ID,
} from 'src/constants/universal-identifiers';

// These show up in Twenty under Settings > Applications > Nomad Compass. Every
// one has a safe default, so nothing needs to be set before using the app.
export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: APP_DISPLAY_NAME,
  description: APP_DESCRIPTION,
  author: 'Nomad Consulting',
  logo: 'public/logo.svg',
  applicationVariables: {
    MAJOR_GIFT_THRESHOLD: {
      universalIdentifier: SETTING_ID.majorGiftThreshold,
      label: 'Gift size that earns a personal thank-you call',
      description:
        'Gifts at or above this amount get a "call to thank" reminder instead of a standard thank-you. Default 1000.',
      type: FieldType.NUMBER,
      value: 1000,
      isSecret: false,
    },
    REPORTING_CURRENCY: {
      universalIdentifier: SETTING_ID.reportingCurrency,
      label: 'Currency used for totals',
      description:
        'A 3-letter currency code. Donor, campaign and grant totals only add up gifts in this currency, so amounts in different currencies are never mixed. Default USD.',
      type: FieldType.TEXT,
      value: 'USD',
      isSecret: false,
    },
    AI_WEEKLY_INSIGHTS_ENABLED: {
      universalIdentifier: SETTING_ID.aiWeeklyInsightsEnabled,
      label: 'Write AI donor insights automatically every Monday',
      description:
        'Off by default. When on, Compass picks the donors where a conversation matters most and writes an insight for each. This uses AI credits and sends giving facts (never names or contact details) to your AI provider.',
      type: FieldType.BOOLEAN,
      value: false,
      isSecret: false,
    },
    AI_WEEKLY_INSIGHT_LIMIT: {
      universalIdentifier: SETTING_ID.aiWeeklyInsightLimit,
      label: 'Most AI insights to write each Monday',
      description: 'Caps how many donors are covered in one weekly run, to control cost. Default 20, maximum 100.',
      type: FieldType.NUMBER,
      value: 20,
      isSecret: false,
    },
    AI_INCLUDE_FREE_TEXT: {
      universalIdentifier: SETTING_ID.aiIncludeFreeText,
      label: 'Let AI read staff-written plan and grant text',
      description:
        'Off by default. When on, the purpose and next-step text you type on cultivation plans and grants is included so the AI has more context. Staff sometimes type personal details there, so leave this off unless you are sure.',
      type: FieldType.BOOLEAN,
      value: false,
      isSecret: false,
    },
  },
});
