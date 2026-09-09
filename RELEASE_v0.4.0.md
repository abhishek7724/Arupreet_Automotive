# ACS v0.4.0 - upgrade guide

Built from the current `abhishek7724/Arupreet_Automotive` repository at commit `420a030f37ff37adceee1f44d9f572e5acb312cc`, including the latest public-site styling and connection fixes. Google Sheets, Google Apps Script, existing email/password accounts and WhatsApp configuration are retained.

## Deploy an existing installation

1. Back up the Google Sheet and existing website files. Apply this release during a brief period without staff billing or booking activity.
2. Open the existing Sheet's **Extensions > Apps Script**. Replace the entire contents of **`Api.gs`, `Schema.gs`, and `SheetDb.gs`** with the corresponding files in `apps-script/`.
3. Add a new script file **`Booking.gs`** and paste `apps-script/Booking.gs`. Keep **`Auth.gs`, `WhatsApp.gs`, and `appsscript.json`** unchanged. Do not paste a second copy of functions into another file.
4. **Run `setupSheets()` once. Yes, it is required.** It appends these columns without deleting/reordering existing rows or columns:
   - `Appointments`: `cancelled_at`, `cancelled_by`, `cancellation_reason`.
   - `Service_Jobs`: `work_to_be_done`.
   Existing legacy columns and the Reminders sheet remain. Setup also clears the data cache and retains/installs the sheet-edit sync trigger. Do not recreate owner/staff accounts.
5. Check the existing **Config** sheet's `workshop_name`, `address`, `phone`, and `timezone`. The printed headers use these values. Enter the complete postal address if only “Electronic City, Bengaluru” is currently configured. Existing Config values are preserved; booking capacity is now fixed at six even if the old `daily_capacity` value is three.
6. **Deploy > Manage deployments > select the existing Web App > Edit > New version > Deploy.** Retain execute-as **Me** and access **Anyone** so public booking can reach it; staff actions still require an ACS session. Reusing the deployment retains its `/exec` URL. Retire any other older writable deployments pointing to the same Sheet.
7. Extract **ACS-v0.4.0-update-only.zip** over the website repository root, preserving its directories. This ZIP includes modified files and new dependencies; it excludes `config.js` and unchanged images. Or use the complete ZIP, retaining your deployed `config.js` if it differs. Commit/push the website files through the existing GitHub Pages process.
8. After hosting finishes, hard-refresh the public website and Operations. Keep the existing `/exec` URL and saved local Setup configuration. A ping at `/exec?action=ping` should show version **0.4.0**.

For a new installation, create a blank Google Sheet, copy all seven files from `apps-script/` into its bound script project, run `setupSheets()`, create an owner using `Auth.gs`, then deploy/configure the Web App as above. No separate spreadsheet-template file is needed.

## Booking and cancellation behavior

| Slot start stored in Sheets | Public arrival window |
| --- | --- |
| 10:00 | 10:00 AM - 11:20 AM |
| 11:20 | 11:20 AM - 12:40 PM |
| 12:40 | 12:40 PM - 2:00 PM |
| 14:00 | 2:00 PM - 3:20 PM |
| 15:20 | 3:20 PM - 4:40 PM |
| 16:40 | 4:40 PM - 6:00 PM |

These are six contiguous 80-minute arrival windows, not six points including an additional 6 PM start. Availability refreshes on date selection and every 10 seconds while visible. Staff and public booking writes share the same Apps Script lock; Sheets writes are flushed before releasing it. The save rechecks availability, so a stale browser selection cannot double-book. Public retries reuse a request ID.

Only Cancelled appointments release a slot. Checked In and Completed appointments keep their window reserved. Legacy bookings within the window, such as 10:30, block the containing slot. A legacy unrecognizable time conservatively blocks the date; review it in Sheets. Out-of-hours legacy bookings stay in history without occupying an in-hours slot. Use Operations for new bookings: manual spreadsheet edits or separate script projects do not participate in the application lock.

In Operations > Appointments, select **Cancel appointment**, enter an optional reason, then confirm. Cancellation is available before inspection/check-in; after check-in manage the service job. The appointment stays visible with timestamp, staff ID and reason, with an Audit_Log entry. Generic API deletion or rescheduling cannot bypass this flow.

## Inspection, documents and billing

