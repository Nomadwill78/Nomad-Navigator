import { type DonationRow } from 'src/lib/donations';
import { DEFAULT_CURRENCY, currencyCodeOf, microsToUnits, toNumber, unitsToCurrencyValue } from 'src/lib/money';

import { type RecordNode, type Selection } from 'src/services/repo';

// What to ask Twenty for, per record type. Keeping the field lists here means a
// renamed field is changed in one place.
export const DONATION_SELECTION: Selection = {
  name: true,
  status: true,
  giftType: true,
  amount: { amountMicros: true, currencyCode: true },
  giftDate: true,
  isAnonymous: true,
  referenceNumber: true,
  thankYouTaskCreated: true,
  donorId: true,
  organizationDonorId: true,
  campaignId: true,
  grantId: true,
};

export const toDonationRow = (node: RecordNode): DonationRow => ({
  id: node.id,
  amountUnits: microsToUnits(node.amount),
  currency: currencyCodeOf(node.amount),
  giftDate: typeof node.giftDate === 'string' ? node.giftDate.slice(0, 10) : null,
  status: node.status ?? null,
  giftType: node.giftType ?? null,
  donorId: node.donorId ?? null,
  companyId: node.organizationDonorId ?? null,
  campaignId: node.campaignId ?? null,
  grantId: node.grantId ?? null,
});

export const money = (units: number | null, currency: string = DEFAULT_CURRENCY) =>
  units === null ? null : unitsToCurrencyValue(units, currency);

// Reads a stored currency field back as comparable units, so "is it different?"
// checks compare cents rather than whole objects.
export const unitsOf = (value: unknown): number | null =>
  microsToUnits(value as { amountMicros?: number | string | null } | null);

export const numberOf = (value: unknown): number | null => toNumber(value);

export const dateOnly = (value: unknown): string | null =>
  typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : null;

export const fullName = (node: RecordNode): string => {
  const first = node.name?.firstName?.trim() ?? '';
  const last = node.name?.lastName?.trim() ?? '';
  const combined = `${first} ${last}`.trim();

  return combined || 'this donor';
};
