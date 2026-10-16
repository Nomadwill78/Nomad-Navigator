# Importing from spreadsheets

Use these files to bring donors, gifts and volunteers into Compass from a spreadsheet. Twenty can import any CSV, Excel (.xlsx) or older Excel (.xls) file, up to 10,000 rows at a time.

## How to import

1. Open the list you are importing into (for example **Donations**).
2. Click the three dots at the top right (the command menu) and choose **Import records**.
3. Upload your file. Twenty shows you each column and asks which field it belongs to. Match them as named.
4. Twenty highlights any row with a problem in yellow. Fix them on screen.
5. Confirm.

Each file can hold **one kind of record only**.

## The order matters

Do them in this order, because later files point at earlier ones:

| Order | File | Goes into | Links to |
|---|---|---|---|
| 1 | `1-companies-and-funders.csv` | **Companies** | |
| 2 | `2-people-donors-and-prospects.csv` and `3-volunteers.csv` | **People** | Companies, by *Domain name* |
| 3 | `campaigns.csv` | **Campaigns** | |
| 4 | `4-donations.csv` | **Donations** | Donors by **email**, organizations by **domain name** |
| 5 | `5-volunteer-hours.csv` | **Volunteer hours** | Volunteers by **email** |

Twenty links records by a unique value: the **email** for a person, the **domain name** for a company.

## Rules that keep your data clean

- **Delete the example row** in each file. Every example uses an address ending in `.invalid`, which can never receive mail.
- **Leave the `Donation` and `Shift` columns empty.** Compass names each gift (for example "Maria Lopez · $250 · 2025-11-15") for you.
- **Use the exact wording from the app for dropdowns**, for example *Received*, *One-time gift*, *Check*, *OK to contact*. Twenty highlights any it does not recognize.
- **Dates look like `2026-09-14`** (year, month, day).
- **Amounts are plain numbers**, no `$` or commas: `1500` or `1500.50`.
- **Leave empty cells empty.** Do not type "N/A" or "none".
- **Do not import the calculated columns** (lifetime giving, giving status, totals, KPI progress). Compass works them out. Importing the donations is enough.

## What happens when you import gifts

Compass reacts to every gift as it arrives: it updates the donor's totals and giving status, and the campaign totals. It will create **thank-you reminders only for gifts dated in the last 14 days**, so importing five years of history does not create a pile of overdue tasks.

If a donor was marked **Do not contact** before you import, they get no reminders.

## Linking gifts to campaigns and grants

Campaigns and grants cannot be linked from a spreadsheet by name. After importing, open **Donations**, select the gifts for a campaign, and set the **Campaign** field for all of them at once. Or record gifts through the [donation route](../docs/CONNECTING_OTHER_TOOLS.md), which can link by campaign name.

## Importing very large lists

For more than 10,000 rows, split the file or use Twenty's API import. See Twenty's data migration guide: <https://docs.twenty.com/user-guide/data-migration/overview>.
