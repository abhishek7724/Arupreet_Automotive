# ACS v0.4.0

- Required public booking Name, Mobile, Vehicle, Preferred Date, Time, and What do you want checked. Added optional Email with the exact requested helper text and persisted email on customer records.
- Six equal 80-minute windows across 10 AM-6 PM. Public backend availability endpoint, polling, date-response guards, fail-closed availability, lock-protected checks for public and staff bookings, and public retry IDs.
- Staff appointment cancellation retains its row, reason, staff ID and timestamp; writes an audit entry and releases the slot. Checked-in services cannot be cancelled as an uninspected booking.
- Matching job card/invoice layouts with configured business header, customer/vehicle details, odometer, numbered work list and Job No.; A4 and multipage printing.
- Separate editable work list on inspection; invoice items no longer replace the job card task list.
- Invoice save sets Service Job status to Closed, preserves history and stock issues, and returns an existing invoice safely on retry. Protected billed jobs/lines from generic edits and added preflight validation/ordinary-error rollback.
- Part/Consumable invoice entry accepts new items, creates missing masters or reuses normalized names, and remembers cost/selling rate/UOM while preserving compatibility tags. Labour/Other do not create masters.
- Removed Reminders UI and operational backend reads/writes, retaining legacy sheets/columns.
- Preserved current website polish, Google architecture, email/password accounts, WhatsApp, simplified workflow and 5-second Operations sync. Fixed billing total recalculation, scoped cached snapshots to backend/user, kept auth failures from falling back to old snapshots, and avoided skipping other staff changes after a local save.
- Added backend/browser regression tests and complete/update-only release packaging. See `RELEASE_v0.4.0.md` for exact Apps Script replacement files, required additive setup, limitations and deployment checks.
