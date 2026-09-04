# Deploy / upgrade ACS v0.3.2

## Existing v0.3 Google Sheets backend

You can keep your current Sheet and current user account.

1. Make a backup copy of the Sheet.
2. In Apps Script replace `Schema.gs`, `SheetDb.gs`, `Api.gs`, `Auth.gs`, `WhatsApp.gs` and `appsscript.json` with the v0.3.2 files.
3. Save.
4. Run `setupSheets()` once. Missing v0.3.2 columns are appended; existing columns/data remain.
5. Go to **Deploy → Manage deployments → Edit → New version → Deploy**.
6. Keep/copy the Web App `/exec` URL.
7. Put that URL in frontend `config.js` or `setup.html`.
8. Deploy the frontend files to your hosting.

## New installation

1. Upload/open `ACS_Google_Sheets_Backend_Template.xlsx` as Google Sheets.
2. Open **Extensions → Apps Script**.
3. Create/copy the files from `apps-script/`.
4. Run `setupSheets()`.
5. Create your initial owner using the same v0.3 email/password method already documented in `Auth.gs`.
6. Deploy as Web App: execute as **Me**, access **Anyone** (needed for public website booking).
7. Configure the `/exec` URL in the frontend.

## WhatsApp

Click-to-chat works immediately. Automated Meta WhatsApp can still be configured through Apps Script Script Properties using the existing `WhatsApp.gs` helper.
