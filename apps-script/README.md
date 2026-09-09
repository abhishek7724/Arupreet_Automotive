# ACS Apps Script v0.4.0

For an existing installation replace **Api.gs**, **Schema.gs**, **SheetDb.gs** and add **Booking.gs**. Keep **Auth.gs**, **WhatsApp.gs**, and **appsscript.json** unchanged.

Run **setupSheets() once** to append cancellation fields and the service work list. Existing data, credentials and configuration remain. Deploy a new version of the existing Web App before updating the website.

For a new installation use all seven files in this folder with a blank bound Google Sheet, run setupSheets(), then create the owner account with Auth.gs.

Read [the complete deployment guide](../RELEASE_v0.4.0.md), including the production verification checklist and the limitations of spreadsheet transactions and manual Sheet edits.
