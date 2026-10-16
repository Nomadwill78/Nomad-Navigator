import { daysBetween, parseIsoDate } from 'src/lib/dates';
import { roundTo, toNumber } from 'src/lib/money';

export type VolunteerLogRow = {
  hours: unknown;
  activityDate: string | null;
  status: string | null;
};

export type VolunteerSummary = {
  approvedHours: number;
  pendingHours: number;
  lastVolunteeredOn: string | null;
  logCount: number;
};

// Only approved hours are reported as total hours, because a coordinator may
// have to defend that number to a funder. Hours still awaiting approval are
// tracked separately so they are visible but not counted.
export const summarizeVolunteerHours = (
  rows: readonly VolunteerLogRow[],
  asOf: string,
): VolunteerSummary => {
  let approved = 0;
  let pending = 0;
  let lastDate: string | null = null;
  let logCount = 0;

  for (const row of rows) {
    const hours = toNumber(row.hours);
    if (hours === null || hours <= 0) continue;

    logCount += 1;
    if (row.status === 'APPROVED') approved += hours;
    else pending += hours;

    const date = parseIsoDate(row.activityDate) ? row.activityDate!.slice(0, 10) : null;
    const notInFuture = date !== null && (daysBetween(date, asOf) ?? -1) >= 0;

    if (date && notInFuture && (lastDate === null || date > lastDate)) {
      lastDate = date;
    }
  }

  return {
    approvedHours: roundTo(approved, 2),
    pendingHours: roundTo(pending, 2),
    lastVolunteeredOn: lastDate,
    logCount,
  };
};
