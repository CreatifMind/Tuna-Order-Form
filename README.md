# Tuna Pre-Order Form

Responsive Next.js order form for premium tuna pre-orders, designed for Vercel deployment.

## Architecture

```text
Customer fills in order form
-> Frontend sends form data to /api/submit-order
-> Backend API route validates the form data
-> Backend API route recalculates the official order total
-> Backend API route generates a unique order ID
-> Backend API route saves the order as a new row in Google Sheets through Apps Script
-> Backend API route sends confirmation email to the customer using Gmail SMTP
-> Frontend displays success or error message
```

Sensitive work happens only in `src/app/api/submit-order/route.ts`.

## Project Structure

```text
.
├── .env.local.example
├── .gitignore
├── README.md
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.mjs
├── package.json
├── public
│   └── images
│       ├── chutoro.jpg
│       ├── jemy-2026-logo.png
│       ├── otoro.jpg
│       └── tuna-block.jpeg
├── src
│   └── app
│       ├── api
│       │   └── submit-order
│       │       ├── route.test-notes.md
│       │       └── route.ts
│       ├── globals.css
│       ├── layout.tsx
│       └── page.tsx
└── tsconfig.json
```

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.local.example .env.local
```

Run locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Build check:

```bash
npm run build
```

## Vercel Environment Variables

Add these in Vercel:

Project -> Settings -> Environment Variables

```bash
GMAIL_ADDRESS=
GMAIL_APP_PASSWORD=
GOOGLE_APPS_SCRIPT_URL=
GOOGLE_APPS_SCRIPT_SECRET=
```

- `GMAIL_ADDRESS`: the Gmail address that sends customer confirmation emails, for example `yourbusiness@gmail.com`.
- `GMAIL_APP_PASSWORD`: a Google App Password generated for that Gmail account. Use the 16-character app password, not your normal Gmail password.
- `GOOGLE_APPS_SCRIPT_URL`: from Apps Script after deploying the script as a Web App.
- `GOOGLE_APPS_SCRIPT_SECRET`: any long random password you create yourself. Use the exact same value in the Apps Script `ORDER_FORM_SECRET`.

Do not prefix these variables with `NEXT_PUBLIC_`. They are server-only values.

## Google Sheet Header Setup

Create a Google Sheet and add this exact header row in row 1:

```text
Timestamp | Order ID | Full Name | Email Address | Mobile Number | Collection Method | Remarks | Selected Products | Total Amount | Deposit Amount | Terms Accepted
```

The API appends each successful order as a new row. The `Selected Products` cell is written in a readable format such as:

```text
Tuna Block Sale - 2kg - RM660; Premium Cut Akami - 1kg - RM900
```

## Free Google Apps Script Setup

This replaces Google Cloud service accounts. You only need the Google Sheet and an Apps Script Web App.

1. Open the Google Sheet.
2. Go to `Extensions -> Apps Script`.
3. Delete any starter code.
4. Paste this script:

```js
const ORDER_FORM_SECRET = "replace-this-with-a-long-random-secret";

const HEADERS = [
  "Timestamp",
  "Order ID",
  "Full Name",
  "Email Address",
  "Mobile Number",
  "Collection Method",
  "Remarks",
  "Selected Products",
  "Total Amount",
  "Deposit Amount",
  "Terms Accepted"
];

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");

    if (payload.secret !== ORDER_FORM_SECRET) {
      return jsonResponse({ success: false, error: "Unauthorized" });
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const row = HEADERS.map((header) => payload.row?.[header] || "");
    sheet.appendRow(row);

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}
```

5. Replace `replace-this-with-a-long-random-secret` with your own secret.
6. Save the script.
7. Click `Deploy -> New deployment`.
8. Select type: `Web app`.
9. Set `Execute as`: `Me`.
10. Set `Who has access`: `Anyone`.
11. Click `Deploy`.
12. Authorize the script when Google asks.
13. Copy the Web App URL. It ends with `/exec`.

Use these values in Vercel:

- `GOOGLE_APPS_SCRIPT_URL`: the Web App URL ending in `/exec`.
- `GOOGLE_APPS_SCRIPT_SECRET`: the same secret you put in `ORDER_FORM_SECRET`.

The Web App URL is public, but the backend sends the shared secret. Requests without the secret are rejected.

## Gmail SMTP Setup

1. Use or create the Gmail account that should send customer confirmation emails.
2. Turn on 2-Step Verification for that Google account.
3. Go to Google Account -> Security -> App passwords.
4. Create an app password for Mail.
5. Copy the generated 16-character password.
6. Add the Gmail address to Vercel as `GMAIL_ADDRESS`.
7. Add the 16-character app password to Vercel as `GMAIL_APP_PASSWORD`.

Use the app password exactly as Google shows it. Do not use your normal Gmail password.

This app sends only the customer confirmation email. It does not send admin notification emails.

## Vercel Deployment

1. Push this repo to GitHub.
2. Import or connect the GitHub repo in Vercel.
3. Add all environment variables in Vercel Project Settings.
4. Redeploy after adding or changing environment variables.

If the GitHub repo is already connected to Vercel, every push to the configured production branch will trigger a new deployment.

## Security Checks

- Nodemailer is imported only in `src/app/api/submit-order/route.ts`.
- Google Apps Script is called only from `src/app/api/submit-order/route.ts`.
- The frontend submits form data only to `/api/submit-order`.
- The backend recalculates official totals from fixed server-side prices.
- Apps Script URL and secret are never exposed to browser code.
- Gmail address and app password are never exposed to browser code.
- No admin notification email is sent.
- Every successful API submission is appended to Google Sheets before the customer email is sent.
