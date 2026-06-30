"use client";

import { FormEvent, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  description: string;
  pricePerKg: number;
  imageSrc: string;
};

type FormState = {
  fullName: string;
  email: string;
  mobile: string;
  collectionMethod: string;
  remarks: string;
  termsAccepted: boolean;
};

const products: Product[] = [
  {
    id: "tuna-block-sale",
    name: "Tuna Block Sale",
    description: "Versatile premium tuna block for sashimi, searing, or home slicing.",
    pricePerKg: 330,
    imageSrc: "/images/tuna-block.jpeg"
  },
  {
    id: "premium-cut-otoro",
    name: "Premium Cut Otoro",
    description: "Luxurious fatty belly cut with rich marbling and a buttery finish.",
    pricePerKg: 1500,
    imageSrc: "/images/otoro.jpg"
  },
  {
    id: "premium-cut-chutoro",
    name: "Premium Cut Chutoro",
    description: "Balanced medium-fat cut with deep flavor and silky texture.",
    pricePerKg: 1300,
    imageSrc: "/images/chutoro.jpg"
  },
  {
    id: "premium-cut-akami",
    name: "Premium Cut Akami",
    description: "Lean, clean-tasting red meat cut with elegant umami notes.",
    pricePerKg: 900,
    imageSrc: "/images/tuna-block.jpeg"
  }
];

const initialForm: FormState = {
  fullName: "",
  email: "",
  mobile: "",
  collectionMethod: "",
  remarks: "",
  termsAccepted: false
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0
  }).format(value);

const weightOptions = Array.from({ length: 11 }, (_, index) => index);

export default function Home() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [weights, setWeights] = useState<Record<string, number>>(
    Object.fromEntries(products.map((product) => [product.id, 0]))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [orderId, setOrderId] = useState("");

  const selectedProducts = useMemo(
    () =>
      products
        .map((product) => {
          const weight = weights[product.id] ?? 0;
          return {
            ...product,
            weight,
            subtotal: weight * product.pricePerKg
          };
        })
        .filter((product) => product.weight > 0),
    [weights]
  );

  const totalAmount = selectedProducts.reduce((sum, product) => sum + product.subtotal, 0);
  const depositAmount = totalAmount * 0.5;

  const updateForm = (field: keyof FormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage(null);
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setOrderId("");

    if (!form.fullName || !form.email || !form.mobile || !form.collectionMethod) {
      setMessage({ type: "error", text: "Please complete all required customer details." });
      return;
    }

    if (selectedProducts.length === 0) {
      setMessage({ type: "error", text: "Please select at least one product weight." });
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
          products: Object.entries(weights).map(([productId, weight]) => ({
            productId,
            weight
          }))
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Something went wrong while submitting your order.");
      }

      setOrderId(result.orderId);
      setMessage({
        type: "success",
        text: `Thank you. Your order has been submitted successfully.`
      });
      setForm(initialForm);
      setWeights(Object.fromEntries(products.map((product) => [product.id, 0])));
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to submit your order."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="hero-section">
        <div className="hero-copy">
          <img
            className="event-logo"
            src="/images/jemy-2026-logo.png"
            alt="Japan Expo Malaysia 2026"
          />
          <p className="section-label">Japan Expo Malaysia 2026 Premium Collection</p>
          <h1>Tuna Pre-Order Form</h1>
          <p>
            Reserve premium tuna cuts in advance for event collection. Choose your preferred
            products, review the live deposit amount, and submit your order securely.
          </p>
        </div>
        <div className="hero-panel" aria-hidden="true">
          <img className="hero-product-image" src="/images/tuna-block.jpeg" alt="" />
          <div className="hero-panel-details">
            <span>Fresh-cut selections</span>
            <strong>50% deposit required</strong>
          </div>
        </div>
      </section>

      <form className="order-layout" onSubmit={submitOrder}>
        <div className="form-column">
          <section className="content-section">
            <h2>Terms and Conditions</h2>
            <ul className="terms-list">
              <li>Orders are confirmed only after submission and deposit payment.</li>
              <li>Final collection timing and availability may be coordinated by the event team.</li>
              <li>Weights are selected in kilograms and priced according to the listed rate.</li>
              <li>Please keep your payment slip for verification after submitting the form.</li>
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
              <label>
                <span>Collection Method</span>
                <select
                  required
                  value={form.collectionMethod}
                  onChange={(event) => updateForm("collectionMethod", event.target.value)}
                >
                  <option value="">Select collection method</option>
                  <option value="Collect at event booth">Collect at event booth</option>
                  <option value="Arrange pickup with team">Arrange pickup with team</option>
                </select>
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
                  <div className="product-image">
                    <img src={product.imageSrc} alt={product.name} />
                  </div>
                  <div className="product-content">
                    <div>
                      <h3>{product.name}</h3>
                      <p>{product.description}</p>
                    </div>
                    <div className="product-controls">
                      <strong>{formatCurrency(product.pricePerKg)} / kg</strong>
                      <label>
                        <span>Weight</span>
                        <select
                          value={weights[product.id] ?? 0}
                          onChange={(event) =>
                            setWeights((current) => ({
                              ...current,
                              [product.id]: Number(event.target.value)
                            }))
                          }
                        >
                          {weightOptions.map((weight) => (
                            <option value={weight} key={weight}>
                              {weight}kg
                            </option>
                          ))}
                        </select>
                      </label>
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
                <strong>[Insert Bank Name]</strong>
              </p>
              <p>
                <span>Account Name</span>
                <strong>[Insert Account Name]</strong>
              </p>
              <p>
                <span>Account Number</span>
                <strong>[Insert Account Number]</strong>
              </p>
            </div>
            <p className="payment-note">
              Please complete the 50% deposit payment of{" "}
              <strong>{formatCurrency(depositAmount)}</strong> and upload or send the payment slip after
              submitting the form.
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
                <div className="summary-item" key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>
                      {product.weight}kg x {formatCurrency(product.pricePerKg)} / kg
                    </span>
                  </div>
                  <b>{formatCurrency(product.subtotal)}</b>
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
