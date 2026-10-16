import { RISK_SEEDS, type OutreachPermission, type RiskLevel } from 'src/constants/enums';

// Compass shows AI text next to real records that a coordinator may have to
// defend to a funder. These checks run on whatever the model returns. They do
// not trust the prompt to behave: they verify the output.

export const AI_LABEL =
  'AI-generated from the records in Compass. Check the facts before you act on it.';

export const MAX_ASK_MULTIPLE_OF_LARGEST_GIFT = 5;

const NUMBER_TOKEN = /\$?\d[\d,]*(?:\.\d+)?%?/g;

const normalizeNumber = (token: string): string | null => {
  const parsed = Number(token.replace(/[$,%]/g, '').replace(/,/g, ''));

  return Number.isFinite(parsed) ? String(parsed) : null;
};

const isTooCommonToCheck = (normalized: string): boolean => {
  const value = Number(normalized);

  // Single digits ("3 programs") and calendar years are too common in prose to
  // be useful, and flagging them would train people to ignore the warning.
  return value < 10 || (Number.isInteger(value) && value >= 1900 && value <= 2100);
};

// Returns the figures that appear in `text` but nowhere in `evidence`. A figure
// the model computed itself (an average, a percentage) shows up here too, which
// is intended: a human should confirm anything not stated in the record.
export const findUngroundedNumbers = (text: string, evidence: string): string[] => {
  const known = new Set(
    (evidence.match(NUMBER_TOKEN) ?? [])
      .map(normalizeNumber)
      .filter((value): value is string => value !== null),
  );
  const seen = new Set<string>();
  const ungrounded: string[] = [];

  for (const token of text.match(NUMBER_TOKEN) ?? []) {
    const normalized = normalizeNumber(token);

    if (normalized === null || isTooCommonToCheck(normalized)) continue;
    if (known.has(normalized) || seen.has(normalized)) continue;

    seen.add(normalized);
    ungrounded.push(token.replace(/[.,]$/, ''));
  }

  return ungrounded;
};

