# ACS Digital v0.4.0

Google Sheets + Google Apps Script workshop operations and public booking.

**Appointment > Inspection > optional Job Card > Invoice**

Start with [RELEASE_v0.4.0.md](RELEASE_v0.4.0.md) for deployment, exact Apps Script replacements, the required additive setupSheets() upgrade, booking rules, invoice/item-master behavior and live verification steps.

- Six backend-controlled arrival windows, 10 AM-6 PM, with server-side conflict protection.
- Audited staff appointment cancellation and released slots.
- Matching printable job cards/invoices and automatic job closure on billing.
- Automatic Part/Consumable masters, preserved inventory history/UOM/cost and compatibility tags.
- Existing email/password access, WhatsApp configuration, fast auto-sync and current public-site design.
- Reminders retired from the product; historical sheet data retained.

[Changelog](CHANGELOG_v0.4.0.md) · [Testing](TESTING.md)

No build step is required. Publish the HTML/CSS/JavaScript and assets using the existing GitHub Pages workflow. Keep the existing config.js URL when upgrading. Tests and Apps Script sources do not need to be published as website assets.
