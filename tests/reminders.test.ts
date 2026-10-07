import { describe, it, expect, vi } from 'vitest';
import { runReminders, createResendMailer, ReminderStore, Mailer } from '../src/server/reminders';
import type { Grant } from '../types';

const grant = (reports: Grant['reports']): Grant => ({
  id: 'g1', name: 'Plough', funder: 'Plough Foundation', amount: 1, startDate: '2026-01-01', endDate: '2026-12-31', status: 'active', kpis: [], reports,
});

function fakeStore(over: Partial<ReminderStore> & { grants?: Grant[]; admins?: string[]; sent?: string[] } = {}) {
  const marked: string[] = [];
  const store: ReminderStore = {
    listOrgIds: async () => ['org1'],
    listGrants: async () => over.grants ?? [],
    listAdminEmails: async () => over.admins ?? ['admin@org.org'],
    loadSentKeys: async () => new Set(over.sent ?? []),
    markSent: async (_o, key) => { marked.push(key); },
    ...over,
  };
  return { store, marked };
}
const okMailer = () => { const sent: any[] = []; const mailer: Mailer = { send: async (m) => { sent.push(m); } }; return { mailer, sent }; };
const R = (id: string, dueDate: string, extra = {}) => ({ id, title: `Report ${id}`, dueDate, owner: 'Dana', ...extra });

describe('task 18: reminder job', () => {
  it('sends the 14 day reminder to the owner and records it', async () => {
    const { store, marked } = fakeStore({ grants: [grant([R('r1', '2026-10-20', { ownerEmail: 'dana@org.org' })])] });
    const { mailer, sent } = okMailer();
    const out = await runReminders({ store, mailer, today: '2026-10-06' });
    expect(out.sent).toBe(1);
    expect(sent[0].to).toEqual(['dana@org.org']);
    expect(sent[0].subject).toContain('14 days');
    expect(marked).toHaveLength(1);
  });

  it('sends the 3 day reminder, to admins when no owner email is set', async () => {
    const { store } = fakeStore({ grants: [grant([R('r1', '2026-10-20')])], admins: ['a@org.org', 'b@org.org'] });
    const { mailer, sent } = okMailer();
    await runReminders({ store, mailer, today: '2026-10-17' });
    expect(sent[0].to).toEqual(['a@org.org', 'b@org.org']);
    expect(sent[0].subject).toContain('3 days');
  });

  it('does not send a reminder twice', async () => {
    const first = fakeStore({ grants: [grant([R('r1', '2026-10-20', { ownerEmail: 'd@o.org' })])] });
    const { mailer, sent } = okMailer();
    await runReminders({ store: first.store, mailer, today: '2026-10-06' });
    const second = fakeStore({ grants: [grant([R('r1', '2026-10-20', { ownerEmail: 'd@o.org' })])], sent: first.marked });
    await runReminders({ store: second.store, mailer, today: '2026-10-07' });
    expect(sent).toHaveLength(1);
  });

  it('a dry run sends and records nothing but reports who would get it', async () => {
    const { store, marked } = fakeStore({ grants: [grant([R('r1', '2026-10-20', { ownerEmail: 'd@o.org' })])] });
    const mailer = { send: vi.fn() };
    const out = await runReminders({ store, mailer, today: '2026-10-06', dryRun: true });
    expect(mailer.send).not.toHaveBeenCalled();
    expect(marked).toEqual([]);
    expect(out.items[0]).toMatchObject({ status: 'would_send', to: ['d@o.org'] });
  });

  it('a failed email is not recorded as sent, so it retries next run, and other reminders still go', async () => {
    const { store, marked } = fakeStore({ grants: [grant([R('bad', '2026-10-20', { ownerEmail: 'bad@o.org' }), R('good', '2026-10-21', { ownerEmail: 'good@o.org' })])] });
    const mailer: Mailer = { send: async (m) => { if (m.to[0] === 'bad@o.org') throw new Error('provider down'); } };
    const out = await runReminders({ store, mailer, today: '2026-10-07' });
    expect(out.failed).toBe(1);
    expect(out.sent).toBe(1);
    expect(marked).toHaveLength(1);
    expect(marked[0]).toContain('good');
  });

  it('reports a report with nobody to email instead of silently dropping it', async () => {
    const { store } = fakeStore({ grants: [grant([R('r1', '2026-10-20')])], admins: [] });
    const out = await runReminders({ store, mailer: okMailer().mailer, today: '2026-10-06' });
    expect(out.skippedNoRecipient).toBe(1);
    expect(out.sent).toBe(0);
  });

  it('one organization failing does not stop the others', async () => {
    const { store } = fakeStore({
      listOrgIds: async () => ['broken', 'org1'],
      listGrants: async (o) => { if (o === 'broken') throw new Error('boom'); return [grant([R('r1', '2026-10-20', { ownerEmail: 'd@o.org' })])]; },
    });
    const { mailer, sent } = okMailer();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = await runReminders({ store, mailer, today: '2026-10-06' });
    expect(sent).toHaveLength(1);
    expect(out.failed).toBe(1);
  });

  it('sends nothing for submitted or late reports', async () => {
    const { store } = fakeStore({ grants: [grant([R('s', '2026-10-10', { submittedDate: '2026-10-01', ownerEmail: 'd@o.org' }), R('l', '2026-10-01', { ownerEmail: 'd@o.org' })])] });
    const { mailer, sent } = okMailer();
    await runReminders({ store, mailer, today: '2026-10-06' });
    expect(sent).toEqual([]);
  });
});