// Pulls a JSON object out of a model reply. Models sometimes wrap JSON in a
// code fence or add a sentence before it; both are tolerated.
export const coerceToObject = (raw: unknown): Record<string, unknown> | null => {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw !== 'string') return null;

  const tryParse = (text: string): Record<string, unknown> | null => {
    try {
      const parsed: unknown = JSON.parse(text);

      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(raw.trim());
  if (direct) return direct;

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');

  return start !== -1 && end > start ? tryParse(raw.slice(start, end + 1)) : null;
};

const clean = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== 'string') return null;

  const trimmed = value.replace(/\s+\n/g, '\n').trim();
  if (trimmed.length === 0) return null;

  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1).trimEnd()}…` : trimmed;
};

const RISK_VALUES = RISK_SEEDS.map((seed) => seed.value) as readonly string[];

const ASK_WORDS = /\b(ask(?:ing)?|solicit\w*|request(?:ing)? (?:a|another|an)? ?(?:gift|donation|contribution)|upgrade|major gift|pledge)\b/i;

const SAFE_STEWARDSHIP_ACTION =
  'Send a thank-you or an impact update. This donor asked not to be asked for gifts.';

export type DonorInsight = {
  summary: string;
  nextBestAction: string;
  suggestedAsk: number | null;
  retentionRisk: RiskLevel | null;
  basis: string;
  warnings: string[];
};

export type InsightResult =
  | { ok: true; insight: DonorInsight }
  | { ok: false; reason: string };

export const parseDonorInsight = (
  raw: unknown,
  context: {
    outreachPermission: OutreachPermission | null;
    giftCount: number;
    largestGift: number | null;
    evidence: string;
  },
): InsightResult => {
  if (context.outreachPermission === 'DO_NOT_CONTACT') {
    return { ok: false, reason: 'This person asked not to be contacted, so no insight was stored.' };
  }

  const data = coerceToObject(raw);
  if (!data) return { ok: false, reason: 'The AI reply was not in the expected format.' };

  const summary = clean(data.summary, 500);
  let nextBestAction = clean(data.nextBestAction, 350);
  const basis = clean(data.basis, 600);
  const dataGaps = clean(data.dataGaps, 300);

  if (!summary || !nextBestAction) {
    return { ok: false, reason: 'The AI reply was missing a summary or a next action.' };
  }
  // An insight that cannot say which facts it rests on is not stored.
  if (!basis) {
    return { ok: false, reason: 'The AI reply did not say which records it was based on.' };
  }

  const warnings: string[] = [];

  const risk = typeof data.retentionRisk === 'string' ? data.retentionRisk.trim().toUpperCase() : '';
  const retentionRisk = RISK_VALUES.includes(risk) ? (risk as RiskLevel) : null;

  let suggestedAsk: number | null = null;
  const proposed = typeof data.suggestedAskAmount === 'number' ? data.suggestedAskAmount : Number(data.suggestedAskAmount);

  if (Number.isFinite(proposed) && proposed > 0) {
    if (context.outreachPermission === 'NO_ASKS') {
      warnings.push('A suggested ask was removed because this donor asked for thank-yous only.');
    } else if (context.giftCount === 0 || context.largestGift === null) {
      warnings.push('A suggested ask was removed because there is no giving history to base it on.');
    } else {
      const cap = context.largestGift * MAX_ASK_MULTIPLE_OF_LARGEST_GIFT;

      suggestedAsk = Math.round(Math.min(proposed, cap));
      if (proposed > cap) {
        warnings.push(`The suggested ask was lowered to ${MAX_ASK_MULTIPLE_OF_LARGEST_GIFT} times their largest gift.`);
      }
    }
  }

  if (context.outreachPermission === 'NO_ASKS' && ASK_WORDS.test(nextBestAction)) {
    nextBestAction = SAFE_STEWARDSHIP_ACTION;
    warnings.push('The suggested action was replaced because it sounded like an ask and this donor asked for thank-yous only.');
  }

  const ungrounded = findUngroundedNumbers(`${summary} ${nextBestAction} ${basis}`, context.evidence);
  if (ungrounded.length > 0) {
    warnings.push(`These figures were not found in the record, so check them: ${ungrounded.join(', ')}.`);
  }
  if (dataGaps) warnings.push(`Missing information: ${dataGaps}`);

  return {
    ok: true,
    insight: { summary, nextBestAction, suggestedAsk, retentionRisk, basis, warnings },
  };
};

// What is stored in the single "AI basis" field: the evidence, every warning,
// and the label that tells the reader this was written by a model.
export const formatInsightBasis = (insight: DonorInsight): string =>
  [
    `Based on: ${insight.basis}`,
    ...insight.warnings.map((warning) => `Check: ${warning}`),
    AI_LABEL,
  ].join('\n');

export type ReportResult =
  | { ok: true; text: string }
  | { ok: false; reason: string };

export const parseGrantReport = (raw: unknown, evidence: string): ReportResult => {
  const data = coerceToObject(raw);
  const draft = clean(data?.draft ?? (typeof raw === 'string' && !data ? raw : null), 8000);

  if (!draft) return { ok: false, reason: 'The AI reply did not contain a report draft.' };

  const dataGaps = clean(data?.dataGaps, 600);
  const ungrounded = findUngroundedNumbers(draft, evidence);
  const checks = [
    ungrounded.length > 0
      ? `Figures not found in your records (confirm or remove): ${ungrounded.join(', ')}`
      : null,
    dataGaps ? `Information the draft needed but did not have: ${dataGaps}` : null,
  ].filter((line): line is string => line !== null);

  return {
    ok: true,
    text: [
      `DRAFT. ${AI_LABEL} Check every figure before it goes to a funder.`,
      '',
      draft,
      ...(checks.length > 0 ? ['', '---', 'Check before sending:', ...checks.map((line) => `- ${line}`)] : []),
    ].join('\n'),
  };
};
