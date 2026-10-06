import { describe, expect, it } from 'vitest';

import {
  AI_LABEL,
  coerceToObject,
  findUngroundedNumbers,
  formatInsightBasis,
  parseDonorInsight,
  parseGrantReport,
} from 'src/lib/ai-guardrails';

describe('findUngroundedNumbers', () => {
  const evidence = 'Cash giving: $2,450 across 7 gifts. Largest gift: $1,000. Last gift: 2026-01-15 of $250 (264 days ago).';

  it('accepts figures that appear in the record, in any format', () => {
    expect(findUngroundedNumbers('They have given $2,450 and a $1000 gift, last on 2026-01-15, $250.00.', evidence)).toEqual([]);
  });

  it('flags figures the model invented or computed itself', () => {
    expect(findUngroundedNumbers('Their giving grew 35% to $3,100.', evidence)).toEqual(['35%', '$3,100']);
  });

  it('ignores small counts and calendar years', () => {
    expect(findUngroundedNumbers('They gave 3 times since 2019, 5 in total.', evidence)).toEqual([]);
  });

  it('reports each unsupported figure once', () => {
    expect(findUngroundedNumbers('$9,999 and again $9,999', evidence)).toEqual(['$9,999']);
  });
});

describe('coerceToObject', () => {
  it('passes objects through and parses JSON strings', () => {
    expect(coerceToObject({ a: 1 })).toEqual({ a: 1 });
    expect(coerceToObject('{"a":1}')).toEqual({ a: 1 });
  });

  it('copes with code fences and chatter around the JSON', () => {
    expect(coerceToObject('Here you go:\n```json\n{"a": 2}\n```')).toEqual({ a: 2 });
  });

  it('returns null for anything else', () => {
    for (const value of ['no json here', '[1,2]', 42, null, undefined, '{broken']) {
      expect(coerceToObject(value)).toBeNull();
    }
  });
});

describe('parseDonorInsight', () => {
  const evidence = 'Cash giving: $2,450 across 7 gifts. Largest gift: $1,000. Last gift: 2026-01-15 of $250.';
  const context = { outreachPermission: 'OK_TO_CONTACT' as const, giftCount: 7, largestGift: 1000, evidence };
  const good = {
    summary: 'Steady supporter whose last gift of $250 was in January.',
    nextBestAction: 'Send an impact update, then invite them to renew.',
    suggestedAskAmount: 500,
    retentionRisk: 'medium',
    basis: '7 gifts totalling $2,450 and no gift since 2026-01-15.',
    dataGaps: '',
  };

  it('accepts a well-formed, grounded insight', () => {
    const result = parseDonorInsight(good, context);

    expect(result).toMatchObject({
      ok: true,
      insight: { suggestedAsk: 500, retentionRisk: 'MEDIUM', warnings: [] },
    });
  });

  it('refuses to store an insight that does not say what it is based on', () => {
    expect(parseDonorInsight({ ...good, basis: '   ' }, context)).toMatchObject({ ok: false });
  });

  it('rejects malformed replies', () => {
    expect(parseDonorInsight('I cannot help with that.', context)).toMatchObject({ ok: false });
    expect(parseDonorInsight({ summary: 'x' }, context)).toMatchObject({ ok: false });
  });

  it('never stores anything for a do-not-contact donor', () => {
    expect(parseDonorInsight(good, { ...context, outreachPermission: 'DO_NOT_CONTACT' })).toMatchObject({ ok: false });
  });

  it('caps an unreasonable ask at five times the largest gift and says so', () => {
    const result = parseDonorInsight({ ...good, suggestedAskAmount: 250000 }, context);

    expect(result.ok && result.insight.suggestedAsk).toBe(5000);
    expect(result.ok && result.insight.warnings.join(' ')).toContain('lowered');
  });

  it('drops an ask when there is no giving history to base it on', () => {
    const result = parseDonorInsight(good, { ...context, giftCount: 0, largestGift: null });

    expect(result.ok && result.insight.suggestedAsk).toBeNull();
  });

  it('removes asks and ask language for donors who want thank-yous only', () => {
    const result = parseDonorInsight(
      { ...good, nextBestAction: 'Ask them to upgrade to a $1,000 gift.' },
      { ...context, outreachPermission: 'NO_ASKS' },
    );

    expect(result.ok && result.insight.suggestedAsk).toBeNull();
    expect(result.ok && result.insight.nextBestAction).toContain('asked not to be asked');
  });

  it('warns about figures that are not in the record', () => {
    const result = parseDonorInsight({ ...good, summary: 'Gave $7,800 last year.' }, context);

    expect(result.ok && result.insight.warnings.join(' ')).toContain('$7,800');
  });

  it('ignores an invalid risk level instead of guessing', () => {
    const result = parseDonorInsight({ ...good, retentionRisk: 'catastrophic' }, context);

    expect(result.ok && result.insight.retentionRisk).toBeNull();
  });

  it('truncates very long text', () => {
    const result = parseDonorInsight({ ...good, summary: 'a'.repeat(5000) }, context);

    expect(result.ok && result.insight.summary.length).toBeLessThanOrEqual(500);
  });

  it('labels stored output as AI-written and lists every check', () => {
    const result = parseDonorInsight({ ...good, summary: 'Gave $7,800.' }, context);
    const text = result.ok ? formatInsightBasis(result.insight) : '';

    expect(text).toContain('Based on:');
    expect(text).toContain('Check:');
    expect(text).toContain(AI_LABEL);
  });
});

describe('parseGrantReport', () => {
  const evidence = 'Award: $50,000. Spent so far: $20,000 (40% of the award). Households: 310 of 400 (77.5%).';

  it('wraps a grounded draft with the AI label and no checks', () => {
    const result = parseGrantReport({ draft: 'We served 310 households, 77.5% of our goal of 400.', dataGaps: '' }, evidence);

    expect(result.ok && result.text).toContain(AI_LABEL);
    expect(result.ok && result.text).not.toContain('Check before sending');
  });

  it('lists figures that are not in the records', () => {
    const result = parseGrantReport({ draft: 'We served 1,200 households.' }, evidence);

    expect(result.ok && result.text).toContain('Figures not found in your records');
    expect(result.ok && result.text).toContain('1,200');
  });

  it('passes on data gaps the model reported', () => {
    const result = parseGrantReport({ draft: 'Progress was good.', dataGaps: 'No outcome measures.' }, evidence);

    expect(result.ok && result.text).toContain('No outcome measures.');
  });

  it('accepts a plain-text reply and rejects an empty one', () => {
    expect(parseGrantReport('Plain text draft with 310 households.', evidence)).toMatchObject({ ok: true });
    expect(parseGrantReport({ draft: '' }, evidence)).toMatchObject({ ok: false });
    expect(parseGrantReport(null, evidence)).toMatchObject({ ok: false });
  });
});
