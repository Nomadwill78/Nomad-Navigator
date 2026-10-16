import { parseIsoDate } from 'src/lib/dates';
import { toNumber } from 'src/lib/money';

import { money } from 'src/services/mappers';
import { COLLECTION, createRecord, fetchAll, type GraphqlClient } from 'src/services/repo';

// Brings grants over from Nomad Compass v1. v1 can export its grants and its
// metrics as JSON files; this reads those. It is careful in three ways:
//   * It never guesses silently. Anything it had to interpret is reported.
//   * It can be run again safely: grants and results that already exist are
//     skipped, not duplicated.
//   * "dryRun" checks everything and reports what would happen without writing.

export type V1Kpi = { name: string; target: number; current: number; unit: string };
export type V1Subgrantee = { name: string; allocatedAmount: number; status: string; kpis: V1Kpi[] };
export type V1Grant = {
  name: string;
  funder: string;
  amount: number;
  spentAmount?: number;
  startDate: string;
  endDate: string;
  status: string;
  kpis: V1Kpi[];
  subgrantees: V1Subgrantee[];
};
export type V1Program = { month: string; peopleServed: number; totalCost: number };

export type V1Payload = {
  grants?: unknown;
  programs?: unknown;
  // v1 stored months as "Jan", "Feb" with no year. This supplies it.
  year?: unknown;
  dryRun?: unknown;
};

