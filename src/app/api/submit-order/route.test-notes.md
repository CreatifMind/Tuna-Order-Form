# Submit Order API Notes

This API route intentionally owns all sensitive order work:

- It validates request data on the server.
- It recalculates official product totals from the server-side product catalog.
- It appends successful orders to Google Sheets.
- It sends the customer confirmation email through Gmail SMTP with Nodemailer.
- It does not send admin notification emails.

Frontend totals are used only for customer experience and are never trusted as the official total.
