# ACS v0.4.1 Billing UI Update

Replace only these frontend files in your existing v0.4.0 project:
- `app.js`
- `styles.css`

No Google Sheet schema change is required.
No Apps Script backend file needs to be replaced for this billing simplification.

The existing v0.4.0 Apps Script backend already silently creates an Inventory Item Master when a new Part or Consumable is entered on an invoice.

After replacing the files, hard refresh the browser (`Ctrl + Shift + R`).
