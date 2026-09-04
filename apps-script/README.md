# ACS Apps Script backend — v0.3.2 Simple

Files to copy into the Apps Script project bound to the ACS backend Google Sheet:

- `Schema.gs`
- `SheetDb.gs`
- `Auth.gs`
- `Api.gs`
- `WhatsApp.gs`
- `appsscript.json`

## Existing v0.3 installation

Replace the Apps Script files, save, then run `setupSheets()` once. The upgrade is additive: missing columns are appended and your existing rows are not deleted/reordered. Redeploy the Web App using **Manage deployments → Edit → New version**.

The simplified workflow is: **Appointment → Inspection → optional Job Card → Bill**. Saving the bill is one batched backend call and automatically writes bill lines, reduces stock, adds stock movements, saves service history, completes the job and optionally creates a reminder.

Public access is required for website booking. Staff APIs still require the ACS email/password session token.
