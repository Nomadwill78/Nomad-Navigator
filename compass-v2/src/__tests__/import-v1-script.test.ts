import { describe, expect, it } from 'vitest';

import { buildBody, describeSummary, parseArgs, run, type Io } from '../../scripts/import-v1';

const makeIo = (files: Record<string, string>, reply: { status?: number; body?: unknown } = {}) => {
  const calls: { url: string; init: RequestInit }[] = [];
  const logs: string[] = [];
  const errors: string[] = [];

  const io: Io = {
    readFile: async (path) => {
      if (!(path in files)) throw new Error('ENOENT');

      return files[path];
    },
    fetch: (async (url: string, init: RequestInit) => {
      calls.push({ url, init });

      return new Response(JSON.stringify(reply.body ?? {}), { status: reply.status ?? 200 });
    }) as typeof fetch,
    log: (message) => logs.push(message),
    error: (message) => errors.push(message),
  };

  return { io, calls, logs, errors };
};

const SUMMARY = {
  dryRun: false,
  funders: { created: 1, alreadyExisted: 0 },
  grants: { created: 2, alreadyExisted: 0 },
  kpis: 3,
  subgrantees: 1,
  programResults: { created: 2, alreadyExisted: 0 },
  reviewStatus: ['Literacy Pilot'],
  problems: ['Program results had only a month name.'],
};

const GOOD_ARGS = ['--url', 'https://crm.example.org/', '--key', 'secret-key', '--grants', 'g.json'];

describe('parseArgs', () => {
  it('reads every option', () => {
    expect(parseArgs([...GOOD_ARGS, '--metrics', 'm.json', '--year', '2025', '--dry-run'])).toMatchObject({
      url: 'https://crm.example.org/', key: 'secret-key', grants: 'g.json', metrics: 'm.json', year: 2025, dryRun: true,
    });
  });

  it('refuses unknown options and bad years with a plain message', () => {
    expect(parseArgs(['--frobnicate'])).toEqual({ error: expect.stringContaining('--frobnicate') });
    expect(parseArgs(['--year', 'soon'])).toEqual({ error: expect.stringContaining('four-digit year') });
  });
});

describe('buildBody', () => {
  it('takes the monthly results out of the v1 metrics export', () => {
    const body = buildBody([{ name: 'G' }], { programs: [{ month: 'Jan' }], other: 1 }, { dryRun: false });

    expect(body).toEqual({ grants: [{ name: 'G' }], programs: [{ month: 'Jan' }], dryRun: false });
  });

  it('copes with missing or odd files', () => {
    expect(buildBody('x', undefined, { dryRun: true })).toEqual({ grants: [], programs: [], dryRun: true });
    expect(buildBody([], [{ month: 'Feb' }], { year: 2024, dryRun: false }).programs).toEqual([{ month: 'Feb' }]);
  });
});

describe('run', () => {
  it('sends the grants to the right address with the key, and prints a readable summary', async () => {
    const { io, calls, logs, errors } = makeIo({ 'g.json': '[{"name":"G"}]', 'm.json': '{"programs":[{"month":"Jan"}]}' }, { body: SUMMARY });

    const code = await run([...GOOD_ARGS, '--metrics', 'm.json'], io);

    expect(code).toBe(0);
    expect(errors).toEqual([]);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://crm.example.org/s/compass/import-v1');
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe('Bearer secret-key');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ grants: [{ name: 'G' }], programs: [{ month: 'Jan' }], dryRun: false });
    expect(logs[0]).toContain('Import finished.');
    expect(logs[0]).toContain('Literacy Pilot');
  });

  it('never prints the API key, even when something fails', async () => {
    const { io, logs, errors } = makeIo({ 'g.json': '[]' }, { status: 401, body: { message: 'nope' } });

    await run(GOOD_ARGS, io);

    expect([...logs, ...errors].join('\n')).not.toContain('secret-key');
  });

  it('explains a rejected key and a wrong address in plain words', async () => {
    const rejected = makeIo({ 'g.json': '[]' }, { status: 401 });
    const missing = makeIo({ 'g.json': '[]' }, { status: 404 });

    expect(await run(GOOD_ARGS, rejected.io)).toBe(1);
    expect(rejected.errors[0]).toContain('API key was not accepted');
    expect(await run(GOOD_ARGS, missing.io)).toBe(1);
    expect(missing.errors[0]).toContain('does not have Nomad Compass installed');
  });

  it('says so when a file cannot be opened or is not JSON, and sends nothing', async () => {
    const absent = makeIo({});
    const broken = makeIo({ 'g.json': 'not json' });

    expect(await run(GOOD_ARGS, absent.io)).toBe(1);
    expect(absent.errors[0]).toContain('could not open the grants file');
    expect(await run(GOOD_ARGS, broken.io)).toBe(1);
    expect(broken.errors[0]).toContain('not a valid JSON file');
    expect(absent.calls.length + broken.calls.length).toBe(0);
  });

  it('lists what is missing and shows help when asked', async () => {
    const none = makeIo({});
    const help = makeIo({});

    expect(await run(['--url', 'x'], none.io)).toBe(1);
    expect(none.errors[0]).toContain('--key, --grants');
    expect(await run(['--help'], help.io)).toBe(0);
    expect(help.logs[0]).toContain('Usage:');
  });

  it('passes a dry run through so nothing is changed', async () => {
    const { io, calls, logs } = makeIo({ 'g.json': '[]' }, { body: { ...SUMMARY, dryRun: true } });

    await run([...GOOD_ARGS, '--dry-run'], io);

    expect(JSON.parse(calls[0].init.body as string).dryRun).toBe(true);
    expect(logs[0]).toContain('DRY RUN. Nothing was changed');
  });
});

describe('describeSummary', () => {
  it('reads naturally', () => {
    expect(describeSummary(SUMMARY)).toContain('Grants:          2 were created, 0 already existed (skipped)');
  });
});
