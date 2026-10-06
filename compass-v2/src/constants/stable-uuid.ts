// Twenty identifies every object, field and view by a UUID that must never
// change once the app is installed. Hand-pasting hundreds of UUIDs is error
// prone, so each one is derived from a readable name instead. The name is the
// permanent key: renaming a seed string would orphan the data stored under it.
//
// The mixing function is cyrb128 (public domain, by bryc). It is not a
// cryptographic hash, which is fine here: the IDs are labels, not secrets.
const mixToFourWords = (seed: string): [number, number, number, number] => {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;

  for (let index = 0; index < seed.length; index++) {
    const code = seed.charCodeAt(index);

    h1 = h2 ^ Math.imul(h1 ^ code, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ code, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ code, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ code, 2716044179);
  }

  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);

  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;

  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
};

const toHex = (word: number): string => word.toString(16).padStart(8, '0');

// Always returns a well-formed UUID v4 (version nibble 4, variant 8 to b).
export const stableUuid = (seed: string): string => {
  const hex = mixToFourWords(`nomad-compass:${seed}`).map(toHex).join('');
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),`4${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
};
