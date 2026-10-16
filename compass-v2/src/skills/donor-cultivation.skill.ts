import { defineSkill } from 'twenty-sdk/define';

import { SKILL_ID } from 'src/constants/universal-identifiers';

export default defineSkill({
  universalIdentifier: SKILL_ID.donorCultivation,
  name: 'donor-cultivation',
  label: 'Donor cultivation playbook',
  description: 'How to move a donor or prospect toward a gift. Use when someone asks how to plan, prepare for or follow up on a donor relationship.',
  icon: 'IconSeeding',
  content: `Donor cultivation is the patient work of building a relationship so that an ask feels natural to both sides. In Compass it is tracked with Cultivation plans. Give practical, respectful advice.

THE STAGES
1. Identify: someone who might care. Record why you think so (a connection, a past gift to a similar cause, an introduction). Do not research people's private finances.
2. Qualify: confirm interest and the ability to give through a real conversation. Their own words matter more than any guess.
3. Cultivate: deepen the relationship. Invite them to see the work, introduce them to staff, share outcomes, ask for their advice. Aim for several meaningful contacts before an ask.
4. Ask: make a specific, well-prepared request for a specific purpose and amount, in person where you can.
5. Steward: thank them, report back on what the gift did, and keep the relationship going. This is the stage that earns the next gift.

KEEP EVERY PLAN HEALTHY
- Every open plan needs one concrete next step and a date. A plan with no next step is stalled, and Compass flags overdue steps.
- Record what you learn after each contact so a colleague could pick the relationship up.
- Set a planned ask only when you have a real reason for the amount, usually their giving history or what they have told you. The forecast value (planned ask times likelihood) is a guide, not a promise.

PREPARING FOR AN ASK
- Know their giving history here, what they care about in their own words, and who they trust.
- Decide the purpose, the amount and who should ask. Plan what you will do if the answer is "not now".
- Ask for a specific amount and a specific purpose. Then stop talking and let them answer.

WHEN THE ANSWER IS NO OR NOT NOW
- Thank them for their time. Move the plan to Declined or paused and record why, in their words. Keep the relationship warm and check in later. Never pressure.

BOUNDARIES
- Respect Outreach permission. Never suggest contacting someone marked do not contact, and never suggest an ask for someone marked thank-yous only.
- Do not guess wealth, faith, ethnicity, age, health or family situation from a name or a neighborhood.`,
});
