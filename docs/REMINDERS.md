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

## One-time setup (Gmail, no domain needed)

Reminders are sent from a Gmail address you control. Google does not let apps use your normal Gmail password, so you
create a separate 16 character **app password** that works only for this.

1. **Pick the Gmail address** reminders will come from. A dedicated one (for example `nomadcompass.reminders@gmail.com`) is
   best, because every reminder will show it as the sender.
2. **Turn on 2-Step Verification** for that Google account: https://myaccount.google.com/security, then "2-Step Verification".
   Google will not offer app passwords without it.
3. **Create an app password**: https://myaccount.google.com/apppasswords. Name it "Nomad Compass" and click Create.
   Google shows 16 letters in four groups. Copy them now, because Google never shows them again. Spaces do not matter.
   (If that page says app passwords are unavailable, 2-Step Verification is not fully on, or the account uses Advanced Protection.)
4. In Vercel, open the project, then Settings, then Environment Variables, and add these for Production:

   | Name | Value |
   |---|---|
   | `GMAIL_USER` | the Gmail address from step 1 |
   | `GMAIL_APP_PASSWORD` | the 16 letters from step 3 |
   | `REMINDER_FROM_NAME` | optional, for example `Nomad Compass`. Shown as the sender name |
   | `CRON_SECRET` | any long random text, 32 characters or more. Only you and Vercel know it |
   | `APP_URL` | optional, your app's web address, added to the bottom of each email |
   | `FIREBASE_SERVICE_ACCOUNT` | already set for billing, nothing to do |

5. **Redeploy** so the new settings take effect. `vercel.json` already contains the daily schedule.

Good to know: Gmail allows about 500 recipients a day, far more than reminders need. Emails may land in a spam folder the
first time, so mark the first one "Not spam". If you later get your own domain, you can switch to Resend instead by setting
`RESEND_API_KEY` and `REMINDER_FROM_EMAIL` and removing the two Gmail settings. Gmail is used whenever its settings exist.

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
- **Items with status `failed`**: the message says why. "Gmail rejected the login" means `GMAIL_APP_PASSWORD` is wrong, or is your normal password instead of an app password. Make a new app password and update it in Vercel.
- **500 "No email sender is set up"**: `GMAIL_USER` and `GMAIL_APP_PASSWORD` are missing.
- **Items with status `no_recipient`**: the report has no owner email and the organization has no admin email on file.
