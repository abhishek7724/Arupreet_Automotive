# ACS Digital v0.3.4

- Removed Google Sheets implementation badge from the product UI.
- Sync is automatic and silent while the app is open.
- Added lightweight data-version checks every 5 seconds instead of full-sheet reloads.
- Direct edits in the backend sheet trigger a data-version update through an installable on-edit trigger.
- Full data reload happens only when the version changed.
- Manual sync is now a small icon in the top-right corner.
- Settings now describes the connection as automatic data sync rather than exposing backend implementation details.
- App footer no longer advertises Google Sheets.
