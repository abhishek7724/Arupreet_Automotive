# ACS v0.4.0 checks

Run from this folder:

```text
node --test tests/backend.test.cjs
node tests/browser.test.cjs
```

Backend tests need Node.js only. Browser tests need Playwright and installed Chrome; point ACS_PLAYWRIGHT to your Playwright package if it is not locally installed. ACS_BROWSER_CHANNEL defaults to chrome. Browser output is written to test-output/.

Both suites use sample in-memory data. The browser intercepts Apps Script requests and exercises the shipped backend functions through service substitutes. Tests never call the production API.

Coverage includes mandatory booking fields, date/time checks, slot conflicts, retry IDs, staff cancellation/audit, check-in guards, item creation/reuse/UOM/cost/tags, stock/history writes, invoice closure/idempotency/rollback, removed reminder dependencies, desktop/mobile UI and A4 printing. PDF previews include short documents and a 65-line invoice.

Real Google authentication, network/CORS, Apps Script locks across Google executions, quotas and deployment permissions require the live checklist in RELEASE_v0.4.0.md. No production deployment or live data mutation was performed for this release.
