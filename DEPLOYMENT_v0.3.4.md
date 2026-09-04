# Upgrade to v0.3.4

1. Replace Apps Script files: Api.gs, SheetDb.gs, Schema.gs (the other existing Apps Script files can stay, but using the full folder is safest).
2. Save the Apps Script project.
3. Run `setupSheets()` once. This also installs the `onAcsSheetEdit_` trigger used to detect direct Google Sheet edits. Approve permissions if prompted.
4. Deploy a new Web App version from Deploy > Manage deployments.
5. Replace the frontend files with the v0.3.4 frontend. Keep your existing `config.js` if it already contains the working `/exec` URL.
6. Hard refresh the browser.

The browser performs a lightweight version check every 5 seconds only while the tab is visible. It reloads the full dataset only when data has actually changed. Focus/return to the tab also triggers an immediate check.
