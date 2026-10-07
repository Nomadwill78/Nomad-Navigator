import nodemailer from 'nodemailer';
import { Grant } from '../../types';
import { buildReminderEmail, planReminders, PlannedReminder } from '../lib/reporting';

/**
 * The daily reminder job. All real-world access (database, email) comes in through
 * two small interfaces so the logic can be tested without sending anything.
 */

export interface ReminderStore {
  listOrgIds(): Promise<string[]>;
  listGrants(orgId: string): Promise<Grant[]>;
  listAdminEmails(orgId: string): Promise<string[]>;
  /** Keys of reminders already sent for this org. */
  loadSentKeys(orgId: string): Promise<Set<string>>;
  markSent(orgId: string, key: string, info: { to: string[]; sentAt: string }): Promise<void>;
}

export interface Mailer {
  send(message: { to: string[]; subject: string; text: string }): Promise<void>;
}

export interface ReminderRunSummary {
  today: string;
  dryRun: boolean;
  considered: number;
  sent: number;
  skippedNoRecipient: number;
  failed: number;
  /** What was (or, in a dry run, would be) sent. */
  items: { orgId: string; grantName: string; report: string; kind: string; to: string[]; status: 'sent' | 'would_send' | 'no_recipient' | 'failed'; error?: string }[];
}

const looksLikeEmail = (v: string | undefined): v is string => !!v && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

export async function runReminders(opts: {
  store: ReminderStore;
  mailer: Mailer;
  today: string;
  dryRun?: boolean;
  appUrl?: string;
}): Promise<ReminderRunSummary> {
  const { store, mailer, today, appUrl } = opts;
  const dryRun = !!opts.dryRun;
  const summary: ReminderRunSummary = { today, dryRun, considered: 0, sent: 0, skippedNoRecipient: 0, failed: 0, items: [] };

  for (const orgId of await store.listOrgIds()) {
    let planned: PlannedReminder[];
    try {
      const [grants, sentKeys] = await Promise.all([store.listGrants(orgId), store.loadSentKeys(orgId)]);
      planned = planReminders(orgId, grants, today, sentKeys);
    } catch (e) {
      // One organization's problem must never stop everyone else's reminders.
      console.error(`Reminder planning failed for org ${orgId}:`, e);
      summary.failed += 1;
      continue;
    }
    if (planned.length === 0) continue;

    let adminEmails: string[] | null = null;
    for (const p of planned) {
      summary.considered += 1;
      const base = { orgId, grantName: p.grantName, report: p.report.title, kind: p.kind };
      let to: string[];
      if (looksLikeEmail(p.report.ownerEmail)) {
        to = [p.report.ownerEmail];
      } else {
        adminEmails ??= (await store.listAdminEmails(orgId)).filter(looksLikeEmail);
        to = adminEmails;
      }
      if (to.length === 0) {
        summary.skippedNoRecipient += 1;
        summary.items.push({ ...base, to, status: 'no_recipient' });
        continue;
      }
      if (dryRun) {
        summary.items.push({ ...base, to, status: 'would_send' });
        continue;
      }
      try {
        await mailer.send({ to, ...buildReminderEmail(p, appUrl) });
        // Only after the email really went out, so a failure is retried tomorrow.
        await store.markSent(orgId, p.key, { to, sentAt: new Date().toISOString() });
        summary.sent += 1;
        summary.items.push({ ...base, to, status: 'sent' });
      } catch (e) {
        summary.failed += 1;
        summary.items.push({ ...base, to, status: 'failed', error: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  return summary;
}

/** Sends through Resend (https://resend.com). Needs RESEND_API_KEY and REMINDER_FROM_EMAIL. */
export function createResendMailer(env: { RESEND_API_KEY?: string; REMINDER_FROM_EMAIL?: string }, fetchImpl: typeof fetch = fetch): Mailer {
  const key = env.RESEND_API_KEY;
  const from = env.REMINDER_FROM_EMAIL;
  if (!key) throw new Error('RESEND_API_KEY is required to send reminders');
  if (!from) throw new Error('REMINDER_FROM_EMAIL is required to send reminders');
  return {
    async send({ to, subject, text }) {
      const res = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, text }),
      });
      if (!res.ok) throw new Error(`Email provider returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
    },
  };
}

/**
 * Sends through a Gmail account using an "app password" (no domain or paid service needed).
 * Needs GMAIL_USER (the Gmail address) and GMAIL_APP_PASSWORD (16 characters from Google Account > Security > App passwords).
 * Gmail allows roughly 500 recipients a day, far more than reminders need.
 */
export function createGmailMailer(
  env: { GMAIL_USER?: string; GMAIL_APP_PASSWORD?: string; REMINDER_FROM_NAME?: string },
  createTransport: typeof nodemailer.createTransport = nodemailer.createTransport.bind(nodemailer)
): Mailer {
  const user = env.GMAIL_USER;
  const pass = env.GMAIL_APP_PASSWORD?.replace(/\s+/g, ''); // Google shows it in groups of four; spaces are not part of it
  if (!user) throw new Error('GMAIL_USER is required to send reminders with Gmail');
  if (!pass) throw new Error('GMAIL_APP_PASSWORD is required to send reminders with Gmail');
  const transport = createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass } });
  const from = env.REMINDER_FROM_NAME ? `${env.REMINDER_FROM_NAME} <${user}>` : user;
  return {
    async send({ to, subject, text }) {
      try {
        await transport.sendMail({ from, to, subject, text });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(/Invalid login|535|Username and Password not accepted/i.test(msg)
          ? 'Gmail rejected the login. Check GMAIL_USER and that GMAIL_APP_PASSWORD is an app password, not your normal password.'
          : `Gmail send failed: ${msg}`);
      }
    },
  };
}

export type MailerEnv = {
  GMAIL_USER?: string; GMAIL_APP_PASSWORD?: string; REMINDER_FROM_NAME?: string;
  RESEND_API_KEY?: string; REMINDER_FROM_EMAIL?: string;
};

/** Picks Gmail when its settings exist, otherwise Resend. Throws a plain message when neither is set up. */
export function createMailer(env: MailerEnv): Mailer {
  if (env.GMAIL_USER || env.GMAIL_APP_PASSWORD) return createGmailMailer(env);
  if (env.RESEND_API_KEY || env.REMINDER_FROM_EMAIL) return createResendMailer(env);
  throw new Error('No email sender is set up. Set GMAIL_USER and GMAIL_APP_PASSWORD (see docs/REMINDERS.md).');
}

/** Firestore (Admin SDK) implementation of the store. */
export function createFirestoreReminderStore(db: FirebaseFirestore.Firestore): ReminderStore {
  return {
    async listOrgIds() {
      return (await db.collection('organizations').select().get()).docs.map((d) => d.id);
    },
    async listGrants(orgId) {
      return (await db.collection(`organizations/${orgId}/grants`).get()).docs.map((d) => ({ ...(d.data() as Grant), id: d.id }));
    },
    async listAdminEmails(orgId) {
      const snap = await db.collection(`organizations/${orgId}/members`).where('role', '==', 'admin').get();
      return snap.docs.map((d) => String(d.data().email ?? ''));
    },
    async loadSentKeys(orgId) {
      return new Set((await db.collection(`organizations/${orgId}/reminderLog`).select().get()).docs.map((d) => d.id));
    },
    async markSent(orgId, key, info) {
      await db.doc(`organizations/${orgId}/reminderLog/${key}`).set(info);
    },
  };
}
