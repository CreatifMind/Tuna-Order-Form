"use client";

import { FormEvent, useMemo, useState } from "react";

type WeightProduct = {
  kind: "weight";
  id: string;
  name: string;
  description: string;
  pricePerKg: number;
  imageSrc: string;
  minWeight: number;
};

type DonOption = {
  id: string;
  name: string;
  price: number;
};

type VariantProduct = {
  kind: "variant";
  id: string;
  name: string;
  description: string;
  imageSrc: string;
  secondaryImageSrc: string;
  options: DonOption[];
};

type Product = WeightProduct | VariantProduct;

type FormState = {
  fullName: string;
  email: string;
  mobile: string;
  remarks: string;
  termsAccepted: boolean;
};

type CartItem = {
  lineId: string;
  productId: string;
  weight?: number;
  optionId?: string;
};

type SummaryItem = {
  lineId: string;
  name: string;
  detail: string;
  subtotal: number;
  minWeight?: number;
  weight?: number;
};

const products: Product[] = [
  {
    kind: "weight",
    id: "tuna-block-sale",
    name: "Tuna Block Sale",
    description: "Versatile premium tuna block for sashimi, searing, or home slicing.",
    pricePerKg: 330,
    imageSrc: "/images/tuna-block.jpeg",
    minWeight: 1
  },
  {
    kind: "weight",
    id: "akami",
    name: "Akami",
    description: "Lean, clean-tasting red meat cut with elegant umami notes.",
    pricePerKg: 1000,
    imageSrc: "/images/akami.jpg",
    minWeight: 1
  },
  {
    kind: "weight",
    id: "chutoro",
    name: "Chutoro",
    description: "Balanced medium-fat cut with deep flavor and silky texture.",
    pricePerKg: 1000,
    imageSrc: "/images/chutoro.jpg",
    minWeight: 1
  },
  {
    kind: "weight",
    id: "otoro",
    name: "Otoro",
    description: "Luxurious fatty belly cut with rich marbling and a buttery finish.",
    pricePerKg: 1500,
    imageSrc: "/images/otoro.jpg",
    minWeight: 1
  },
  {
    kind: "variant",
    id: "maguro-don",
    name: "Maguro Don",
    description: "Choose your preferred donburi option from the menu below.",
    imageSrc: "/images/maguro-don.jpg",
    secondaryImageSrc: "/images/maguro-don-premium.jpg",
    options: [
      { id: "maguro-don", name: "Maguro Don", price: 150 },
      { id: "premium-maguro-don", name: "Premium Maguro Don", price: 170 },
      { id: "maguro-don-uni", name: "Maguro Don + Uni", price: 200 },
      { id: "maguro-don-ikura", name: "Maguro Don + Ikura", price: 200 },
      { id: "maguro-don-uni-ikura", name: "Maguro Don + Uni + Ikura", price: 250 }
    ]
  }
];

const initialForm: FormState = {
  fullName: "",
  email: "",
  mobile: "",
  remarks: "",
  termsAccepted: false
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0
  }).format(value);

const isSummaryItem = (product: SummaryItem | null): product is SummaryItem =>
  product !== null;

