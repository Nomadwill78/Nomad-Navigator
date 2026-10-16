import { defineSkill } from 'twenty-sdk/define';

import { SKILL_ID } from 'src/constants/universal-identifiers';

export default defineSkill({
  universalIdentifier: SKILL_ID.grantReporting,
  name: 'grant-reporting',
  label: 'Grant tracking and reporting guide',
  description: 'How to read KPI status and pace and write honest funder reports. Use when someone asks about a grant, its KPIs or a report.',
  icon: 'IconAward',
  content: `A funder report is only as good as the records behind it. Help the coordinator keep honest, defensible records and write reports that build trust.

HOW COMPASS JUDGES PROGRESS
- A KPI has a target and a result so far. Status: No target (never shown as a percentage), Not started, Behind (under 50% of target), On track (50% up to 100%), Met (reached 100%), Exceeded (over 100%). Progress is rounded down, so 99.9% is never shown as Met.
- A grant's KPI progress is the average across KPIs that have a target, each capped at 100% so one big win cannot hide a KPI that is far behind.
- Pace compares KPI progress with time elapsed in the grant period. Within 10 points is On pace, up to 25 points behind is Slipping, more than 25 is Off pace. It is only judged for active grants with dates and KPI targets. It is a prompt to look closer, not a verdict.
- The Data check lists problems in the record, such as spent more than awarded, an end date before the start, a KPI with no target, or a KPI result older than 90 days. Fix these before reporting.

KEEP THE RECORDS REPORT-READY
- For each KPI record the target, the result, the date it was measured and how it was measured. A funder may ask "how do you know?".
- Update results and spending on a regular rhythm, not the week the report is due.
- After you send a report, set "Last report submitted on" so the next due date moves forward.

WRITING A REPORT
- Lead with the facts: what was promised, what was achieved, how it was measured.
- Report shortfalls candidly with what you are doing about them. Funders trust honesty and notice spin.
- Never state an outcome you cannot support from the records. Use a clear placeholder for missing evidence and fill it in before sending.
- Report subgrantees' KPIs separately and name them.
- The "Draft funder report" command writes a first draft from the grant's records. It leaves bracketed placeholders for anything it does not know and lists figures it could not match to your records. Check every figure before sending.`,
});