The workflow remains **Appointment > Inspection > optional Job Card > Invoice**; walk-ins can start at Inspection. In **Add/Edit inspection**, enter **Work to be done**, one task per line. Job cards number these tasks. Older jobs fall back to their inspection notes/customer complaint until a work list is saved. Generating a job card saves that list separately from invoice lines.

Job cards and invoices use matching A4 print layouts with configured business details, customer/vehicle information, odometer, and Job No. Use **Print / Save PDF**, A4, default scale, and turn off the browser's own header/footer. Long tables repeat their column headers across pages.

Saving an invoice, including Pending payment, closes the Service Job, completes the linked appointment, records vehicle history and issues inventory. A retry returns the existing invoice without issuing stock again. Closed billed jobs and their invoice lines cannot be reopened/edited through the old generic API. Existing Completed jobs are treated as closed in Operations without rewriting historical rows.

For Part/Consumable lines, select an inventory item or type a new description, UOM, selling rate and optional purchase cost. New names create an active master on save. Matching is case-insensitive with surrounding/repeated whitespace normalized; existing explicit item selection takes precedence. Ambiguous duplicate masters or conflicting UOMs require staff to select/correct the intended item. Labour/Other never create masters. Existing compatibility tags and costs are retained unless cost is explicitly supplied; the latest selling rate is remembered. New masters start untagged and can be tagged by brand/model in Inventory. Existing UOM and purchase-cost history suggestions remain available.

Stock retains the prior behavior: on-hand cannot go below zero, while the issue movement records the full quantity used. Auto-created masters begin at zero stock; record supplier receipts/adjustments to establish stock. Validation occurs before billing writes, and ordinary storage errors trigger compensating rollback. Sheets is not an ACID database: execution termination, quota exhaustion, or a failed rollback can still require an administrator to reconcile the affected Job No. before retrying.

Email is optional and stored on the customer record; its helper text is exactly `(enter to receive receipt and job card)`. This release adds no automatic email sender. Printable documents and the existing WhatsApp sharing behavior remain available.

Reminders are removed from navigation, invoice entry, dashboard/product flows, bulk loading and API table access. Historical Reminders rows and legacy next-service columns are preserved.

## Verify after deployment

1. Sign in with an existing staff email/password. Verify recent records load and an Operations change appears in another open staff browser after the next sync (polling every 5 seconds, subject to Apps Script latency).
2. Choose a future booking date. Confirm exactly six available windows on a blank day and all required fields, with optional Email and Registration.
3. In two separate browser sessions, select the same available window. Submit both: only one should succeed; the other should show the slot conflict and refresh availability. This is a live deployment check, not performed against your production Sheet here.
4. Cancel that uninspected appointment in Operations. Confirm history/audit remains and a new public session sees its slot again.
5. Inspect a test vehicle, save a multi-line work list, and print a job card. Also verify direct billing without generating a job card.
6. Invoice a new Part, a new Consumable, and Labour. Confirm only two masters are created; repeating a name reuses its master. Verify quantity deduction, cost/UOM/tag retention, invoice Job No., service history, Closed status, and no duplicate effects on retry.
7. Check there is no Reminders navigation/field. Keep its old Sheet data.

## Validation performed locally

- Backend regression suite in `tests/backend.test.cjs` uses the shipped Apps Script code with in-memory Google service substitutes.
- Browser regression in `tests/browser.test.cjs` uses Chrome with that simulated backend: public booking, hidden occupied slots, staff cancellation, check-in, work list, job card, invoice entry, master creation and closure.
- Desktop/mobile layout checks and A4 PDF previews, including a 65-line multipage invoice. No browser JavaScript errors in the tested flow.
- Tests do not deploy Apps Script or prove real Google authorization, quotas, network/CORS, email/password login, or simultaneous Google executions. `Auth.gs` is unchanged. Run the short live checks above after deployment.

Run backend checks with `node --test tests/backend.test.cjs`. Browser checks require the `playwright` package and installed Chrome: `node tests/browser.test.cjs`. `ACS_PLAYWRIGHT` may point to a local Playwright package; `ACS_BROWSER_CHANNEL` defaults to `chrome`. Browser fixtures use sample data and never call the production API.

Google references: [Lock service and flush-before-release](https://developers.google.com/apps-script/reference/lock/lock), [Web App deployment](https://developers.google.com/apps-script/guides/web).
