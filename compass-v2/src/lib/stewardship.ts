import { type OutreachPermission } from 'src/constants/enums';
import { addDays, daysBetween, parseIsoDate } from 'src/lib/dates';
import { formatMoney } from 'src/lib/money';

// A TaskPlan is a to-do the app wants created. Building the plan is pure (no
// network), so the rules for who gets thanked, and when, are easy to read and
// test. `dedupeKey` is remembered after a task is created so the same reminder
// is never created twice.
export type TaskPlan = {
  title: string;
  body: string;
  dueDate: string;
  dedupeKey: string;
  targetPersonId?: string;
  targetCompanyId?: string;
};

export const THANK_YOU_DUE_DAYS = 2;
// Gifts older than this are history (usually a bulk import), not something to
// thank for now. Without this limit, importing five years of gifts would create
// thousands of overdue tasks.
export const THANK_YOU_MAX_AGE_DAYS = 14;
// Gifts at or above this amount get a personal phone call, not just a letter.
export const DEFAULT_MAJOR_GIFT_THRESHOLD = 1000;
export const REPORT_REMINDER_WINDOW_DAYS = 14;
export const BACKGROUND_CHECK_WINDOW_DAYS = 30;

const withKey = (body: string, dedupeKey: string): string =>
  `${body}\n\nCreated automatically by Nomad Compass. Reference: ${dedupeKey}`;

export const planThankYouTask = ({
  donationId,
  donorId,
  donorName,
  companyId,
  amount,
  currency,
  giftDate,
  status,
  isFirstGift,
  isAnonymous,
  outreachPermission,
  majorGiftThreshold = DEFAULT_MAJOR_GIFT_THRESHOLD,
  asOf,
}: {
  donationId: string;
  donorId?: string | null;
  donorName: string;
  companyId?: string | null;
  amount: number;
  currency: string;
  giftDate: string | null;
  status: string | null;
  isFirstGift: boolean;
  isAnonymous: boolean;
  outreachPermission: OutreachPermission | null;
  majorGiftThreshold?: number;
  asOf: string;
}): TaskPlan | null => {
  // Someone who asked not to be contacted is never given a thank-you task.
  if (outreachPermission === 'DO_NOT_CONTACT') return null;
  if (status !== 'RECEIVED' && status !== 'PLEDGED') return null;
  if (!(amount > 0) || (!donorId && !companyId)) return null;

  const ageInDays = giftDate ? daysBetween(giftDate.slice(0, 10), asOf) : null;
  if (ageInDays !== null && ageInDays > THANK_YOU_MAX_AGE_DAYS) return null;

  const money = formatMoney(amount, currency);
  const verb = status === 'PLEDGED' ? 'pledge' : 'gift';
  const isMajor = amount >= majorGiftThreshold;

  const title = isMajor
    ? `Call to thank ${donorName} for ${money} ${verb}`
    : isFirstGift
      ? `Welcome and thank ${donorName} for first ${verb} (${money})`
      : `Thank ${donorName} for ${money} ${verb}`;

  const due = addDays(parseIsoDate(giftDate) ? (giftDate as string).slice(0, 10) : asOf, THANK_YOU_DUE_DAYS) ?? asOf;
  // A gift entered a few days late should not produce a task already overdue.
  const dueDate = (daysBetween(asOf, due) ?? 0) < 0 ? asOf : due;

  const notes = [
    isMajor
      ? `This gift is at or above your personal-thank-you amount (${formatMoney(majorGiftThreshold, currency)}). A call from a board member or the director lands better than a form letter.`
      : 'A prompt, personal thank-you is the single biggest factor in whether a donor gives again.',
    isFirstGift ? 'This is their first gift. Say welcome and tell them what it will do.' : '',
    isAnonymous ? 'This gift is anonymous. Do not list their name publicly.' : '',
    outreachPermission === 'NO_ASKS' ? 'They asked for thank-yous only. Do not include an ask.' : '',
  ].filter(Boolean);

  const dedupeKey = `compass:thank-you:${donationId}`;

  return {
    title,
    body: withKey(notes.join('\n'), dedupeKey),
    dueDate,
    dedupeKey,
    targetPersonId: donorId ?? undefined,
    targetCompanyId: companyId ?? undefined,
  };
};

