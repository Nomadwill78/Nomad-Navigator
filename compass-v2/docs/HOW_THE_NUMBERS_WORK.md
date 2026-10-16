# How the numbers are worked out

Every figure in Compass can be traced to a rule. If a funder or a board member asks "where does that number come from?", this page has the answer.

Calculated fields are locked on screen. To change one, fix the records it comes from (the gifts, KPIs or hours) and it corrects itself.

## Donors and gifts

**What counts as a gift.** Only gifts whose status is **Received**, whose type is not **In-kind**, whose amount is more than zero and whose currency matches your reporting currency (USD by default).

- **Pledged** gifts are tracked but not counted until you change them to Received.
- **In-kind** gifts (goods or services) are recorded but never added to cash totals.
- **Written off** gifts are not counted.
- A received gift in a different currency is **not added in**, and says so, rather than being mixed into the total.

**Lifetime giving, number of gifts, first, last and largest gift** come only from the gifts that count.

**Giving status** depends on the whole months since the last gift:

| Status | Meaning |
|---|---|
| **Prospect** | No counted gifts yet |
| **New** | First gift was within the last 12 months, and they are still current |
| **Active** | Last gift was under 9 months ago |
| **At risk** | Last gift was 9 to 12 months ago. This is your window to reach out before they lapse |
| **Lapsed** | 13 months or more |
| **Inactive** | 25 months or more |

These are common rules of thumb, with one month of grace around the 12-month mark so someone who gives every December is not called lapsed on the day their gift is due. If your giving cycle is different, the thresholds are set at the top of `src/lib/donations.ts`.

## Reminders

| Reminder | When it is created | Notes |
|---|---|---|
| **Thank-you** | When a gift or pledge is added | Due 2 days after the gift. A **personal call** if the gift is at or above your threshold (default $1,000). A **welcome** for a first gift. Never for gifts dated more than 14 days ago, so importing old gifts does not create a pile of overdue tasks |
| **Renewal check-in** | Each night, for donors who are At risk | Up to 15 a night, biggest donors first. One per donor per last-gift date |
| **Report due** | 14 days before a grant's *Next report due* | Linked to the funder. One reminder per due date, due 3 days before the deadline. If Compass first notices a report that is already late, the reminder says OVERDUE and is due today |
| **Background check** | 30 days before expiry, or if expired | Skipped for inactive volunteers |

A reminder is never created twice. Nobody marked **Do not contact** gets any. Someone marked **Thank-yous only** gets thank-yous and check-ins, never an ask.

## Grants

**KPI status** (same rules as v1):

| Status | Meaning |
|---|---|
| **No target** | No target, or a target of zero. Shown as "No target", never as a percentage |
| **Not started** | A target but no progress yet |
| **Behind** | Under 50% of target |
| **On track** | 50% up to 100% |
| **Met** | Exactly 100% |
| **Exceeded** | Over 100% |

Progress is **rounded down**: 99.96% shows as 99.9% and is never called "Met".

**KPI progress for a grant** is the average of its KPIs that have a target, each capped at 100%, so one big win cannot hide a KPI that is far behind. With no targets it shows nothing, not 0%.

**Pace** compares KPI progress with how much of the grant period has passed:

- Within 10 points: **On pace** (also when progress is ahead of time)
- 10 to 25 points behind: **Slipping**
- More than 25 points behind: **Off pace**

Pace is only judged for **active** grants that have dates and at least one KPI with a target. Otherwise it says "Not enough data". It is a prompt to look closer, not a verdict.

**Percent spent** is spent so far divided by the award. **Payments received** adds up donations linked to the grant that are Received.

**Next report due** moves forward when you set **Last report submitted on**. Early, on time or very late, it moves to the next cycle after both the report just sent and the day you sent it, so it never lands on a date in the past.

**Data check** lists problems: no funder, no award amount, spent more than awarded, end date before start date, no reporting frequency, no KPIs, a KPI with no target, and a KPI with no measurement date or one older than 90 days.

## Campaigns, funders, volunteers, plans

- **Campaign:** *Raised* is received cash gifts. *Pledged* is separate and is not included in *Raised*. *Donors* counts distinct people and organizations. *Percent of goal* is empty if there is no goal.
- **Funder (company):** *Total given* is received cash donations from that organization. *Total awarded* adds the award amounts of its grants that are awarded, active or completed. *Active grants* counts active ones.
- **Volunteer:** *Approved hours* counts only approved entries. Hours logged but not yet approved are not counted anywhere.
- **Cultivation plan:** *Forecast value* is the planned ask times a likelihood. By stage the likelihood is Identify 5%, Qualify 10%, Cultivate 25%, Ask 50%. You can enter your own. Plans that are being stewarded or declined are not in the forecast. It is a planning guide, not a promise.

## AI insights

The AI is told only the facts above, never a name or contact detail. Everything it writes is checked afterwards:

- The facts it relied on are saved with the insight. No stated basis, no insight.
- Every figure in its text is looked up in the record. Any it cannot find is listed under **Check**.
- A suggested ask is never more than 5 times the donor's largest past gift, and is removed if there is no giving history or the donor asked for thank-yous only.
- Someone marked Do not contact is never sent to the AI at all.
