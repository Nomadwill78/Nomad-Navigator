/** One definition of "looks like an email address", shared by the form, the saver and the reminder job. */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const isValidEmail = (v: unknown): v is string => typeof v === 'string' && v.length <= 200 && EMAIL_RE.test(v.trim());

export const EMAIL_HELP = 'Enter an email like name@organization.org, or leave it blank to send reminders to your admins.';
