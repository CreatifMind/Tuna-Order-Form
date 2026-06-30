import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

type CustomerPayload = {
  fullName?: unknown;
  email?: unknown;
  mobile?: unknown;
  collectionMethod?: unknown;
  remarks?: unknown;
  termsAccepted?: unknown;
};

type ProductPayload = {
  productId?: unknown;
  weight?: unknown;
};

type ProductConfig = {
  id: string;
  name: string;
  pricePerKg: number;
};

const productCatalog: ProductConfig[] = [
  { id: "tuna-block-sale", name: "Tuna Block Sale", pricePerKg: 330 },
  { id: "premium-cut-otoro", name: "Premium Cut Otoro", pricePerKg: 1500 },
  { id: "premium-cut-chutoro", name: "Premium Cut Chutoro", pricePerKg: 1300 },
  { id: "premium-cut-akami", name: "Premium Cut Akami", pricePerKg: 900 }
];

const catalogById = new Map(productCatalog.map((product) => [product.id, product]));

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0
  }).format(value);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function generateOrderId() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TUNA-${datePart}-${randomPart}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function appendOrderToSheet(row: Record<string, string>) {
  const response = await fetch(requireEnv("GOOGLE_APPS_SCRIPT_URL"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      secret: requireEnv("GOOGLE_APPS_SCRIPT_SECRET"),
      row
    })
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Google Apps Script request failed: ${response.status} ${responseText}`);
  }

  try {
    const result = JSON.parse(responseText) as { success?: boolean; error?: string };

    if (!result.success) {
      throw new Error(result.error || "Google Apps Script did not confirm success.");
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid Google Apps Script response: ${responseText}`);
    }

    throw error;
  }
}

async function sendCustomerConfirmationEmail({
  email,
  fullName,
  orderId,
  selectedProducts,
  totalAmount,
  depositAmount,
  collectionMethod,
  remarks
}: {
  email: string;
  fullName: string;
  orderId: string;
  selectedProducts: Array<ProductConfig & { weight: number; subtotal: number }>;
  totalAmount: number;
  depositAmount: number;
  collectionMethod: string;
  remarks: string;
}) {
  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const fromEmail = requireEnv("FROM_EMAIL");

  const safeFullName = escapeHtml(fullName);
  const safeCollectionMethod = escapeHtml(collectionMethod);
  const safeRemarks = escapeHtml(remarks);
  const productRows = selectedProducts
    .map(
      (product) => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(product.name)}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${product.weight}kg</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${formatCurrency(product.pricePerKg)} / kg</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(product.subtotal)}</td>
        </tr>`
    )
    .join("");

  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: `Your Tuna Pre-Order Confirmation - ${orderId}`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#18201f;line-height:1.6;max-width:680px;margin:0 auto;">
        <h1 style="color:#074a45;">Tuna Pre-Order Confirmation</h1>
        <p>Hi ${safeFullName},</p>
        <p>Thank you for your order. We have received your tuna pre-order details.</p>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <thead>
            <tr style="background:#eef5f3;text-align:left;">
              <th style="padding:10px;">Product</th>
              <th style="padding:10px;">Weight</th>
              <th style="padding:10px;">Price</th>
              <th style="padding:10px;text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${productRows}</tbody>
        </table>
        <p><strong>Total order amount:</strong> ${formatCurrency(totalAmount)}</p>
        <p><strong>50% deposit amount:</strong> ${formatCurrency(depositAmount)}</p>
        <h2 style="color:#074a45;">Payment Instructions</h2>
        <p><strong>Bank Name:</strong> [Insert Bank Name]<br />
        <strong>Account Name:</strong> [Insert Account Name]<br />
        <strong>Account Number:</strong> [Insert Account Number]</p>
        <p>Please complete the 50% deposit payment and upload or send the payment slip after submitting the form.</p>
        <p><strong>Collection method:</strong> ${safeCollectionMethod}</p>
        ${safeRemarks ? `<p><strong>Remarks:</strong> ${safeRemarks}</p>` : ""}
        <p>Thank you. We look forward to serving you at the event.</p>
      </div>
    `
  });
}

function methodNotAllowed() {
  return jsonError("Method not allowed. Please submit orders using POST.", 405);
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;

export async function POST(request: NextRequest) {
  let payload: { customer?: CustomerPayload; products?: ProductPayload[] };

  try {
    payload = await request.json();
  } catch {
    return jsonError("Invalid JSON request body.");
  }

  const customer = payload.customer ?? {};
  const fullName = asTrimmedString(customer.fullName);
  const email = asTrimmedString(customer.email).toLowerCase();
  const mobile = asTrimmedString(customer.mobile);
  const collectionMethod = asTrimmedString(customer.collectionMethod);
  const remarks = asTrimmedString(customer.remarks);
  const termsAccepted = customer.termsAccepted === true;

  if (!fullName || !email || !mobile || !collectionMethod) {
    return jsonError("Full name, email, mobile number, and collection method are required.");
  }

  if (!emailPattern.test(email)) {
    return jsonError("Please enter a valid email address.");
  }

  if (!termsAccepted) {
    return jsonError("Terms and conditions must be accepted.");
  }

  if (!Array.isArray(payload.products)) {
    return jsonError("Product selections are required.");
  }

  const weightsByProductId = new Map<string, number>();

  for (const item of payload.products) {
    const productId = asTrimmedString(item.productId);
    const weight = Number(item.weight);

    if (!catalogById.has(productId) || !Number.isInteger(weight) || weight < 0 || weight > 10) {
      return jsonError("One or more product selections are invalid.");
    }

    weightsByProductId.set(productId, weight);
  }

  const selectedProducts = productCatalog
    .map((product) => {
      const weight = weightsByProductId.get(product.id) ?? 0;

      return {
        ...product,
        weight,
        subtotal: weight * product.pricePerKg
      };
    })
    .filter((product) => product.weight > 0);

  if (selectedProducts.length === 0) {
    return jsonError("Please select at least one product.");
  }

  const totalAmount = selectedProducts.reduce((sum, product) => sum + product.subtotal, 0);
  const depositAmount = totalAmount * 0.5;
  const orderId = generateOrderId();
  const timestamp = new Date().toISOString();
  const selectedProductsSummary = selectedProducts
    .map(
      (product) =>
        `${product.name} - ${product.weight}kg - ${formatCurrency(product.subtotal)}`
    )
    .join("; ");

  try {
    await appendOrderToSheet({
      Timestamp: timestamp,
      "Order ID": orderId,
      "Full Name": fullName,
      "Email Address": email,
      "Mobile Number": mobile,
      "Collection Method": collectionMethod,
      Remarks: remarks,
      "Selected Products": selectedProductsSummary,
      "Total Amount": formatCurrency(totalAmount),
      "Deposit Amount": formatCurrency(depositAmount),
      "Terms Accepted": termsAccepted ? "Yes" : "No"
    });

    await sendCustomerConfirmationEmail({
      email,
      fullName,
      orderId,
      selectedProducts,
      totalAmount,
      depositAmount,
      collectionMethod,
      remarks
    });
  } catch (error) {
    console.error("Order submission failed", error);
    return jsonError("Unable to submit order. Please try again later.", 500);
  }

  return NextResponse.json({
    success: true,
    orderId
  });
}
