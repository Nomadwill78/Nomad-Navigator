import { defineObject } from 'twenty-sdk/define';

import {
  DONATION_STATUS_SEEDS,
  GIFT_TYPE_SEEDS,
  PAYMENT_METHOD_SEEDS,
} from 'src/constants/enums';
import { DONATION_FIELD, OBJECT_ID } from 'src/constants/universal-identifiers';
import {
  booleanField,
  currencyField,
  dateField,
  selectField,
  textField,
  nameField,
} from 'src/objects/field-helpers';

export default defineObject({
  universalIdentifier: OBJECT_ID.donation,
  nameSingular: 'donation',
  namePlural: 'donations',
  labelSingular: 'Donation',
  labelPlural: 'Donations',
  description:
    'One gift or pledge from a person or organization. Donor totals, giving status, campaign totals and thank-you reminders are all calculated from these.',
  icon: 'IconHeartHandshake',
  labelIdentifierFieldMetadataUniversalIdentifier: DONATION_FIELD.name,
  fields: [
    nameField(DONATION_FIELD.name, 'Donation', 'A short label, for example: Lopez, Spring Appeal, 2026-05-02. Compass fills this in if you leave it empty.'),
    selectField(DONATION_FIELD.status, 'status', 'Status', DONATION_STATUS_SEEDS, {
      defaultValue: 'RECEIVED',
      description: 'Only Received gifts count toward totals. Pledged gifts are tracked but not counted until they arrive.',
    }),
    selectField(DONATION_FIELD.giftType, 'giftType', 'Gift type', GIFT_TYPE_SEEDS, {
      defaultValue: 'ONE_TIME',
      icon: 'IconGift',
      description: 'In-kind gifts (goods or services) are recorded but never added to cash totals.',
    }),
    currencyField(DONATION_FIELD.amount, 'amount', 'Amount', {
      description: 'Totals are calculated in US dollars. Gifts in another currency are recorded but not added to totals.',
    }),
    dateField(DONATION_FIELD.giftDate, 'giftDate', 'Gift date', {
      description: 'The date the gift was made or received.',
      icon: 'IconCalendarEvent',
    }),
    selectField(DONATION_FIELD.paymentMethod, 'paymentMethod', 'Payment method', PAYMENT_METHOD_SEEDS, {
      icon: 'IconCreditCard',
    }),
    textField(DONATION_FIELD.designation, 'designation', 'Designation', {
      description: 'Which fund or program the donor asked it to support, if any.',
      icon: 'IconBookmark',
    }),
    booleanField(DONATION_FIELD.isAnonymous, 'isAnonymous', 'Anonymous gift', {
      description: 'Do not publish the donor\'s name.',
      icon: 'IconMask',
    }),
    textField(DONATION_FIELD.referenceNumber, 'referenceNumber', 'Reference number', {
      description: 'Check number or payment processor ID. Used to avoid recording the same gift twice.',
      icon: 'IconHash',
    }),
    booleanField(DONATION_FIELD.acknowledged, 'acknowledged', 'Thanked', {
      description: 'Tick this once the donor has been thanked.',
      icon: 'IconMailHeart',
    }),
    dateField(DONATION_FIELD.acknowledgedOn, 'acknowledgedOn', 'Thanked on'),
    booleanField(DONATION_FIELD.thankYouTaskCreated, 'thankYouTaskCreated', 'Thank-you task created', {
      description: 'Set by Compass after it creates the thank-you reminder, so it is never created twice.',
      system: true,
    }),
  ],
});
