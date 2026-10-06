import { describe, expect, it } from 'vitest';

import { stableUuid } from 'src/constants/stable-uuid';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('stableUuid', () => {
  it('always returns a well-formed UUID v4', () => {
    for (const seed of ['application', 'object:grant', 'field:person:lifetimeGiving', '', 'é💡']) {
      expect(stableUuid(seed)).toMatch(UUID_V4);
    }
  });

  it('is deterministic and distinct per seed', () => {
    expect(stableUuid('object:donation')).toBe(stableUuid('object:donation'));
    expect(stableUuid('object:donation')).not.toBe(stableUuid('object:donations'));
  });

  // These identifiers are stored in every installed workspace. If this test
  // fails, an ID changed, and an upgrade would create duplicate objects and
  // orphan donor data. Do not "fix" it by updating the expected values.
  it('has not changed for the identifiers already in use', () => {
    expect(stableUuid('application')).toBe('a227b587-548c-48b7-a820-ad40b5fa61e9');
    expect(stableUuid('role:default')).toBe('c4f85a61-66a3-43b2-90f4-dfafdd374f72');
  });

  it('does not collide across a realistic number of identifiers', () => {
    const ids = new Set<string>();

    for (let index = 0; index < 5000; index++) ids.add(stableUuid(`field:object${index % 40}:name${index}`));

    expect(ids.size).toBe(5000);
  });
});
