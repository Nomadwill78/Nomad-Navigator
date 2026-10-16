import {
  DONATION_STATUS_SEEDS,
  GIFT_TYPE_SEEDS,
  PAYMENT_METHOD_SEEDS,
} from 'src/constants/enums';
import { parseIsoDate } from 'src/lib/dates';
import { DEFAULT_CURRENCY } from 'src/lib/money';

import { money } from 'src/services/mappers';
import { COLLECTION, createRecord, fetchAll, type GraphqlClient } from 'src/services/repo';

// Lets another system (Zapier, a payment processor, a website form) record a
// gift in Compass. Everything it receives is untrusted, so it is checked field
// by field before anything is written, and a repeated reference number never
// creates a second gift.

export type InboundDonation = {
  email?: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  amount: number;
  currency: string;
  giftDate: string;
  status: string;
  giftType: string;
  paymentMethod?: string;
  referenceNumber?: string;
  campaignName?: string;
  designation?: string;
  isAnonymous: boolean;
};

export type Validation =
  | { ok: true; value: InboundDonation }
  | { ok: false; errors: string[] };

const MAX_AMOUNT = 10_000_000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const optionalText = (value: unknown, field: string, maxLength: number, errors: string[]): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;

  if (typeof value !== 'string') {
    errors.push(`${field} must be text.`);

    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) errors.push(`${field} is too long (maximum ${maxLength} characters).`);

  return trimmed || undefined;
};

const oneOf = (value: unknown, allowed: readonly { value: string }[], fallback: string | undefined, field: string, errors: string[]) => {
  if (value === undefined || value === null || value === '') return fallback;

  const text = String(value).trim().toUpperCase();

  if (allowed.some((option) => option.value === text)) return text;

  errors.push(`${field} must be one of: ${allowed.map((option) => option.value).join(', ')}.`);

  return fallback;
};

export const validateInboundDonation = (body: unknown, today: string): Validation => {
  const errors: string[] = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['Send a JSON object describing the gift.'] };
  }

  const input = body as Record<string, unknown>;

  const amount = typeof input.amount === 'string' ? Number(input.amount) : input.amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    errors.push('amount must be a number greater than 0.');
  } else if (amount > MAX_AMOUNT) {
    errors.push(`amount is larger than the allowed maximum of ${MAX_AMOUNT.toLocaleString('en-US')}.`);
  }

  const email = optionalText(input.email, 'email', 200, errors)?.toLowerCase();
  if (email && !EMAIL.test(email)) errors.push('email does not look like an email address.');

  const organizationName = optionalText(input.organizationName, 'organizationName', 200, errors);
  const firstName = optionalText(input.firstName, 'firstName', 100, errors);
  const lastName = optionalText(input.lastName, 'lastName', 100, errors);

  if (!email && !organizationName) {
    errors.push('Say who gave: send an email (for a person) or an organizationName.');
  }
  if (email && organizationName) {
    errors.push('Send either an email or an organizationName, not both.');
  }

  const rawDate = input.giftDate === undefined || input.giftDate === '' ? today : input.giftDate;
  const giftDate = typeof rawDate === 'string' && parseIsoDate(rawDate) ? rawDate.slice(0, 10) : null;
  if (!giftDate) errors.push('giftDate must be a real date like 2026-10-06.');

  const currencyInput = optionalText(input.currency, 'currency', 3, errors)?.toUpperCase() ?? DEFAULT_CURRENCY;
  if (!/^[A-Z]{3}$/.test(currencyInput)) errors.push('currency must be a 3-letter code like USD.');

  const status = oneOf(input.status, DONATION_STATUS_SEEDS, 'RECEIVED', 'status', errors);
  const giftType = oneOf(input.giftType, GIFT_TYPE_SEEDS, 'ONE_TIME', 'giftType', errors);
  const paymentMethod = oneOf(input.paymentMethod, PAYMENT_METHOD_SEEDS, undefined, 'paymentMethod', errors);

  const referenceNumber = optionalText(input.referenceNumber, 'referenceNumber', 120, errors);
  const campaignName = optionalText(input.campaignName, 'campaignName', 200, errors);
  const designation = optionalText(input.designation, 'designation', 200, errors);

  if (input.isAnonymous !== undefined && typeof input.isAnonymous !== 'boolean') {
    errors.push('isAnonymous must be true or false.');
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      email,
      firstName,
      lastName,
      organizationName,
      amount: amount as number,
      currency: currencyInput,
      giftDate: giftDate as string,
      status: status as string,
      giftType: giftType as string,
      paymentMethod,
      referenceNumber,
      campaignName,
      designation,
      isAnonymous: input.isAnonymous === true,
    },
  };
};

export type RecordedDonation = {
  status: 'created' | 'duplicate';
  donationId: string;
  personId?: string;
  companyId?: string;
};

const findOne = async (client: GraphqlClient, collection: (typeof COLLECTION)[keyof typeof COLLECTION], filter: Record<string, unknown>) =>
  (await fetchAll(client, collection, {}, filter, 1)).records[0] ?? null;

export const recordDonation = async (client: GraphqlClient, donation: InboundDonation): Promise<RecordedDonation> => {
  if (donation.referenceNumber) {
    const existing = await findOne(client, COLLECTION.donation, { referenceNumber: { eq: donation.referenceNumber } });

    if (existing) {
      return {
        status: 'duplicate',
        donationId: existing.id,
        personId: existing.donorId ?? undefined,
        companyId: existing.organizationDonorId ?? undefined,
      };
    }
  }

  let personId: string | undefined;
  let companyId: string | undefined;

  if (donation.email) {
    const person =
      (await findOne(client, COLLECTION.person, { emails: { primaryEmail: { eq: donation.email } } })) ??
      null;

    personId =
      person?.id ??
      (
        await createRecord(client, COLLECTION.person, {
          name: { firstName: donation.firstName ?? '', lastName: donation.lastName ?? '' },
          emails: { primaryEmail: donation.email },
          contactTypes: ['DONOR'],
        })
      ).id;
  } else if (donation.organizationName) {
    const company = await findOne(client, COLLECTION.company, { name: { eq: donation.organizationName } });

    companyId = company?.id ?? (await createRecord(client, COLLECTION.company, { name: donation.organizationName })).id;
  }

  const campaign = donation.campaignName
    ? await findOne(client, COLLECTION.fundraisingCampaign, { name: { eq: donation.campaignName } })
    : null;

  const created = await createRecord(client, COLLECTION.donation, {
    // Left empty on purpose: Compass names the gift after the donor and amount.
    name: '',
    status: donation.status,
    giftType: donation.giftType,
    amount: money(donation.amount, donation.currency),
    giftDate: donation.giftDate,
    ...(donation.paymentMethod ? { paymentMethod: donation.paymentMethod } : {}),
    ...(donation.designation ? { designation: donation.designation } : {}),
    ...(donation.referenceNumber ? { referenceNumber: donation.referenceNumber } : {}),
    isAnonymous: donation.isAnonymous,
    ...(personId ? { donorId: personId } : {}),
    ...(companyId ? { organizationDonorId: companyId } : {}),
    ...(campaign ? { campaignId: campaign.id } : {}),
  });

  return { status: 'created', donationId: created.id, personId, companyId };
};
