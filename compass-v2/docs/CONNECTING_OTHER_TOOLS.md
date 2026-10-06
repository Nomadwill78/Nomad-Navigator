# Connecting other tools

Compass can receive a gift from another system automatically, so nobody has to type it in twice. This works with Zapier, Make, a payment processor that can call a web address, or a form on your website.

When a gift arrives this way, Compass finds the donor by email (or creates them), adds the gift, and everything else follows: totals, giving status, thank-you reminder.

## The address

Send a `POST` request to:

```
https://YOUR-TWENTY-ADDRESS/s/compass/record-donation
```

On Twenty Cloud, web addresses for apps can differ from the address you sign in at. Open **Settings > Applications > Nomad Compass** and copy the exact address shown for the function **record-donation**.

The request must carry an **API key** from **Settings > MCP & APIs > API > Create key**, sent as a header:

```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

Treat the key like a password. Give it its own name (for example "Zapier") so you can delete it if it is ever exposed.

## What to send

```json
{
  "email": "maria@example.org",
  "firstName": "Maria",
  "lastName": "Lopez",
  "amount": 50,
  "giftDate": "2026-10-06",
  "giftType": "RECURRING",
  "paymentMethod": "CARD",
  "referenceNumber": "ch_3Pxyz123",
  "campaignName": "Year-End Giving",
  "designation": "Youth programs",
  "isAnonymous": false
}
```

| Field | Required | Notes |
|---|---|---|
| `amount` | **Yes** | A number above 0. Text like `"25.50"` is accepted |
| `email` **or** `organizationName` | **Yes, one of them** | Not both. `email` is for a person, `organizationName` for a company or foundation |
| `firstName`, `lastName` | No | Used only when a new person is created |
| `giftDate` | No | `YYYY-MM-DD`. Defaults to today |
| `currency` | No | 3 letters. Defaults to USD. Totals only add up your reporting currency |
| `status` | No | `RECEIVED` (default), `PLEDGED` or `WRITTEN_OFF` |
| `giftType` | No | `ONE_TIME` (default), `RECURRING`, `PLEDGE_PAYMENT`, `GRANT_PAYMENT`, `MATCHING_GIFT`, `IN_KIND` |
| `paymentMethod` | No | `CHECK`, `CARD`, `BANK_TRANSFER`, `CASH`, `DAF_OR_STOCK`, `ONLINE_PLATFORM`, `OTHER` |
| `referenceNumber` | **Strongly recommended** | The payment ID or check number. Sending the same one twice never creates a second gift |
| `campaignName` | No | Linked only if a campaign has exactly this name |
| `designation` | No | Free text |
| `isAnonymous` | No | `true` or `false` |

## What comes back

| Status | Meaning |
|---|---|
| **201** `{"status":"created", ...}` | The gift was recorded |
| **200** `{"status":"duplicate", ...}` | A gift with that reference number already exists. Nothing was added |
| **400** `{"errors":["amount must be a number greater than 0.", ...]}` | Something was wrong. Every problem is listed so you can fix them together |
| **401 or 403** | The API key is missing, wrong or was deleted |

## Zapier example

1. Trigger: your payment tool, "New Payment".
2. Action: **Webhooks by Zapier > POST**.
3. URL: the address above. Payload Type: **json**.
4. Data: map `email`, `amount`, `firstName`, `lastName`, and `referenceNumber` (the payment's ID) from the trigger. Add `giftDate` from the payment date.
5. Headers: `Authorization` = `Bearer YOUR_API_KEY`.
6. Turn on a test with a small real payment, then check **Fundraising > Donations**.

Many payment tools send the amount in **cents**, for example `5000` for $50. Divide by 100 in Zapier (a "Formatter" step) before sending.

## Safety

- Everything arriving through this route is checked before anything is saved.
- Because `referenceNumber` stops duplicates, a retried or double-fired Zap is safe.
- Anyone with the key can add gifts, so keep it private and use a separate key per tool.
- This route only **adds** gifts. It cannot read, change or delete anything.
