# ACS Digital v0.3.4 — Simple Google Sheets + Apps Script Edition

This build keeps the email/password access from v0.3 but simplifies the workshop flow for ACS.

## Final workflow

**Appointment → Inspection → optional Job Card → Bill**

There is no appointment approval, estimate approval, Awaiting Approval, In Service or Ready stage.

### Appointment
- Website bookings appear directly in Operations as `Booked`.
- Workshop/phone bookings can be entered manually.
- When the car arrives, click **Inspect**.

### Inspection / Job Card
- Record odometer, customer complaint and inspection findings.
- **Generate Job Card** is optional and printable.
- Or go directly to **Generate Bill**.

### Billing
- Add Part, Consumable, Labour or Other lines.
- Selecting a stocked item automatically fetches its saved UOM and selling rate.
- Inventory items compatible with the current car are sorted first and marked `✓`.
- Saving the bill automatically:
  - saves the final parts/labour used,
  - reduces stock,
  - writes stock movement history,
  - creates the invoice,
  - saves vehicle service history,
  - completes the service job,
  - optionally creates a next-service reminder.

## Inventory changes

Each item now supports:
- SKU and category
- UOM
- on-hand and reorder level
- latest purchase cost
- selling rate
- Universal flag
- multiple compatible brand/model tags, e.g. `Hyundai i20, Hyundai Creta, Kia Sonet`

UOM and latest purchase cost are remembered. On future stock receipts the system pre-fills them. Previous UOMs and purchase costs are available as browser LOV/history suggestions.

## Faster sync

v0.3.4 removes the expensive full reload after every save:
- first login loads the Google Sheet dataset once,
- subsequent normal writes update an in-browser cache,
- bill save is one batched Apps Script request instead of many frontend requests,
- Apps Script keeps a short read cache,
- data sync is automatic while ACS Operations is open; the small ↻ icon in the top-right is only a manual fallback.

## Upgrade an existing v0.3 installation

1. Back up the Google Sheet.
2. Replace the Apps Script project files with the files in `apps-script/`.
3. Save and run `setupSheets()` once.
4. Apps Script will append the new columns without deleting existing data.
5. Redeploy the Web App as a new version.
6. Replace the frontend with this v0.3.4 folder (keep your Apps Script `/exec` URL in `config.js` or Setup).
7. Sign in with the same email/password you already use.

You do **not** need to recreate the owner account.