export const planRenewalTask = ({
  personId,
  personName,
  lastGiftDate,
  lastGiftAmount,
  currency,
  outreachPermission,
  asOf,
}: {
  personId: string;
  personName: string;
  lastGiftDate: string;
  lastGiftAmount: number | null;
  currency: string;
  outreachPermission: OutreachPermission | null;
  asOf: string;
}): TaskPlan | null => {
  if (outreachPermission === 'DO_NOT_CONTACT') return null;

  const stewardshipOnly = outreachPermission === 'NO_ASKS';
  const lastGift =
    lastGiftAmount !== null ? ` (last gift ${formatMoney(lastGiftAmount, currency)} on ${lastGiftDate})` : ` (last gift on ${lastGiftDate})`;

  const dedupeKey = `compass:renewal:${personId}:${lastGiftDate}`;

  return {
    title: stewardshipOnly
      ? `Check in with ${personName}${lastGift}`
      : `Renewal check-in: ${personName}${lastGift}`,
    body: withKey(
      stewardshipOnly
        ? 'It has been a while since their last gift. They asked for no asks, so share an impact update and stay in touch.'
        : 'It has been about nine months since their last gift. Reach out with an impact update before asking again.',
      dedupeKey,
    ),
    dueDate: addDays(asOf, 7) ?? asOf,
    dedupeKey,
    targetPersonId: personId,
  };
};

export const planReportDueTask = ({
  grantId,
  grantName,
  funderId,
  nextReportDue,
  asOf,
  windowDays = REPORT_REMINDER_WINDOW_DAYS,
}: {
  grantId: string;
  grantName: string;
  funderId?: string | null;
  nextReportDue: string;
  asOf: string;
  windowDays?: number;
}): TaskPlan | null => {
  const daysUntil = daysBetween(asOf, nextReportDue);
  if (daysUntil === null || daysUntil > windowDays) return null;

  const dedupeKey = `compass:report-due:${grantId}:${nextReportDue}`;
  const overdue = daysUntil < 0;

  return {
    title: overdue
      ? `OVERDUE: report for ${grantName} was due ${nextReportDue}`
      : `Report due ${nextReportDue}: ${grantName}`,
    body: withKey(
      overdue
        ? 'This report is past due. Contact the funder if you need an extension, and send it as soon as you can.'
        : `Report is due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}. Update the KPI results on the grant, then use the Draft funder report command for a starting point.`,
      dedupeKey,
    ),
    dueDate: overdue ? asOf : addDays(nextReportDue, -3) ?? nextReportDue,
    dedupeKey,
    targetCompanyId: funderId ?? undefined,
  };
};

export const planBackgroundCheckTask = ({
  personId,
  personName,
  expiresOn,
  asOf,
  windowDays = BACKGROUND_CHECK_WINDOW_DAYS,
}: {
  personId: string;
  personName: string;
  expiresOn: string;
  asOf: string;
  windowDays?: number;
}): TaskPlan | null => {
  const daysUntil = daysBetween(asOf, expiresOn);
  if (daysUntil === null || daysUntil > windowDays) return null;

  const dedupeKey = `compass:background-check:${personId}:${expiresOn}`;

  return {
    title:
      daysUntil < 0
        ? `Background check expired ${expiresOn}: ${personName}`
        : `Background check expires ${expiresOn}: ${personName}`,
    body: withKey(
      'Renew the background check before this volunteer works with participants again.',
      dedupeKey,
    ),
    dueDate: daysUntil < 0 ? asOf : expiresOn,
    dedupeKey,
    targetPersonId: personId,
  };
};
