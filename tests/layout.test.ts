// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('layout regression: the page must not scroll sideways', () => {
  const css = readFileSync('index.css', 'utf8');
  it('keeps the app-shell rule in the base layer so it can never override Tailwind\'s `fixed` sidebar', () => {
    // Tailwind v4 puts utilities in a layer; an unlayered rule beats them. This once turned the fixed sidebar
    // into an in-flow one, doubling its width and making the page scroll sideways at 980px.
    const rule = /\.compass-canvas\s*>\s*\*\s*\{[^}]*position:\s*relative/;
    const match = rule.exec(css);
    expect(match).not.toBeNull();
    const before = css.slice(0, match!.index);
    const lastOpen = before.lastIndexOf('@layer base');
    expect(lastOpen).toBeGreaterThan(-1);
    // the layer block that opened must still be open at the rule (count braces after the opener)
    const between = before.slice(lastOpen);
    const opens = (between.match(/\{/g) || []).length;
    const closes = (between.match(/\}/g) || []).length;
    expect(opens - closes).toBeGreaterThan(0);
  });
});
