import { type GivingStatus } from 'src/constants/enums';
import { daysBetween, monthsBetween, parseIsoDate } from 'src/lib/dates';
import { DEFAULT_CURRENCY, roundTo } from 'src/lib/money';

// When a donor moves from one giving status to the next, measured in whole
// months since their last gift. These are common nonprofit rules of thumb, not
// laws: a donor who gives once a year is flagged At risk after nine months,
// which is the window to ask again before they lapse. Change them here if your
// giving cycle is different.
export const AT_RISK_AFTER_MONTHS = 9;
// One month of grace past the 12-month mark so an annual donor is not called
// lapsed on the very day their gift is due.
export const LAPSED_AFTER_MONTHS = 13;
export const INACTIVE_AFTER_MONTHS = 25;
export const NEW_DONOR_WINDOW_MONTHS = 12;

export type DonationRow = {
  id: string;
  amountUnits: number | null;
  currency: string;
  giftDate: string | null;
  status: string | null;
  giftType: string | null;
  donorId?: string | null;
  companyId?: string | null;
  campaignId?: string | null;
  grantId?: string | null;
};

const sameCurrency = (row: DonationRow, currency: string): boolean =>
  row.currency.toUpperCase() === currency.toUpperCase();

const hasPositiveAmount = (row: DonationRow): boolean =>
  row.amountUnits !== null && row.amountUnits > 0;

// Money in the bank: received, cash-equivalent, positive, in the reporting
// currency. In-kind gifts are recorded but never added to cash totals, and
// pledges only count once they are received, so no total is inflated.
export const isCashReceived = (row: DonationRow, currency: string): boolean =>
  row.status === 'RECEIVED' &&
  row.giftType !== 'IN_KIND' &&
  hasPositiveAmount(row) &&
  sameCurrency(row, currency);

export const isCashPledged = (row: DonationRow, currency: string): boolean =>
  row.status === 'PLEDGED' &&
  row.giftType !== 'IN_KIND' &&
  hasPositiveAmount(row) &&
  sameCurrency(row, currency);

export const resolveGivingStatus = ({
  giftCount,
  firstGiftDate,
  lastGiftDate,
  asOf,
}: {
  giftCount: number;
  firstGiftDate: string | null;
  lastGiftDate: string | null;
  asOf: string;
}): GivingStatus | null => {
  if (giftCount === 0) return 'PROSPECT';
  if (!lastGiftDate) return null;

  const monthsSinceLast = monthsBetween(lastGiftDate, asOf);
  if (monthsSinceLast === null) return null;

  if (monthsSinceLast >= INACTIVE_AFTER_MONTHS) return 'INACTIVE';
  if (monthsSinceLast >= LAPSED_AFTER_MONTHS) return 'LAPSED';
  if (monthsSinceLast >= AT_RISK_AFTER_MONTHS) return 'AT_RISK';

  const monthsSinceFirst = firstGiftDate ? monthsBetween(firstGiftDate, asOf) : null;
  const isNew = monthsSinceFirst !== null && monthsSinceFirst < NEW_DONOR_WINDOW_MONTHS;

  return isNew ? 'NEW' : 'ACTIVE';
};

export type DonorGivingSummary = {
  lifetimeGiving: number;
  giftCount: number;
  firstGiftDate: string | null;
  lastGiftDate: string | null;
  lastGiftAmount: number | null;
  largestGift: number | null;
  givingStatus: GivingStatus | null;
  // Received gifts that could not be counted (other currency, bad amount).
  // Surfaced so a total is never silently lower than the records suggest.
  skippedGiftCount: number;
};

export const summarizeDonorGiving = (
  rows: readonly DonationRow[],
  asOf: string,
  currency: string = DEFAULT_CURRENCY,
): DonorGivingSummary => {
  const received = rows.filter(
    (row) => row.status === 'RECEIVED' && row.giftType !== 'IN_KIND',
  );
  const counted = received.filter((row) => isCashReceived(row, currency));

  const dated = counted
    .filter((row) => parseIsoDate(row.giftDate))
    .sort(
      (a, b) =>
        (daysBetween(b.giftDate as string, a.giftDate as string) ?? 0) ||
        a.id.localeCompare(b.id),
    );

  const firstGift = dated[0] ?? null;
  const lastGift = dated[dated.length - 1] ?? null;
  const amounts = counted.map((row) => row.amountUnits as number);

  const summary = {
    lifetimeGiving: roundTo(amounts.reduce((sum, amount) => sum + amount, 0), 2),
    giftCount: counted.length,
    firstGiftDate: firstGift?.giftDate?.slice(0, 10) ?? null,
    lastGiftDate: lastGift?.giftDate?.slice(0, 10) ?? null,
    lastGiftAmount: lastGift?.amountUnits ?? null,
    largestGift: amounts.length > 0 ? Math.max(...amounts) : null,
    skippedGiftCount: received.length - counted.length,
  };

  return {
    ...summary,
    givingStatus: resolveGivingStatus({
      giftCount: summary.giftCount,
      firstGiftDate: summary.firstGiftDate,
      lastGiftDate: summary.lastGiftDate,
      asOf,
    }),
  };
};

export type FundingSummary = {
  receivedAmount: number;
  pledgedAmount: number;
  giftCount: number;
  contributorCount: number;
};

// Used for campaigns, grants and organizations: what has actually arrived, what
// is promised but not yet received, and how many distinct people or
// organizations stand behind it.
export const summarizeFunding = (
  rows: readonly DonationRow[],
  currency: string = DEFAULT_CURRENCY,
): FundingSummary => {
  const received = rows.filter((row) => isCashReceived(row, currency));
  const pledged = rows.filter((row) => isCashPledged(row, currency));
  const sum = (list: readonly DonationRow[]) =>
    roundTo(list.reduce((total, row) => total + (row.amountUnits ?? 0), 0), 2);

  const contributors = new Set(
    received
      .map((row) => row.donorId ?? row.companyId)
      .filter((id): id is string => Boolean(id)),
  );

  return {
    receivedAmount: sum(received),
    pledgedAmount: sum(pledged),
    giftCount: received.length,
    contributorCount: contributors.size,
  };
};

export const percentOfGoal = (raised: number, goal: unknown): number | null => {
  const goalUnits = typeof goal === 'number' ? goal : Number(goal);

  if (!Number.isFinite(goalUnits) || goalUnits <= 0) return null;

  return roundTo((raised / goalUnits) * 100, 1);
};
