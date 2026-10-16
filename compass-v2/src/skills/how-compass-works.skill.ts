import { defineSkill } from 'twenty-sdk/define';

import { SKILL_ID } from 'src/constants/universal-identifiers';

export default defineSkill({
  universalIdentifier: SKILL_ID.howCompassWorks,
  name: 'how-compass-works',
  label: 'How Nomad Compass works',
  description: 'Explains the Compass records and how to do everyday tasks. Use when someone asks how to do something in Compass.',
  icon: 'IconCompass',
  content: `Nomad Compass is a nonprofit toolkit built on Twenty CRM. It tracks grants and their results, donors and gifts, volunteers, and the relationships that lead to gifts. Explain things in plain words for someone who is new to CRM software.

THE RECORDS
- People hold every individual: donors, prospects, volunteers, board members, funder contacts. Pick one or more "Contact types".
- Companies hold organizations: foundations, corporate sponsors, government funders, partners.
- Donation is one gift or pledge. Link it to a person (Donor) or an organization (Organization donor), and optionally to a Campaign or a Grant.
- Campaign is a fundraising effort with a goal, such as a spring appeal or giving day.
- Cultivation plan is the plan to build a relationship with one donor or prospect: stage, planned ask, next step and who owns it.
- Grant has a funder, amount, dates, reporting schedule and status. KPIs are the measurable results it promised. Subgrantees are partners who receive part of it. Program results record people served and cost by month.
- Volunteer hours records a block of hours for a volunteer. Only Approved hours count.
- Tasks are reminders. Compass creates some automatically.

WHAT COMPASS CALCULATES FOR YOU (never type these in by hand; they are read-only)
- On a person: giving status, lifetime giving, number of gifts, first, last and largest gift, approved volunteer hours.
- On a company: total given, total awarded, active grants.
- On a campaign: raised, pledged, donors, percent of goal.
- On a grant: KPI progress, time elapsed, percent spent, pace, payments received, data check.
- On a KPI: status and progress. On a cultivation plan: forecast value.
If a number looks wrong, fix the underlying records (the donations, KPIs or hours) and it corrects itself within moments. Do not try to edit the number.

EVERYDAY TASKS
- Record a gift: open Donations, add a record, choose the donor, amount, date and status Received. Compass names it, updates the donor's totals and creates a thank-you task when the gift is recent.
- Record a pledge: use status Pledged. It is tracked but not counted in totals until you change it to Received.
- Thank someone: finish the thank-you task Compass created, then tick "Thanked" on the donation.
- Add a grant: Grants, add a record. Set status, funder, award amount, start and end dates, reporting frequency and next report due. Add KPIs with a target, the result so far, the measurement date and how it was measured.
- After sending a funder report: set "Last report submitted on". Compass moves "Next report due" to the next cycle.
- Log volunteer hours: Volunteer hours, add a record. A coordinator changes the status to Approved after checking.
- Mark someone as do not contact or thank-yous only: set their Outreach permission. Compass then creates no reminders and no AI insights for them, or no asks for thank-yous only.
- AI insight on a donor: open the person and choose "AI donor insight" from the command menu. AI report draft: open a grant and choose "Draft funder report". Both show the facts they relied on. Always check them.
- Try Compass safely: the command menu has "Add sample data" and "Remove sample data". Sample records are labeled (SAMPLE).

Giving statuses: Prospect has no gifts yet. New is a first gift in the last year. Active gave within about nine months. At risk is about nine to twelve months since the last gift (the time to reach out). Lapsed is thirteen months or more. Inactive is over two years.`,
});
