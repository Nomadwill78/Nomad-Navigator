# Report reminders: setup and testing

Nomad Compass emails a reminder **14 days** and **3 days** before each report's due date, once each, until the
report is marked submitted. This guide turns it on. Nothing is sent until you finish these steps.

## How it works

- Every day at 13:00 UTC (8 or 9 in the morning in Memphis) Vercel calls `/api/send-reminders`.
- The job looks at every grant's reporting calendar. A report gets its 14 day reminder on the first run when it is
  14 to 4 days away, and its 3 day reminder on the first run when it is 3 days away or less. A missed day does not skip one.
- Each reminder goes to the report's **owner email** if one is set, otherwise to every **admin** of the organization.
- After an email really goes out, the job records it in `organizations/{org}/reminderLog` so the same reminder is never sent twice.
  If an email fails, nothing is recorded, so it is retried the next day.
- Late reports are not emailed again. They show as **Late** in the app and on the Due Soon list.

## One-time setup

1. **Create a Resend account** at https://resend.com and verify the domain you want emails to come from.
2. In Vercel, open the project, then Settings, then Environment Variables, and add (Production):
   | Name | Value |
   |---|---|
   | `RESEND_API_KEY` | the key from Resend |
   | `REMINDER_FROM_EMAIL` | for example `Nomad Compass <reminders@yourdomain.org>` (must use the verified domain) |
   | `CRON_SECRET` | any long random text, 32 characters or more |
   | `APP_URL` | optional, your app's web address |
   | `FIREBASE_SERVICE_ACCOUNT` | already set for billing, nothing to do |
3. Redeploy so the new variables take effect. `vercel.json` already contains the daily schedule.

## Test before you rely on it

Open this address in a terminal (replace the two placeholders). The `dryRun=1` part means **nothing is sent or recorded**:

```
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://YOUR-APP-ADDRESS/api/send-reminders?dryRun=1"
```

You get a list of who would be emailed, for which report, and why. To prove real delivery in a test account:

1. Create a grant with a report due in exactly 14 days and your own email as the owner email.
2. Run the same address **without** `?dryRun=1`. You should get the 14 day email within a minute.
3. Change the due date to 3 days away and run it again. You should get the 3 day email.
4. Run it a third time. Nothing new should be sent.

## If something looks wrong

- **503 "reminders are switched off"**: `CRON_SECRET` is not set.
- **401**: the secret in your request does not match.
- **Items with status `failed`**: the message says why. "403 domain not verified" means the sending domain is not verified in Resend.
- **Items with status `no_recipient`**: the report has no owner email and the organization has no admin email on file.
