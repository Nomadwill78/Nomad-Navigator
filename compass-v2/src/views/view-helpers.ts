import { stableUuid } from 'src/constants/stable-uuid';
import { type OptionSeed } from 'src/constants/enums';

// Columns for a saved view. Each column needs its own permanent ID, derived from
// the view and the field so it never has to be written out by hand.
export const columns = (
  viewKey: string,
  fields: readonly (readonly [fieldUniversalIdentifier: string, size?: number])[],
) =>
  fields.map(([fieldMetadataUniversalIdentifier, size], position) => ({
    universalIdentifier: stableUuid(`view:${viewKey}:column:${fieldMetadataUniversalIdentifier}`),
    fieldMetadataUniversalIdentifier,
    position,
    isVisible: true,
    size: size ?? 160,
  }));

export const filterId = (viewKey: string, index: number): string =>
  stableUuid(`view:${viewKey}:filter:${index}`);

export const sortId = (viewKey: string, index: number): string =>
  stableUuid(`view:${viewKey}:sort:${index}`);

// One board column per dropdown choice, in the dropdown's order.
export const boardGroups = (viewKey: string, seeds: readonly OptionSeed<string>[]) =>
  seeds.map((seed, position) => ({
    universalIdentifier: stableUuid(`view:${viewKey}:group:${seed.value}`),
    fieldValue: seed.value,
    position,
    isVisible: true,
  }));