export default function Home() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [pendingWeights, setPendingWeights] = useState<Record<string, string>>(
    Object.fromEntries(
      products.filter((product) => product.kind === "weight").map((product) => [product.id, ""])
    )
  );
  const [pendingOptions, setPendingOptions] = useState<Record<string, string>>(
    Object.fromEntries(
      products
        .filter((product) => product.kind === "variant")
        .map((product) => [product.id, product.options[0]?.id ?? ""])
    )
  );
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [orderId, setOrderId] = useState("");
  const [submittedDeposit, setSubmittedDeposit] = useState(0);

  const selectedProducts = useMemo(
    () =>
      cartItems
        .map((item): SummaryItem | null => {
          const product = products.find((productOption) => productOption.id === item.productId);

          if (!product) {
            return null;
          }

          if (product.kind === "variant") {
            const option = product.options.find((optionItem) => optionItem.id === item.optionId);

            if (!option) {
              return null;
            }

            return {
              lineId: item.lineId,
              name: option.name,
              detail: "1 order",
              subtotal: option.price
            };
          }

          const weight = item.weight ?? 0;

          return {
            lineId: item.lineId,
            name: product.name,
            detail: `${weight}kg x ${formatCurrency(product.pricePerKg)} / kg`,
            subtotal: weight * product.pricePerKg,
            minWeight: product.minWeight,
            weight
          };
        })
        .filter(isSummaryItem),
    [cartItems]
  );

  const totalAmount = selectedProducts.reduce((sum, product) => sum + product.subtotal, 0);
  const depositAmount = totalAmount * 0.5;

  const updatePendingWeight = (product: WeightProduct, rawValue: string) => {
    if (rawValue === "") {
      setPendingWeights((current) => ({
        ...current,
        [product.id]: ""
      }));
      setMessage(null);
      return;
    }

    const value = Number(rawValue);

    if (!Number.isFinite(value)) {
      return;
    }

    const minimumWeight = product.minWeight;
    const normalizedValue = Math.max(minimumWeight, Math.floor(value));

    setPendingWeights((current) => ({
      ...current,
      [product.id]: String(normalizedValue)
    }));
    setMessage(null);
  };

  const updatePendingOption = (productId: string, optionId: string) => {
    setPendingOptions((current) => ({
      ...current,
      [productId]: optionId
    }));
    setMessage(null);
  };

  const addOrderLine = (product: Product) => {
    if (product.kind === "variant") {
      const optionId = pendingOptions[product.id];
      const option = product.options.find((optionItem) => optionItem.id === optionId);

      if (!option) {
        setMessage({ type: "error", text: `Please select a ${product.name} option.` });
        return;
      }

      setCartItems((current) => [
        ...current,
        {
          lineId: `${option.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          productId: product.id,
          optionId: option.id
        }
      ]);
      setMessage(null);
      return;
    }

    const weight = Number(pendingWeights[product.id]);
    const minimumWeight = product.minWeight;

    if (!Number.isInteger(weight) || weight < minimumWeight) {
      setMessage({
        type: "error",
        text: `${product.name} has a minimum purchase of ${minimumWeight}kg.`
      });
      return;
    }

    setCartItems((current) => [
      ...current,
      {
        lineId: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        productId: product.id,
        weight
      }
    ]);
    setPendingWeights((current) => ({
      ...current,
      [product.id]: ""
    }));
    setMessage(null);
  };

  const removeProduct = (lineId: string) => {
    setCartItems((current) => current.filter((product) => product.lineId !== lineId));
    setMessage(null);
  };

  const updateForm = (field: keyof FormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage(null);
  };

  const startNewOrder = () => {
    setOrderId("");
    setSubmittedDeposit(0);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setOrderId("");

    if (!form.fullName || !form.email || !form.mobile) {
      setMessage({ type: "error", text: "Please complete all required customer details." });
      return;
    }

    if (selectedProducts.length === 0) {
      setMessage({ type: "error", text: "Please add at least one order to the summary." });
      return;
    }

    const invalidMinimumProduct = selectedProducts.find(
      (product) =>
        product.minWeight &&
        typeof product.weight === "number" &&
        product.weight < product.minWeight
    );

    if (invalidMinimumProduct) {
      setMessage({
        type: "error",
        text: `${invalidMinimumProduct.name} has a minimum purchase of ${invalidMinimumProduct.minWeight}kg.`
      });
      return;
    }

    if (!form.termsAccepted) {
      setMessage({ type: "error", text: "Please agree to the terms and conditions." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/submit-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customer: form,
          products: cartItems.map((item) => ({
            productId: item.productId,
            weight: item.weight,
            optionId: item.optionId
          }))
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Something went wrong while submitting your order.");
      }

      setSubmittedDeposit(depositAmount);
      setOrderId(result.orderId);
      setMessage({
        type: "success",
        text: `Thank you. Your order has been submitted successfully.`
      });
      setForm(initialForm);
      setPendingWeights(
        Object.fromEntries(
          products.filter((product) => product.kind === "weight").map((product) => [product.id, ""])
        )
      );
      setCartItems([]);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to submit your order."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderId) {
    return (
      <main className="page-shell">
        <section className="confirmation-page">
          <img
            className="confirmation-logo"
            src="/images/jemy-2026-logo.png"
            alt="Japan Expo Malaysia 2026"
          />
          <p className="section-label">Order submitted</p>
          <h1>Thank you for your pre-order.</h1>
          <p className="confirmation-intro">
            Your order has been received. Please keep this page handy until your payment slip has
            been sent.
          </p>

          <div className="confirmation-card">
            <span>Order ID</span>
            <strong>{orderId}</strong>
          </div>

          <section className="content-section payment-section">
            <h2>Payment Instructions</h2>
            <div className="bank-details">
              <p>
                <span>Bank Name</span>
                <strong>Public Bank Bhd</strong>
              </p>
              <p>
                <span>Account Name</span>
                <strong>ORIBE CREATIVE DINING SDN BHD</strong>
              </p>
              <p>
                <span>Account Number</span>
                <strong>3197775908</strong>
              </p>
            </div>
            <p className="payment-note">
              Please complete the 50% deposit payment of{" "}
              <strong>{formatCurrency(submittedDeposit)}</strong>.
            </p>
            <p className="payment-note">
              Once payment is made, please WhatsApp payment slip to{" "}
              <strong>012-2099005</strong> or email to{" "}
              <strong>info@siam-connection.com</strong>.
            </p>
            <p className="screenshot-note">
              REMINDER: PLEASE SCREENSHOT THIS PAGE FOR YOUR REFERENCE
            </p>
          </section>

          <button className="submit-button secondary-action" type="button" onClick={startNewOrder}>
            Submit New Form
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="hero-section">
        <div className="hero-copy">
          <img
            className="event-logo tuna-hero-logo"
            src="/images/tuna-logo.png"
            alt="Japan Expo tuna mascot"
          />
          <h1>Tuna Pre-Order Form</h1>
        </div>
      </section>

      <form className="order-layout" onSubmit={submitOrder}>
        <div className="form-column">
          <section className="content-section">
            <h2>Terms and Conditions</h2>
            <ul className="terms-list">
              <li>Customers are not permitted to select specific parts or cuts of the tuna.</li>
              <li>
                All portions will be selected by our chef to ensure the best quality, freshness, and
                fair distribution among all customers.
              </li>
              <li>
                A 50% non-refundable deposit of the total order value is required to confirm your
                pre-order. The remaining amount will have to be paid upon collection.
              </li>
              <li>Orders will only be processed upon receipt of the deposit.</li>
              <li>All pre-orders are accepted on a first come, first served basis.</li>
              <li>
                Confirmation of your order is subject to successful deposit payment and product
                availability.
              </li>
              <li>Tuna is available while stocks last.</li>
              <li>
                Once the tuna has been collected, it cannot be returned, exchanged, or refunded.
              </li>
              <li>
                If we are unable to fulfill your confirmed order due to insufficient stock or
                unforeseen supply issues, any deposit or payment made will be refunded in full using
                the original payment method.
              </li>
              <li>
                Customers are responsible for collecting their orders at Japan Expo Malaysia 2026,
                Hall 6, KLCC, 25th July, between 1pm to 7pm.
              </li>
              <li>
                Deposits may be forfeited for late cancellations or no-shows, except where the order
                cannot be fulfilled by us.
              </li>
              <li>
                By placing a pre-order and making the required deposit, the customer acknowledges
                that they have read, understood, and agreed to these Terms & Conditions.
              </li>
            </ul>
          </section>

          <section className="content-section">
            <h2>Customer Details</h2>
            <div className="field-grid">
              <label>
                <span>Full Name</span>
                <input
                  required
                  value={form.fullName}
                  onChange={(event) => updateForm("fullName", event.target.value)}
                  placeholder="Your full name"
                />
              </label>
              <label>
                <span>Email Address</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label>
                <span>Mobile Number</span>
                <input
                  required
                  value={form.mobile}
                  onChange={(event) => updateForm("mobile", event.target.value)}
                  placeholder="+60..."
                />
              </label>
              <label className="field-wide">
                <span>Remarks / Special Notes</span>
                <textarea
                  value={form.remarks}
                  onChange={(event) => updateForm("remarks", event.target.value)}
                  placeholder="Optional notes for the team"
                  rows={4}
                />
              </label>
            </div>
          </section>

          <section className="content-section">
            <h2>Product Selection</h2>
            <div className="product-grid">
              {products.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className={product.kind === "variant" ? "product-image-grid" : "product-image"}>
                    <div className="image-frame">
                      <img src={product.imageSrc} alt={product.name} />
                    </div>
                    {product.kind === "variant" && (
                      <div className="image-frame">
                        <img src={product.secondaryImageSrc} alt={`${product.name} premium option`} />
                      </div>
                    )}
                    <span className="image-disclaimer">For illustration purposes only</span>
                  </div>
                  <div className="product-content">
                    <div>
                      <h3>{product.name}</h3>
                      <p>{product.description}</p>
                    </div>
                    <div className="product-controls">
                      {product.kind === "weight" ? (
                        <>
                          <strong>{formatCurrency(product.pricePerKg)} / kg</strong>
                          <label>
                            <span>Weight</span>
                            <div className="kg-input-wrap">
                              <input
                                inputMode="numeric"
                                min={product.minWeight}
                                type="number"
                                value={pendingWeights[product.id] ?? ""}
                                onChange={(event) => updatePendingWeight(product, event.target.value)}
                                placeholder={String(product.minWeight)}
                              />
                              <span>kg</span>
                            </div>
                          </label>
                        </>
                      ) : (
                        <label className="option-control">
                          <span>Option</span>
                          <select
                            value={pendingOptions[product.id] ?? product.options[0]?.id}
                            onChange={(event) => updatePendingOption(product.id, event.target.value)}
                          >
                            {product.options.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name} - {formatCurrency(option.price)}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <button
                        className="add-order-button"
                        type="button"
                        onClick={() => addOrderLine(product)}
                      >
                        Add Order
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="content-section payment-section">
            <h2>Payment Instructions</h2>
            <div className="bank-details">
              <p>
                <span>Bank Name</span>
                <strong>Public Bank Bhd</strong>
              </p>
              <p>
                <span>Account Name</span>
                <strong>ORIBE CREATIVE DINING SDN BHD</strong>
              </p>
              <p>
                <span>Account Number</span>
                <strong>3197775908</strong>
              </p>
            </div>
            <p className="payment-note">
              Please complete the 50% deposit payment of{" "}
              <strong>{formatCurrency(depositAmount)}</strong>.
            </p>
            <p className="payment-note">
              Once payment is made, please WhatsApp payment slip to{" "}
              <strong>012-2099005</strong> or email to{" "}
              <strong>info@siam-connection.com</strong>.
            </p>
          </section>
        </div>

        <aside className="summary-panel">
          <h2>Order Summary</h2>
          {selectedProducts.length === 0 ? (
            <p className="empty-summary">Selected products will appear here.</p>
          ) : (
            <div className="summary-items">
              {selectedProducts.map((product) => (
                <div className="summary-item" key={product.lineId}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.detail}</span>
                  </div>
                  <div className="summary-actions">
                    <b>{formatCurrency(product.subtotal)}</b>
                    <button type="button" onClick={() => removeProduct(product.lineId)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="summary-totals">
            <p>
              <span>Total order amount</span>
              <strong>{formatCurrency(totalAmount)}</strong>
            </p>
            <p className="deposit-row">
              <span>50% deposit required</span>
              <strong>{formatCurrency(depositAmount)}</strong>
            </p>
          </div>

          <label className="terms-checkbox">
            <input
              type="checkbox"
              checked={form.termsAccepted}
              onChange={(event) => updateForm("termsAccepted", event.target.checked)}
            />
            <span>I have read and agree to the terms and conditions.</span>
          </label>

          {message && (
            <div className={`form-message ${message.type}`} role="status">
              <p>{message.text}</p>
              {orderId && <strong>Order ID: {orderId}</strong>}
            </div>
          )}

          <button className="submit-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Submitting..." : "Submit Pre-Order"}
          </button>
        </aside>
      </form>
    </main>
  );
}
