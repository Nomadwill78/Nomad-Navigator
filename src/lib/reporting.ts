import { Grant, ReportDue, ReportStatus } from '../../types';
import { dayNumber, todayYmd } from './overview';

/**
 * The reporting calendar. A report's status is never stored: it is worked out
 * from its dates, so it cannot go stale or disagree with the due date.
 */

export function daysUntil(dueDate: string, today: string = todayYmd()): number | null {
  const due = dayNumber(dueDate);
  const now = dayNumber(today);
  return due === null || now === null ? null : due - now;
}

export function reportStatus(report: Pick<ReportDue, 'dueDate' | 'submittedDate'>, today: string = todayYmd()): ReportStatus {
  if (report.submittedDate) return 'submitted';
  const d = daysUntil(report.dueDate, today);
  return d !== null && d < 0 ? 'late' : 'upcoming';
}

export interface DueItem {
  grantId: string;
  grantName: string;
  funder: string;
  report: ReportDue;
  status: ReportStatus;
  /** Negative when late. */
  daysUntil: number;
}

/** How far ahead the Due Soon list looks. */
export const DUE_SOON_DAYS = 30;

/** Unsubmitted reports that are late or due within `windowDays`, most overdue first. */
export function listDueSoon(grants: Grant[], today: string = todayYmd(), windowDays: number = DUE_SOON_DAYS): DueItem[] {
  const items: DueItem[] = [];
  for (const g of grants) {
    if (g.status === 'pending') continue;
    for (const r of g.reports ?? []) {
      const d = daysUntil(r.dueDate, today);
      if (d === null || r.submittedDate) continue;
      if (d > windowDays) continue;
      items.push({ grantId: g.id, grantName: g.name, funder: g.funder, report: r, status: d < 0 ? 'late' : 'upcoming', daysUntil: d });
    }
  }
  return items.sort((a, b) => a.daysUntil - b.daysUntil || a.funder.localeCompare(b.funder));
}

export function describeDue(days: number): string {
  if (days < -1) return `${-days} days late`;
  if (days === -1) return '1 day late';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

// --- Reminders ---------------------------------------------------------------

export type ReminderKind = '14' | '3';

export interface PlannedReminder {
  orgId: string;
  grantId: string;
  grantName: string;
  funder: string;
  report: ReportDue;
  kind: ReminderKind;
  daysUntil: number;
  /** Stable id used to make sure the same reminder is never sent twice. */
  key: string;
}

export const reminderKey = (orgId: string, grantId: string, reportId: string, kind: ReminderKind) =>
  `${orgId}__${grantId}__${reportId}__${kind}`;

/**
 * Which reminders should go out today.
 *  - The "14 day" reminder goes once, any day from 14 down to 4 days before the due date.
 *  - The "3 day" reminder goes once, any day from 3 days before to the due day.
 * Using ranges instead of exact days means one missed daily run does not skip a reminder,
 * and `alreadySent` means a re-run never sends a duplicate. A report already inside the
 * 3 day window gets only the 3 day reminder, not both.
 */
export function planReminders(
  orgId: string,
  grants: Grant[],
  today: string,
  alreadySent: ReadonlySet<string>
): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  for (const g of grants) {
    if (g.status === 'pending') continue;
    for (const r of g.reports ?? []) {
      if (r.submittedDate) continue;
      const d = daysUntil(r.dueDate, today);
      if (d === null || d < 0 || d > 14) continue;
      const kind: ReminderKind = d <= 3 ? '3' : '14';
      const key = reminderKey(orgId, g.id, r.id, kind);
      if (alreadySent.has(key)) continue;
      out.push({ orgId, grantId: g.id, grantName: g.name, funder: g.funder, report: r, kind, daysUntil: d, key });
    }
  }
  return out;
}

export interface ReminderEmail { subject: string; text: string; }

export function buildReminderEmail(p: PlannedReminder, appUrl?: string): ReminderEmail {
  const when = p.daysUntil === 0 ? 'today' : p.daysUntil === 1 ? 'tomorrow' : `in ${p.daysUntil} days (${p.report.dueDate})`;
  const lines = [
    `Reminder: "${p.report.title}" for ${p.funder} is due ${when}.`,
    '',
    `Grant: ${p.grantName}`,
    `Due date: ${p.report.dueDate}`,
    p.report.owner ? `Owner: ${p.report.owner}` : '',
    '',
    'Mark it submitted in Nomad Compass once it has been sent, and these reminders stop.',
    appUrl ? appUrl : '',
  ].filter((l, i, arr) => !(l === '' && arr[i - 1] === ''));
  return { subject: `Report due ${p.daysUntil === 0 ? 'today' : `in ${p.daysUntil} day${p.daysUntil === 1 ? '' : 's'}`}: ${p.report.title} (${p.funder})`, text: lines.join('\n') };
}