describe('Resend mailer', () => {
  it('needs both settings', () => {
    expect(() => createResendMailer({})).toThrow(/RESEND_API_KEY/);
    expect(() => createResendMailer({ RESEND_API_KEY: 'k' })).toThrow(/REMINDER_FROM_EMAIL/);
  });
  it('posts to Resend with the key and surfaces errors', async () => {
    const calls: any[] = [];
    const ok = createResendMailer({ RESEND_API_KEY: 'k', REMINDER_FROM_EMAIL: 'Compass <r@x.org>' }, (async (url: string, init: any) => { calls.push({ url, init }); return { ok: true }; }) as any);
    await ok.send({ to: ['a@b.org'], subject: 's', text: 't' });
    expect(calls[0].url).toBe('https://api.resend.com/emails');
    expect(calls[0].init.headers.Authorization).toBe('Bearer k');
    expect(JSON.parse(calls[0].init.body)).toMatchObject({ from: 'Compass <r@x.org>', to: ['a@b.org'] });
    const bad = createResendMailer({ RESEND_API_KEY: 'k', REMINDER_FROM_EMAIL: 'r@x.org' }, (async () => ({ ok: false, status: 403, text: async () => 'domain not verified' })) as any);
    await expect(bad.send({ to: ['a@b.org'], subject: 's', text: 't' })).rejects.toThrow(/403.*domain not verified/);
  });
});

import { createGmailMailer, createMailer } from '../src/server/reminders';
describe('Gmail mailer', () => {
  const fakeTransport = (impl: (msg: any) => Promise<void>) => {
    const made: any[] = [];
    const factory = ((opts: any) => { made.push(opts); return { sendMail: impl }; }) as any;
    return { factory, made };
  };
  it('needs the address and an app password', () => {
    expect(() => createGmailMailer({})).toThrow(/GMAIL_USER/);
    expect(() => createGmailMailer({ GMAIL_USER: 'me@gmail.com' })).toThrow(/GMAIL_APP_PASSWORD/);
  });
  it('connects to Gmail securely, strips spaces from the app password and sends from the Gmail address', async () => {
    const sent: any[] = [];
    const { factory, made } = fakeTransport(async (m) => { sent.push(m); });
    const mailer = createGmailMailer({ GMAIL_USER: 'me@gmail.com', GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop', REMINDER_FROM_NAME: 'Nomad Compass' }, factory);
    await mailer.send({ to: ['a@b.org'], subject: 'S', text: 'T' });
    expect(made[0]).toMatchObject({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: 'me@gmail.com', pass: 'abcdefghijklmnop' } });
    expect(sent[0]).toMatchObject({ from: 'Nomad Compass <me@gmail.com>', to: ['a@b.org'], subject: 'S', text: 'T' });
  });
  it('explains a rejected login in plain words', async () => {
    const { factory } = fakeTransport(async () => { throw new Error('Invalid login: 535-5.7.8 Username and Password not accepted'); });
    const mailer = createGmailMailer({ GMAIL_USER: 'me@gmail.com', GMAIL_APP_PASSWORD: 'x' }, factory);
    await expect(mailer.send({ to: ['a@b.org'], subject: 'S', text: 'T' })).rejects.toThrow(/app password, not your normal password/);
  });
  it('picks Gmail when set, Resend otherwise, and refuses when neither is set up', () => {
    expect(() => createMailer({})).toThrow(/No email sender/);
    expect(() => createMailer({ RESEND_API_KEY: 'k' })).toThrow(/REMINDER_FROM_EMAIL/); // went down the Resend path
    expect(() => createMailer({ GMAIL_USER: 'me@gmail.com' })).toThrow(/GMAIL_APP_PASSWORD/); // went down the Gmail path
  });
});
