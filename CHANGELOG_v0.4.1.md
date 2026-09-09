# ACS v0.4.1 — Simplified Billing

- Reverted Billing to a simple line-entry experience.
- Each bill line now asks only for Type, Item/Description, Qty, UOM and Rate.
- Removed Purchase Cost and inventory-master detail prompts from Billing.
- Existing Part/Consumable names are suggested; selecting an existing item auto-fills its UOM and selling rate.
- A new Part/Consumable can be typed directly. Saving the invoice silently creates the Inventory Item Master in the Apps Script backend.
- New masters use available bill/history defaults; additional master details can be maintained later from Inventory.
- Labour and Other lines do not create inventory masters.
- Inventory deduction, stock movement, service history, invoice generation, and automatic Job closure remain unchanged.
