import { type TaskPlan } from 'src/lib/stewardship';
import { COLLECTION, createRecord, type GraphqlClient } from 'src/services/repo';

// Twenty's persistent key-value store, as the two calls this app needs. The
// real store is passed in by the logic functions; tests pass a plain Map.
export type KeyValueStore = {
  get: <TValue = unknown>(key: string) => Promise<TValue | null>;
  set: <TValue>(key: string, value: TValue) => Promise<void>;
};

export type CreatedTask = 'created' | 'duplicate';

// Creates the to-do and links it to the person or organization it is about, so
// it shows on their record. Each plan carries a key that is remembered after the
// task is made, which is what stops a re-run, a retry or a nightly sweep from
// creating the same reminder twice.
export const createTaskFromPlan = async (
  client: GraphqlClient,
  store: KeyValueStore,
  plan: TaskPlan,
  now: Date = new Date(),
): Promise<CreatedTask> => {
  if (await store.get(plan.dedupeKey)) return 'duplicate';

  const task = await createRecord(client, COLLECTION.task, {
    title: plan.title,
    bodyV2: { markdown: plan.body },
    dueAt: `${plan.dueDate}T12:00:00.000Z`,
    status: 'TODO',
  });

  // Remembered before linking, so a failure while linking can never lead to a
  // second copy of the task on the next run.
  await store.set(plan.dedupeKey, { taskId: task.id, createdAt: now.toISOString() });

  const targets: Record<string, string>[] = [
    ...(plan.targetPersonId ? [{ targetPersonId: plan.targetPersonId }] : []),
    ...(plan.targetCompanyId ? [{ targetCompanyId: plan.targetCompanyId }] : []),
  ];

  for (const target of targets) {
    try {
      await createRecord(client, COLLECTION.taskTarget, { taskId: task.id, ...target });
    } catch (error) {
      console.error(`Task "${plan.title}" was created but could not be linked to its record.`, error);
    }
  }

  return 'created';
};
