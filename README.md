# Tuna Pre-Order Form

Responsive Next.js order form for premium tuna pre-orders, designed for Vercel deployment.

## Architecture

```text
Customer fills in order form
-> Frontend sends form data to /api/submit-order
-> Backend API route validates the form data
-> Backend API route recalculates the official order total
-> Backend API route generates a unique order ID
-> Backend API route saves the order as a new row in Google Sheets
-> Backend API route sends confirmation email to the customer using Resend
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
├── next.config.ts
├── package.json
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

## Environment Variables

Add these to `.env.local` for local development and to the Vercel project environment variables for production:

```bash
RESEND_API_KEY=
FROM_EMAIL=
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_SHEET_NAME=
```

- `RESEND_API_KEY`: Resend API key from the Resend dashboard.
- `FROM_EMAIL`: Verified sender email/domain in Resend, for example `orders@yourdomain.com`.
- `GOOGLE_SHEETS_CLIENT_EMAIL`: Service account email from Google Cloud.
- `GOOGLE_SHEETS_PRIVATE_KEY`: Service account private key. If copied into `.env.local`, keep newline characters as `\n`; the API route converts them back with `.replace(/\\n/g, "\n")`.
- `GOOGLE_SHEETS_SPREADSHEET_ID`: The ID from the Google Sheet URL.
- `GOOGLE_SHEETS_SHEET_NAME`: The tab name, for example `Orders`.

Do not prefix these variables with `NEXT_PUBLIC_`. They are server-only secrets.

## Google Sheet Header Setup

Create a Google Sheet tab with this header row:

```text
Timestamp | Order ID | Full Name | Email Address | Mobile Number | Collection Method | Remarks | Selected Products | Total Amount | Deposit Amount | Terms Accepted
```

The API appends each successful order as a new row. The `Selected Products` cell is written in a readable format such as:

```text
Tuna Block Sale - 2kg - RM660; Premium Cut Akami - 1kg - RM900
```

## Google Service Account Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Enable the Google Sheets API for the project.
4. Create a service account.
5. Create a JSON key for that service account.
6. Copy `client_email` into `GOOGLE_SHEETS_CLIENT_EMAIL`.
7. Copy `private_key` into `GOOGLE_SHEETS_PRIVATE_KEY`.
8. Open the target Google Sheet and share it with the service account email as an editor.
9. Copy the spreadsheet ID from the URL into `GOOGLE_SHEETS_SPREADSHEET_ID`.
10. Set `GOOGLE_SHEETS_SHEET_NAME` to the exact tab name.

## Resend Setup

1. Create a Resend account at [resend.com](https://resend.com/).
2. Verify your sending domain or sender email.
3. Create an API key.
4. Add it as `RESEND_API_KEY`.
5. Add your verified sender as `FROM_EMAIL`.

This app sends only the customer confirmation email. It does not send admin notification emails.

## Vercel Deployment

1. Push this repo to GitHub.
2. Import or connect the GitHub repo in Vercel.
3. Add all environment variables in Vercel Project Settings.
4. Redeploy after adding or changing environment variables.

If the GitHub repo is already connected to Vercel, every push to the configured production branch will trigger a new deployment.

## Security Checks

- Resend is imported only in `src/app/api/submit-order/route.ts`.
- Google APIs are imported only in `src/app/api/submit-order/route.ts`.
- The frontend submits form data only to `/api/submit-order`.
- The backend recalculates official totals from fixed server-side prices.
- Google Sheets credentials and Resend keys are never exposed to browser code.
- No admin notification email is sent.
- Every successful API submission is appended to Google Sheets before the customer email is sent.
