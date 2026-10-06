import { defineObject, FieldType, NumberDataType } from 'twenty-sdk/define';

import { type OptionSeed, buildOptions } from 'src/constants/enums';

// The SDK does not export its field manifest type, so it is read off defineObject.
export type ObjectField = NonNullable<Parameters<typeof defineObject>[0]['fields']>[number];

type CommonOptions = {
  description?: string;
  icon?: string;
  // Fields Compass fills in itself. They are hidden from manual editing and
  // kept out of the record timeline so nightly recalculations do not flood it.
  system?: boolean;
};

const common = ({ description, icon, system }: CommonOptions) => ({
  ...(description ? { description } : {}),
  ...(icon ? { icon } : {}),
  ...(system ? { isUIEditable: false, isAuditLogged: false } : {}),
});

export const textField = (
  universalIdentifier: string,
  name: string,
  label: string,
  options: CommonOptions = {},
): ObjectField => ({
  universalIdentifier,
  type: FieldType.TEXT,
  name,
  label,
  isNullable: true,
  icon: 'IconAbc',
  ...common(options),
});

// The label field of an object: required, never null, defaults to empty text.
export const nameField = (
  universalIdentifier: string,
  label: string,
  description?: string,
): ObjectField => ({
  universalIdentifier,
  type: FieldType.TEXT,
  name: 'name',
  label,
  isNullable: false,
  defaultValue: "''",
  icon: 'IconAbc',
  ...(description ? { description } : {}),
});

export const dateField = (
  universalIdentifier: string,
  name: string,
  label: string,
  options: CommonOptions = {},
): ObjectField => ({
  universalIdentifier,
  type: FieldType.DATE,
  name,
  label,
  isNullable: true,
  icon: 'IconCalendar',
  ...common(options),
});

export const dateTimeField = (
  universalIdentifier: string,
  name: string,
  label: string,
  options: CommonOptions = {},
): ObjectField => ({
  universalIdentifier,
  type: FieldType.DATE_TIME,
  name,
  label,
  isNullable: true,
  icon: 'IconClock',
  ...common(options),
});

export const currencyField = (
  universalIdentifier: string,
  name: string,
  label: string,
  options: CommonOptions = {},
): ObjectField => ({
  universalIdentifier,
  type: FieldType.CURRENCY,
  name,
  label,
  isNullable: true,
  icon: 'IconCurrencyDollar',
  ...common(options),
});

export const numberField = (
  universalIdentifier: string,
  name: string,
  label: string,
  options: CommonOptions & { decimals?: number; integer?: boolean; percentage?: boolean } = {},
): ObjectField => ({
  universalIdentifier,
  type: FieldType.NUMBER,
  name,
  label,
  isNullable: true,
  icon: 'IconHash',
  universalSettings: {
    dataType: options.integer ? NumberDataType.INT : NumberDataType.FLOAT,
    decimals: options.integer ? 0 : (options.decimals ?? 1),
    type: options.percentage ? 'percentage' : 'number',
  },
  ...common(options),
});

export const booleanField = (
  universalIdentifier: string,
  name: string,
  label: string,
  options: CommonOptions & { defaultValue?: boolean } = {},
): ObjectField => ({
  universalIdentifier,
  type: FieldType.BOOLEAN,
  name,
  label,
  defaultValue: options.defaultValue ?? false,
  icon: 'IconCheck',
  ...common(options),
});

export const selectField = <TValue extends string>(
  universalIdentifier: string,
  name: string,
  label: string,
  seeds: readonly OptionSeed<TValue>[],
  options: CommonOptions & { defaultValue?: TValue } = {},
): ObjectField => ({
  universalIdentifier,
  type: FieldType.SELECT,
  name,
  label,
  isNullable: true,
  icon: 'IconProgress',
  options: buildOptions(seeds),
  // Twenty wants literal text defaults wrapped in single quotes.
  ...(options.defaultValue ? { defaultValue: `'${options.defaultValue}'` } : {}),
  ...common(options),
});

export const multiSelectField = <TValue extends string>(
  universalIdentifier: string,
  name: string,
  label: string,
  seeds: readonly OptionSeed<TValue>[],
  options: CommonOptions = {},
): ObjectField => ({
  universalIdentifier,
  type: FieldType.MULTI_SELECT,
  name,
  label,
  isNullable: true,
  icon: 'IconTags',
  options: buildOptions(seeds),
  ...common(options),
});
