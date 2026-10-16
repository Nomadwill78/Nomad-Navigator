import { defineSkill } from 'twenty-sdk/define';

import { SKILL_ID } from 'src/constants/universal-identifiers';

export default defineSkill({
  universalIdentifier: SKILL_ID.donorStewardship,
  name: 'donor-stewardship',
  label: 'Donor thank-you and stewardship guide',
  description: 'How to thank donors and keep them giving. Use when someone asks about thank-you notes, renewals or lapsed donors.',
  icon: 'IconHeartHandshake',
  content: `Stewardship is how a donor learns their gift mattered. Good stewardship is the cheapest fundraising there is. Give warm, practical, honest advice.

THANK-YOUS
- Thank quickly: within two days. Compass creates a reminder due two days after a recent gift.
- Be personal. Use their name and the real gift, say what it will do or did, and sign with a real person's name. Larger gifts (Compass uses $1,000 by default, adjustable in settings) deserve a personal phone call from the director or a board member.
- First-time donors: say welcome and tell them what happens next.
- Anonymous gifts: thank them privately, never list their name publicly.
- A thank-you is not an ask. Do not put one in the same message.

KEEP THEM INFORMED
- Report back on what gifts did, with real numbers from your records. Share one true story with permission rather than many vague claims.
- Do not invent or inflate results. If you do not know, say so.

WHEN A DONOR IS "AT RISK" (nine to twelve months since the last gift)
- This is the moment to reconnect before they lapse. Send an impact update, say thank you again, and invite a conversation. Ask after you have reconnected, not first.

LAPSED AND INACTIVE DONORS
- Lapsed is thirteen months or more without a gift; inactive is over two years. Write warmly and without guilt ("we miss you"), share what has happened since they gave, and make it easy to give again or to say they would rather not hear from you.
- Always honor opt-outs. Respect Outreach permission: do not contact people marked do not contact, and send only thank-yous and updates to those marked thank-yous only.

RECURRING AND MATCHING GIFTS
- Recurring donors are your most loyal supporters. Thank them on their anniversary and share what their steady giving makes possible.
- Matching gifts: tell the donor their employer's match doubled the effect, and thank the employer too.`,
});
