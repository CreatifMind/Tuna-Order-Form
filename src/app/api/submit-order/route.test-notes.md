# Submit Order API Notes

This API route intentionally owns all sensitive order work:

- It validates request data on the server.
- It recalculates official product totals from the server-side product catalog.
- It appends successful orders to Google Sheets.
- It does not send customer or admin emails.

Frontend totals are used only for customer experience and are never trusted as the official total.
