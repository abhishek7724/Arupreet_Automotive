# ACS v0.3.2 testing checklist

1. Sign in using the existing ACS email/password.
2. From the public website, submit a booking.
3. Keep Operations open and confirm the booking appears automatically within a few seconds. The top-right ↻ icon is only a manual fallback.
4. Confirm it appears in Appointments as `Booked` with no approval action.
5. Click **Inspect** and enter odometer/complaint.
6. Add inspection findings.
7. Generate/print a Job Card (optional).
8. Click **Generate bill**.
9. Select a stocked item and confirm UOM + selling rate auto-fill.
10. Confirm compatible items for that make/model are marked `✓` and sorted first.
11. Add labour and save the bill.
12. Confirm the invoice is created, job becomes completed, vehicle history is saved and inventory on-hand is reduced.
13. Open Inventory → Stock on an item. Confirm UOM and latest purchase cost are prefilled and older costs appear as suggestions.
14. Add/edit compatibility tags and verify they affect bill item ordering.
15. Check that normal saves feel immediate and that direct backend edits appear automatically without a manual refresh.
