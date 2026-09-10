# ACS mobile update for v0.4.1

Base: local v0.4.1 project at commit e9f7a61 (Simplify ACS billing UI v0.4.1).

## Deploy
1. Back up your current frontend folder.
2. Extract ACS-v0.4.1-mobile-frontend-update.zip over that folder, keeping its directory structure. Publish the updated frontend using your existing hosting/GitHub deployment process.
3. Refresh the website and Operations; clear cached site files if the old layout remains.
4. On your phone, verify menu navigation, booking date/time, an appointment, inspection and billing.

No Google Sheets setup, schema migration, Apps Script replacement or Apps Script redeployment is needed. Keep your existing config.js and endpoint settings. The complete ZIP includes the unchanged configuration from the local v0.4.1 source; existing deployments should use the frontend-update ZIP.

## Exact changes relative to the supplied local v0.4.1 source
Modified runtime files:
- index.html — accessible mobile navigation toggle, shared presentation script, phone keyboard hint.
- app.html — accessible Operations menu toggle and shared presentation script.
- styles.css — responsive layouts, touch targets, table cards, forms, internally scrolling dialogs and document previews. New mobile layout rules are screen-only.
Added runtime file:
- mobile.js — menu interactions and visible mobile table labels, including after automatic refreshes.
Modified validation file:
- tests/browser.test.cjs — removes obsolete purchase-cost test input (absent in v0.4.1); adds phone workflow and six-width navigation, page/dialog overflow checks and screenshots.
Added release document:
- MOBILE_UPDATE.md — this document.

No other source files changed. All Apps Script files, app.js, site.js, data libraries, configuration and images are byte-for-byte unchanged.

## Validation
- 28 static/backend and slot regression tests passed, including parsing shipped JavaScript and Apps Script.
- Chrome simulated-backend workflow passed at 390px: public booking, occupied-slot removal, cancellation, slot reuse, check-in, inspection, job card, simple billing, total calculation, inventory master creation, invoice and job closure.
- Public website and all nine Operations views checked at 360, 390, 430, 768, 1024 and 1440px; no horizontal page overflow.
- Appointment, vehicle, service, inventory, billing picker, inspection, stock and invoice dialogs checked at each width; no horizontal modal overflow.
- Navigation toggles exercised. No browser JavaScript errors.
- Job card, invoice and long invoice PDFs generated with the existing A4 print rules; phone-specific additions do not apply to print.
- Phone dashboard, public site and billing entry screenshots visually reviewed; cramped header corrected and browser checks rerun successfully.

These checks use Chrome and an in-memory Google backend substitute. Production Google authorization and real iOS/Android device keyboards were not tested. No production data was written or messages sent.

Run regression checks with Node.js:
  node --test tests/backend.test.cjs tests/slots.test.cjs
  node tests/browser.test.cjs
Browser checks need Playwright and Chrome installed (ACS_PLAYWRIGHT may point to an existing Playwright package).

## Packages
The complete ZIP contains the full source including backend and tests, excluding Git metadata and generated test output. The frontend-update ZIP contains only index.html, app.html, styles.css, mobile.js and this guide. It intentionally excludes config.js.
