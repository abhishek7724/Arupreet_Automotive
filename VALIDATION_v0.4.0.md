# Validation record - ACS v0.4.0

Checked on 2026-09-09 against the release source.

- **28 local regression tests passed**: 24 backend/static checks and 4 asynchronous slot-widget checks. The tests execute shipped Apps Script functions using in-memory substitutes for Google services.
- **Chrome browser flow passed**: required/optional booking fields, exact helper text, public booking, hidden occupied slot, 390px mobile layout, staff cancellation/history, released slot reuse, check-in, inspection work list, job card, invoice entry, live total, master creation, stock/history writes and Closed status. No JavaScript page errors.
- **Print checks**: sample job card and invoice each rendered as one A4 page. A 65-line invoice rendered as seven pages, with repeated column headers and intact rows. Short document pages and first/continuation/final long-document pages were visually inspected using Poppler renders.
- **Static review**: all shipped .js and .gs files parse. No runtime reminder references remain outside retained legacy schema. Git whitespace/diff check passed.

Commands:

```text
node --test tests/backend.test.cjs tests/slots.test.cjs
node tests/browser.test.cjs
```

Limits: simulated backend tests do not prove production Google authorization, deployed endpoint/CORS, quotas, real Google concurrent execution, or live login. Existing Auth.gs and credentials were preserved. No production deployment, live booking, invoice, email or WhatsApp message was made. Complete the post-deployment checks in RELEASE_v0.4.0.md.
