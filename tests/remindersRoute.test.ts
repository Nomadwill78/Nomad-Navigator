// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createApiApp } from '../src/server/apiApp';

async function call(headers: Record<string, string> = {}) {
  const server = createApiApp().listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/api/send-reminders?dryRun=1`, { headers });
    return res.status;
  } finally {
    server.close();
  }
}

describe('/api/send-reminders protection', () => {
  const original = process.env.CRON_SECRET;
  afterEach(() => { if (original === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = original; });

  it('is switched off (503) when CRON_SECRET is not set', async () => {
    delete process.env.CRON_SECRET;
    expect(await call({ authorization: 'Bearer anything' })).toBe(503);
  });
  it('rejects a missing or wrong secret (401)', async () => {
    process.env.CRON_SECRET = 'right-secret';
    expect(await call()).toBe(401);
    expect(await call({ authorization: 'Bearer wrong-secret' })).toBe(401);
  });
  it('passes the check with the right secret, then needs the service account to go further', async () => {
    process.env.CRON_SECRET = 'right-secret';
    delete process.env.FIREBASE_SERVICE_ACCOUNT;
    expect(await call({ authorization: 'Bearer right-secret' })).toBe(500); // reached the job, which has no database credentials here
  });
});
