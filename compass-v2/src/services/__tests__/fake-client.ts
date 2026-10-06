import { COLLECTION, type Collection, type GraphqlClient } from 'src/services/repo';

// A tiny in-memory stand-in for Twenty's API, enough to run the services in
// tests. It supports the query shapes the app actually uses (equality, "in",
// "is NOT_NULL", greater-than, and/or) and keeps a log of every write so tests
// can assert that no-op recalculations really write nothing.
//
// It cannot prove that Twenty accepts these queries. That is what the
// integration test (run against a real server) is for.

type Row = Record<string, any>;
export type WriteLogEntry = { operation: 'create' | 'update' | 'delete'; collection: string; id: string; data: Row };

const collections: Collection[] = Object.values(COLLECTION);
const byPlural = new Map<string, Collection>(collections.map((collection) => [collection.plural, collection]));
const byMutation = new Map<string, Collection>(collections.map((collection) => [collection.mutationName, collection]));

const OPERATORS = new Set(['eq', 'neq', 'in', 'gt', 'gte', 'lt', 'lte', 'is']);

const matches = (row: Row, filter: Row | undefined): boolean => {
  if (!filter) return true;

  return Object.entries(filter).every(([key, condition]) => {
    if (key === 'and') return (condition as Row[]).every((part) => matches(row, part));
    if (key === 'or') return (condition as Row[]).some((part) => matches(row, part));

    const value = row[key];
    const rules = condition as Row;

    // A filter on part of a composite field, such as emails.primaryEmail, is a
    // nested filter on the value rather than a list of operators.
    if (Object.keys(rules).some((name) => !OPERATORS.has(name))) {
      return matches((value ?? {}) as Row, rules);
    }

    return Object.entries(rules).every(([operator, expected]) => {
      switch (operator) {
        case 'eq': return value === expected;
        case 'neq': return value !== expected;
        case 'in': return (expected as unknown[]).includes(value);
        case 'gt': return value !== null && value !== undefined && value > (expected as number);
        case 'gte': return value !== null && value !== undefined && value >= (expected as number);
        case 'lt': return value !== null && value !== undefined && value < (expected as number);
        case 'lte': return value !== null && value !== undefined && value <= (expected as number);
        case 'is': return expected === 'NULL' ? value === null || value === undefined : value !== null && value !== undefined;
        default: throw new Error(`Fake client does not support the "${operator}" filter operator.`);
      }
    });
  });
};

export const createFakeClient = (initial: Record<string, Row[]> = {}) => {
  const tables = new Map<string, Row[]>(
    Object.entries(initial).map(([plural, rows]) => [plural, rows.map((row) => ({ ...row }))]),
  );
  const writes: WriteLogEntry[] = [];
  let nextId = 1;

  const table = (plural: string): Row[] => {
    if (!tables.has(plural)) tables.set(plural, []);

    return tables.get(plural)!;
  };

  const client: GraphqlClient = {
    async query(request) {
      const response: Record<string, unknown> = {};

      for (const [plural, selection] of Object.entries<any>(request)) {
        if (!byPlural.has(plural)) throw new Error(`Fake client does not know the collection "${plural}".`);

        const { first = 60, after, filter } = selection.__args ?? {};
        if (first > 60) throw new Error('Twenty allows at most 60 records per page.');

        const rows = table(plural).filter((row) => matches(row, filter));
        const start = after ? Number(after) : 0;
        const page = rows.slice(start, start + first);
        const end = start + page.length;

        response[plural] = {
          edges: page.map((row) => ({ node: { ...row } })),
          pageInfo: { hasNextPage: end < rows.length, endCursor: end < rows.length ? String(end) : null },
        };
      }

      return response;
    },

    async mutation(request) {
      const response: Record<string, unknown> = {};

      for (const [name, selection] of Object.entries<any>(request)) {
        const operation = name.startsWith('create')
          ? 'create'
          : name.startsWith('update')
            ? 'update'
            : name.startsWith('delete')
              ? 'delete'
              : null;
        const collection = operation ? byMutation.get(name.slice(operation.length)) : undefined;

        if (!operation || !collection) throw new Error(`Fake client does not support the mutation "${name}".`);

        const rows = table(collection.plural);
        const { id, data } = selection.__args as { id?: string; data: Row };

        if (operation === 'create') {
          const row = { id: `${collection.mutationName}-${nextId++}`, ...data };

          rows.push(row);
          writes.push({ operation, collection: collection.plural, id: row.id, data });
          response[name] = { id: row.id };
        } else if (operation === 'delete') {
          // Soft delete: the row leaves every query, as in Twenty.
          const index = rows.findIndex((candidate) => candidate.id === id);
          if (index === -1) throw new Error(`Cannot delete ${collection.plural} ${id}: not found.`);

          rows.splice(index, 1);
          writes.push({ operation, collection: collection.plural, id: id!, data: {} });
          response[name] = { id };
        } else {
          const row = rows.find((candidate) => candidate.id === id);
          if (!row) throw new Error(`Cannot update ${collection.plural} ${id}: not found.`);

          Object.assign(row, data);
          writes.push({ operation, collection: collection.plural, id: id!, data });
          response[name] = { id };
        }
      }

      return response;
    },
  };

  return {
    client,
    writes,
    rows: (plural: string) => table(plural),
    row: (plural: string, id: string) => table(plural).find((row) => row.id === id),
    clearWrites: () => { writes.length = 0; },
  };
};

export const eur = (units: number, currencyCode = 'USD') => ({
  amountMicros: Math.round(units * 1_000_000),
  currencyCode,
});
