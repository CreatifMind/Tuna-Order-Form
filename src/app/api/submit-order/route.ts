import { NextRequest, NextResponse } from "next/server";

type CustomerPayload = {
  fullName?: unknown;
  email?: unknown;
  mobile?: unknown;
  remarks?: unknown;
  termsAccepted?: unknown;
};

type ProductPayload = {
  productId?: unknown;
  weight?: unknown;
  optionId?: unknown;
};

type WeightProductConfig = {
  kind: "weight";
  id: string;
  name: string;
  pricePerKg: number;
  minWeight: number;
};

type DonOptionConfig = {
  id: string;
  name: string;
  price: number;
};

type VariantProductConfig = {
  kind: "variant";
  id: string;
  name: string;
  options: DonOptionConfig[];
};

type ProductConfig = WeightProductConfig | VariantProductConfig;

type SelectedProduct = {
  name: string;
  detail: string;
  subtotal: number;
  minWeight?: number;
  weight?: number;
};

const productCatalog: ProductConfig[] = [
  { kind: "weight", id: "tuna-block-sale", name: "Tuna Block Sale", pricePerKg: 330, minWeight: 1 },
  { kind: "weight", id: "akami", name: "Akami", pricePerKg: 1000, minWeight: 1 },
  { kind: "weight", id: "chutoro", name: "Chutoro", pricePerKg: 1000, minWeight: 1 },
  { kind: "weight", id: "otoro", name: "Otoro", pricePerKg: 1500, minWeight: 1 },
  {
    kind: "variant",
    id: "maguro-don",
    name: "Maguro Don",
    options: [
      { id: "maguro-don", name: "Maguro Don", price: 150 },
      { id: "premium-maguro-don", name: "Premium Maguro Don", price: 170 },
      { id: "maguro-don-uni", name: "Maguro Don + Uni", price: 200 },
      { id: "maguro-don-ikura", name: "Maguro Don + Ikura", price: 200 },
      { id: "maguro-don-uni-ikura", name: "Maguro Don + Uni + Ikura", price: 250 }
    ]
  }
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

function getSubmissionErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Missing required environment variable")) {
    return "Order setup issue: Vercel is missing GOOGLE_APPS_SCRIPT_URL or GOOGLE_APPS_SCRIPT_SECRET for Production. Please add them and redeploy.";
  }

  if (message.includes("Unauthorized")) {
    return "Order setup issue: Google Apps Script rejected the secret. Please make sure GOOGLE_APPS_SCRIPT_SECRET matches ORDER_FORM_SECRET exactly.";
  }

  if (message.includes("did not return an order ID")) {
    return "Order setup issue: Google Apps Script is still using the old code. Please redeploy the latest Apps Script version that returns orderId.";
  }

  if (message.includes("Invalid Google Apps Script response")) {
    return "Order setup issue: Google Apps Script did not return JSON. Please check that the Web App URL ends with /exec and access is set to Anyone.";
  }

  if (message.includes("Google Apps Script request failed")) {
    return "Order setup issue: Google Apps Script could not save the order. Please check the Apps Script deployment and execution logs.";
  }

  return "Unable to submit order. Please try again later.";
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
    const result = JSON.parse(responseText) as {
      success?: boolean;
      error?: string;
      orderId?: string;
    };

    if (!result.success) {
      throw new Error(result.error || "Google Apps Script did not confirm success.");
    }

    if (!result.orderId) {
      throw new Error("Google Apps Script did not return an order ID.");
    }

    return result.orderId;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid Google Apps Script response: ${responseText}`);
    }

    throw error;
  }
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
  const remarks = asTrimmedString(customer.remarks);
  const termsAccepted = customer.termsAccepted === true;

  if (!fullName || !email || !mobile) {
    return jsonError("Full name, email, and mobile number are required.");
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

  const selectedProducts: SelectedProduct[] = [];

  for (const item of payload.products) {
    const productId = asTrimmedString(item.productId);
    const product = catalogById.get(productId);

    if (!product) {
      return jsonError("One or more product selections are invalid.");
    }

    if (product.kind === "variant") {
      const optionId = asTrimmedString(item.optionId);
      const option = product.options.find((optionItem) => optionItem.id === optionId);

      if (!option) {
        return jsonError("One or more product selections are invalid.");
      }

      selectedProducts.push({
        name: option.name,
        detail: "1 order",
        subtotal: option.price
      });
      continue;
    }

    const weight = Number(item.weight);

    if (!Number.isInteger(weight) || weight < product.minWeight) {
      return jsonError("One or more product selections are invalid.");
    }

    selectedProducts.push({
      name: product.name,
      detail: `${weight}kg`,
      subtotal: weight * product.pricePerKg,
      minWeight: product.minWeight,
      weight
    });
  }

  if (selectedProducts.length === 0) {
    return jsonError("Please select at least one product.");
  }

  const invalidMinimumProduct = selectedProducts.find(
    (product) =>
      product.minWeight &&
      typeof product.weight === "number" &&
      product.weight < product.minWeight
  );

  if (invalidMinimumProduct) {
    return jsonError(
      `${invalidMinimumProduct.name} has a minimum purchase of ${invalidMinimumProduct.minWeight}kg.`
    );
  }

  const totalAmount = selectedProducts.reduce((sum, product) => sum + product.subtotal, 0);
  const depositAmount = totalAmount * 0.5;
  const timestamp = new Date().toISOString();
  const selectedProductsSummary = selectedProducts
    .map((product) => `${product.name} - ${product.detail} - ${formatCurrency(product.subtotal)}`)
    .join("\n");

  try {
    const orderId = await appendOrderToSheet({
      Timestamp: timestamp,
      "Order ID": "",
      "Full Name": fullName,
      "Email Address": email,
      "Mobile Number": mobile,
      Remarks: remarks,
      "Selected Products": selectedProductsSummary,
      "Total Amount": formatCurrency(totalAmount),
      "Deposit Amount": formatCurrency(depositAmount),
      "Terms Accepted": termsAccepted ? "Yes" : "No"
    });

    return NextResponse.json({
      success: true,
      orderId
    });

  } catch (error) {
    console.error("Order submission failed", error);
    return jsonError(getSubmissionErrorMessage(error), 500);
  }
}
