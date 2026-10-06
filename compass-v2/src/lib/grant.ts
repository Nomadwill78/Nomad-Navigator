import { type GrantPace, type ReportFrequency } from 'src/constants/enums';
import {
  addDays,
  addMonths,
  daysBetween,
  isBefore,
  parseIsoDate,
} from 'src/lib/dates';
import { roundTo, toNumber } from 'src/lib/money';

export const STALE_KPI_DAYS = 90;

export const percentSpent = (spent: unknown, award: unknown): number | null => {
  const spentUnits = toNumber(spent);
  const awardUnits = toNumber(award);

  if (spentUnits === null || awardUnits === null || awardUnits <= 0) return null;

  return roundTo((Math.max(spentUnits, 0) / awardUnits) * 100, 1);
};

// How far through the grant period we are, 0 to 100. Null when the dates are
// missing, invalid, or the end is not after the start.
export const timeElapsedPercent = (
  startDate: unknown,
  endDate: unknown,
  asOf: string,
): number | null => {
  const total = daysBetween(String(startDate ?? ''), String(endDate ?? ''));
  const elapsed = daysBetween(String(startDate ?? ''), asOf);

  if (total === null || elapsed === null || total <= 0) return null;

  return roundTo(Math.min(Math.max((elapsed / total) * 100, 0), 100), 1);
};

// Pace compares KPI progress with how much of the grant period has gone by.
// Method, stated plainly so a coordinator can defend it to a funder:
//   gap = percent of time elapsed minus average KPI progress
//   gap up to 10 points -> On pace (including when progress is ahead of time)
//   gap up to 25 points -> Slipping
//   anything larger     -> Off pace
// It is only judged for active grants that have dates and at least one KPI
// with a target; otherwise it says there is not enough data.
export const PACE_SLIPPING_GAP = 10;
export const PACE_OFF_GAP = 25;

export const resolvePace = ({
  status,
  kpiProgressPercent,
  elapsedPercent,
}: {
  status: unknown;
  kpiProgressPercent: number | null;
  elapsedPercent: number | null;
}): GrantPace => {
  if (status !== 'ACTIVE' || kpiProgressPercent === null || elapsedPercent === null) {
    return 'NOT_ENOUGH_DATA';
  }

  const gap = elapsedPercent - kpiProgressPercent;

  if (gap <= PACE_SLIPPING_GAP) return 'ON_PACE';
  if (gap <= PACE_OFF_GAP) return 'SLIPPING';

  return 'OFF_PACE';
};

const MONTHS_PER_FREQUENCY: Partial<Record<ReportFrequency, number>> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  ANNUAL: 12,
};

// The first due date strictly after `after`, stepping from `anchor` by the
// funder's reporting cycle. Stepping from the anchor (not from `after`) keeps a
// quarterly report on the 15th instead of drifting a few days each cycle.
export const nextReportDueAfter = (
  anchor: string,
  after: string,
  frequency: ReportFrequency,
): string | null => {
  if (!parseIsoDate(anchor) || !parseIsoDate(after)) return null;

  const step = (index: number): string | null =>
    frequency === 'WEEKLY'
      ? addDays(anchor, index * 7)
      : addMonths(anchor, index * (MONTHS_PER_FREQUENCY[frequency] ?? 1));

  // A century of weekly steps is more than any grant lasts; the bound only
  // guards against a malformed date looping forever.
  for (let index = 0; index < 5200; index++) {
    const candidate = step(index);

    if (candidate && isBefore(after, candidate)) return candidate;
  }

  return null;
};

// When a report is submitted, the next one is due after both the report that
// was just filed and the day it was filed. Submitting early (before the due
// date) still moves on to the following cycle, not back to the same date.
export const nextDueAfterSubmission = ({
  currentDue,
  startDate,
  submittedOn,
  frequency,
}: {
  currentDue: string | null;
  startDate: string | null;
  submittedOn: string;
  frequency: ReportFrequency;
}): string | null => {
  const anchor = currentDue ?? startDate ?? submittedOn;
  const after = currentDue && isBefore(submittedOn, currentDue) ? currentDue : submittedOn;

  return nextReportDueAfter(anchor, after, frequency);
};

export type GrantForCheck = {
  name?: string | null;
  status?: string | null;
  funderId?: string | null;
  awardUnits: number | null;
  spentUnits: number | null;
  startDate?: string | null;
  endDate?: string | null;
  reportFrequency?: string | null;
};

export type KpiForCheck = {
  name?: string | null;
  target?: unknown;
  asOfDate?: string | null;
};

const AWARDED_STATUSES = ['PENDING', 'ACTIVE', 'COMPLETED'];

// Carries forward v1's validation (see src/lib/grantValidation.ts) as a plain
// list of things to look at. Twenty cannot refuse a save the way v1's Firestore
// rules did, so problems are surfaced on the grant instead of blocking it.
export const findGrantDataIssues = (
  grant: GrantForCheck,
  kpis: readonly KpiForCheck[],
  asOf: string,
): string[] => {
  const issues: string[] = [];
  const isAwarded = AWARDED_STATUSES.includes(String(grant.status));

  if (!grant.name?.trim()) issues.push('The grant has no name.');
  if (!grant.funderId) issues.push('No funder is linked to this grant.');

  if (isAwarded && !(grant.awardUnits !== null && grant.awardUnits > 0)) {
    issues.push('The award amount is missing or zero.');
  }

  if (
    grant.awardUnits !== null &&
    grant.spentUnits !== null &&
    grant.awardUnits > 0 &&
    grant.spentUnits > grant.awardUnits
  ) {
    issues.push('Spent is more than the award amount. Check the numbers.');
  }

  if (grant.startDate && grant.endDate && isBefore(grant.endDate, grant.startDate)) {
    issues.push('The end date is before the start date.');
  }

  if (grant.status === 'ACTIVE') {
    if (!grant.reportFrequency) {
      issues.push('This active grant has no reporting frequency, so no report reminders can be scheduled.');
    }
    if (kpis.length === 0) issues.push('No KPIs are tracked for this active grant.');
  }

  const untargeted = kpis.filter((kpi) => !((toNumber(kpi.target) ?? 0) > 0));
  if (untargeted.length > 0) {
    issues.push(
      `${untargeted.length} KPI${untargeted.length === 1 ? ' has' : 's have'} no target: ${untargeted
        .slice(0, 3)
        .map((kpi) => kpi.name || 'Unnamed')
        .join(', ')}${untargeted.length > 3 ? ', and more' : ''}.`,
    );
  }

  if (grant.status === 'ACTIVE') {
    const stale = kpis.filter((kpi) => {
      if (!kpi.asOfDate) return true;
      const age = daysBetween(kpi.asOfDate, asOf);

      return age !== null && age > STALE_KPI_DAYS;
    });

    if (stale.length > 0) {
      issues.push(
        `${stale.length} KPI${stale.length === 1 ? ' has' : 's have'} no measurement date or a result older than ${STALE_KPI_DAYS} days.`,
      );
    }
  }

  return issues;
};

export const formatDataCheck = (issues: readonly string[]): string =>
  issues.length === 0
    ? 'No problems found.'
    : issues.map((issue) => `• ${issue}`).join('\n');