export type ParsedV1 = {
  grants: V1Grant[];
  programs: V1Program[];
  year: number;
  dryRun: boolean;
  problems: string[];
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MAX_ITEMS = 500;

export const V1_STATUS: Record<string, string> = {
  active: 'ACTIVE',
  // v1's "pending" is what a new grant starts as. It could mean an application
  // or an award that has not started, so the import flags every one for review.
  pending: 'PENDING',
  completed: 'COMPLETED',
};

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const cleanDate = (value: unknown): string | null => (typeof value === 'string' && parseIsoDate(value) ? value.slice(0, 10) : null);

const parseKpis = (value: unknown, context: string, problems: string[]): V1Kpi[] => {
  if (!Array.isArray(value)) return [];

  return value.slice(0, MAX_ITEMS).flatMap((raw, index) => {
    const kpi = (raw ?? {}) as Record<string, unknown>;
    const name = text(kpi.name);
    const target = toNumber(kpi.target);
    const current = toNumber(kpi.current);

    if (!name) {
      problems.push(`${context}: KPI ${index + 1} has no name and was skipped.`);

      return [];
    }

    return [{ name, unit: text(kpi.unit), target: target ?? 0, current: current ?? 0 }];
  });
};

export const parseV1Payload = (body: unknown, thisYear: number): ParsedV1 => {
  const problems: string[] = [];
  const input = (body && typeof body === 'object' ? body : {}) as V1Payload;
  const year = typeof input.year === 'number' && input.year >= 1990 && input.year <= 2100 ? Math.floor(input.year) : thisYear;

  const grants: V1Grant[] = [];

  for (const [index, raw] of (Array.isArray(input.grants) ? input.grants : []).slice(0, MAX_ITEMS).entries()) {
    const grant = (raw ?? {}) as Record<string, unknown>;
    const name = text(grant.name);
    const funder = text(grant.funder);
    const label = name || `Grant ${index + 1}`;

    if (!name || !funder) {
      problems.push(`${label}: needs both a name and a funder, so it was skipped.`);
      continue;
    }

    const amount = toNumber(grant.amount);
    if (amount === null || amount < 0) {
      problems.push(`${label}: the award amount is not a valid number, so it was skipped.`);
      continue;
    }

    const status = V1_STATUS[text(grant.status).toLowerCase()];
    if (!status) {
      problems.push(`${label}: the status "${text(grant.status)}" is not recognized, so it was skipped.`);
      continue;
    }

    const startDate = cleanDate(grant.startDate);
    const endDate = cleanDate(grant.endDate);
    if (grant.startDate && !startDate) problems.push(`${label}: the start date could not be read, so it was left empty.`);
    if (grant.endDate && !endDate) problems.push(`${label}: the end date could not be read, so it was left empty.`);

    const subgrantees: V1Subgrantee[] = (Array.isArray(grant.subgrantees) ? grant.subgrantees : [])
      .slice(0, MAX_ITEMS)
      .flatMap((rawSub: unknown) => {
        const sub = (rawSub ?? {}) as Record<string, unknown>;
        const subName = text(sub.name);

        if (!subName) {
          problems.push(`${label}: a subgrantee has no name and was skipped.`);

          return [];
        }

        return [
          {
            name: subName,
            allocatedAmount: Math.max(toNumber(sub.allocatedAmount) ?? 0, 0),
            status: V1_STATUS[text(sub.status).toLowerCase()] ?? 'PENDING',
            kpis: parseKpis(sub.kpis, `${label} / ${subName}`, problems),
          },
        ];
      });

    grants.push({
      name,
      funder,
      amount,
      spentAmount: toNumber(grant.spentAmount) ?? undefined,
      startDate: startDate ?? '',
      endDate: endDate ?? '',
      status,
      kpis: parseKpis(grant.kpis, label, problems),
      subgrantees,
    });
  }

  const programs: V1Program[] = [];

  for (const raw of (Array.isArray(input.programs) ? input.programs : []).slice(0, MAX_ITEMS)) {
    const program = (raw ?? {}) as Record<string, unknown>;
    const month = text(program.month);

    if (!monthStart(month, year)) {
      problems.push(`Program results for "${month || 'an unnamed month'}" were skipped: the month could not be read.`);
      continue;
    }

    programs.push({
      month,
      peopleServed: Math.max(toNumber(program.peopleServed) ?? 0, 0),
      totalCost: Math.max(toNumber(program.totalCost) ?? 0, 0),
    });
  }

  return { grants, programs, year, dryRun: input.dryRun === true, problems };
};

// "Jan", "January" or "2026-03" -> "2026-01-01" (using the given year when the
// text has none).
export const monthStart = (label: string, year: number): string | null => {
  const dated = /^(\d{4})-(\d{2})/.exec(label);
  if (dated && Number(dated[2]) >= 1 && Number(dated[2]) <= 12) return `${dated[1]}-${dated[2]}-01`;

  const index = MONTHS.indexOf(label.slice(0, 3).toLowerCase());

  return index === -1 ? null : `${year}-${String(index + 1).padStart(2, '0')}-01`;
};

export type ImportSummary = {
  dryRun: boolean;
  funders: { created: number; alreadyExisted: number };
  grants: { created: number; alreadyExisted: number };
  kpis: number;
  subgrantees: number;
  programResults: { created: number; alreadyExisted: number };
  // Grants whose v1 status was "pending", which could mean several things.
  reviewStatus: string[];
  problems: string[];
};

export const importFromV1 = async (
  client: GraphqlClient,
  body: unknown,
  options: { currency: string; thisYear: number },
): Promise<ImportSummary> => {
  const parsed = parseV1Payload(body, options.thisYear);
  const write = !parsed.dryRun;

  const summary: ImportSummary = {
    dryRun: parsed.dryRun,
    funders: { created: 0, alreadyExisted: 0 },
    grants: { created: 0, alreadyExisted: 0 },
    kpis: 0,
    subgrantees: 0,
    programResults: { created: 0, alreadyExisted: 0 },
    reviewStatus: [],
    problems: [...parsed.problems],
  };

  const funderIds = new Map<string, string | null>();

  const resolveFunder = async (name: string): Promise<string | null> => {
    if (funderIds.has(name)) return funderIds.get(name) ?? null;

    const existing = (await fetchAll(client, COLLECTION.company, {}, { name: { eq: name } }, 1)).records[0];

    if (existing) summary.funders.alreadyExisted += 1;
    else summary.funders.created += 1;

    const id = existing?.id ?? (write ? (await createRecord(client, COLLECTION.company, { name, organizationTypes: ['FOUNDATION'] })).id : null);
    funderIds.set(name, id);

    return id;
  };

  const kpiData = (kpi: V1Kpi, links: Record<string, string>) => ({
    name: kpi.name,
    unit: kpi.unit,
    target: kpi.target,
    current: kpi.current,
    ...links,
  });

  for (const grant of parsed.grants) {
    const funderId = await resolveFunder(grant.funder);

    const duplicate =
      funderId !== null &&
      (await fetchAll(client, COLLECTION.grant, {}, { name: { eq: grant.name }, funderId: { eq: funderId } }, 1)).records.length > 0;

    if (duplicate) {
      summary.grants.alreadyExisted += 1;
      continue;
    }

    summary.grants.created += 1;
    summary.kpis += grant.kpis.length + grant.subgrantees.reduce((total, sub) => total + sub.kpis.length, 0);
    summary.subgrantees += grant.subgrantees.length;
    if (grant.status === 'PENDING') summary.reviewStatus.push(grant.name);

    if (!write) continue;

    const { id: grantId } = await createRecord(client, COLLECTION.grant, {
      name: grant.name,
      status: grant.status,
      funderId,
      awardAmount: money(grant.amount, options.currency),
      ...(grant.spentAmount !== undefined ? { spentAmount: money(grant.spentAmount, options.currency) } : {}),
      ...(grant.startDate ? { startDate: grant.startDate } : {}),
      ...(grant.endDate ? { endDate: grant.endDate } : {}),
    });

    for (const kpi of grant.kpis) await createRecord(client, COLLECTION.grantKpi, kpiData(kpi, { grantId }));

    for (const sub of grant.subgrantees) {
      const { id: subgranteeId } = await createRecord(client, COLLECTION.subgrantee, {
        name: sub.name,
        status: sub.status,
        allocatedAmount: money(sub.allocatedAmount, options.currency),
        grantId,
      });

      for (const kpi of sub.kpis) await createRecord(client, COLLECTION.grantKpi, kpiData(kpi, { grantId, subgranteeId }));
    }
  }

  for (const program of parsed.programs) {
    const period = monthStart(program.month, parsed.year) as string;
    const name = 'Programs (from Compass v1)';

    const exists = (await fetchAll(client, COLLECTION.programMetric, {}, { name: { eq: name }, period: { eq: period } }, 1)).records.length > 0;

    if (exists) {
      summary.programResults.alreadyExisted += 1;
      continue;
    }

    summary.programResults.created += 1;

    if (write) {
      await createRecord(client, COLLECTION.programMetric, {
        name,
        period,
        peopleServed: program.peopleServed,
        totalCost: money(program.totalCost, options.currency),
      });
    }
  }

  if (parsed.programs.length > 0) {
    summary.problems.push(
      `Program results from v1 had only a month name, so ${parsed.year} was used as the year. If that is wrong, change the Month on those records.`,
    );
  }

  return summary;
};
