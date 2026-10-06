// A thin wrapper over Twenty's GraphQL client. Everything the app reads or
// writes goes through here, so the rest of the code never builds a query by
// hand and the tests can swap in an in-memory fake.

export type GraphqlClient = {
  query: (request: any) => Promise<any>;
  mutation: (request: any) => Promise<any>;
};

export type Collection = {
  // The name used in queries: `donations(filter: ...)`
  plural: string;
  // The name used in mutations: `createDonation`, `updateDonation`
  mutationName: string;
};

export const COLLECTION = {
  person: { plural: 'people', mutationName: 'Person' },
  company: { plural: 'companies', mutationName: 'Company' },
  task: { plural: 'tasks', mutationName: 'Task' },
  taskTarget: { plural: 'taskTargets', mutationName: 'TaskTarget' },
  grant: { plural: 'grants', mutationName: 'Grant' },
  grantKpi: { plural: 'grantKpis', mutationName: 'GrantKpi' },
  subgrantee: { plural: 'subgrantees', mutationName: 'Subgrantee' },
  programMetric: { plural: 'programMetrics', mutationName: 'ProgramMetric' },
  donation: { plural: 'donations', mutationName: 'Donation' },
  fundraisingCampaign: { plural: 'fundraisingCampaigns', mutationName: 'FundraisingCampaign' },
  cultivationPlan: { plural: 'cultivationPlans', mutationName: 'CultivationPlan' },
  volunteerLog: { plural: 'volunteerLogs', mutationName: 'VolunteerLog' },
} as const satisfies Record<string, Collection>;

// Twenty returns at most 60 records per page.
export const PAGE_SIZE = 60;
// A safety stop so one runaway query cannot run a function out of time.
export const MAX_RECORDS_PER_QUERY = 20_000;

export type Selection = Record<string, unknown>;
export type Filter = Record<string, unknown>;
export type RecordNode = Record<string, any> & { id: string };

export type PageResult = { records: RecordNode[]; truncated: boolean };

export const fetchAll = async (
  client: GraphqlClient,
  collection: Collection,
  selection: Selection,
  filter?: Filter,
  limit: number = MAX_RECORDS_PER_QUERY,
): Promise<PageResult> => {
  const records: RecordNode[] = [];
  let after: string | undefined;

  while (records.length < limit) {
    const response = await client.query({
      [collection.plural]: {
        __args: {
          first: Math.min(PAGE_SIZE, limit - records.length),
          ...(after ? { after } : {}),
          ...(filter ? { filter } : {}),
        },
        edges: { node: { id: true, ...selection } },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    });

    const connection = response?.[collection.plural];
    const nodes: RecordNode[] = (connection?.edges ?? []).map((edge: { node: RecordNode }) => edge.node);
    records.push(...nodes);

    if (!connection?.pageInfo?.hasNextPage || !connection.pageInfo.endCursor) {
      return { records, truncated: false };
    }
    after = connection.pageInfo.endCursor;
  }

  return { records, truncated: true };
};

export const fetchOne = async (
  client: GraphqlClient,
  collection: Collection,
  id: string,
  selection: Selection,
): Promise<RecordNode | null> => {
  const { records } = await fetchAll(client, collection, selection, { id: { eq: id } }, 1);

  return records[0] ?? null;
};

export const createRecord = async (
  client: GraphqlClient,
  collection: Collection,
  data: Record<string, unknown>,
): Promise<{ id: string }> => {
  const name = `create${collection.mutationName}`;
  const response = await client.mutation({ [name]: { __args: { data }, id: true } });
  const id = response?.[name]?.id;

  if (!id) throw new Error(`Creating a ${collection.mutationName} did not return an id.`);

  return { id };
};

export const updateRecord = async (
  client: GraphqlClient,
  collection: Collection,
  id: string,
  data: Record<string, unknown>,
): Promise<void> => {
  if (Object.keys(data).length === 0) return;

  await client.mutation({
    [`update${collection.mutationName}`]: { __args: { id, data }, id: true },
  });
};

// Moves a record to Twenty's trash, where it can still be restored. Nothing in
// Compass permanently destroys data.
export const softDeleteRecord = async (
  client: GraphqlClient,
  collection: Collection,
  id: string,
): Promise<void> => {
  await client.mutation({ [`delete${collection.mutationName}`]: { __args: { id }, id: true } });
};

// Records are only written when something actually changed. Every write wakes
// Twenty's event system and other automations, so skipping no-ops keeps nightly
// recalculation quiet.
const sameValue = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export const diffFields = (
  current: Record<string, unknown>,
  next: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(Object.entries(next).filter(([key, value]) => !sameValue(current[key], value)));

export const updateIfChanged = async (
  client: GraphqlClient,
  collection: Collection,
  current: RecordNode,
  next: Record<string, unknown>,
): Promise<boolean> => {
  const changes = diffFields(current, next);

  if (Object.keys(changes).length === 0) return false;

  await updateRecord(client, collection, current.id, changes);

  return true;
};

export const chunk = <TItem>(items: readonly TItem[], size: number): TItem[][] => {
  const chunks: TItem[][] = [];

  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));

  return chunks;
};
