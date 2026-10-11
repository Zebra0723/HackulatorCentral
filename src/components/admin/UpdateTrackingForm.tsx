"use client";

import { useState, type FormEvent } from "react";
import { formatPence } from "@/config/offer";
import { inputToPence, penceToInput } from "./fmt";
import { Feedback, useApi } from "./useApi";

const STATUSES = [
  ["waiting_deposit", "Waiting for deposit"],
  ["waiting_calculator", "Waiting for calculator"],
  ["waiting_parts", "Waiting for parts"],
  ["accepted", "Order accepted"],
  ["building", "Building"],
  ["testing", "Testing"],
  ["ready", "Ready"],
  ["delivered", "Delivered"],
] as const;

const NEEDS_DEPOSIT = ["building", "testing", "ready", "delivered"];

export function UpdateTrackingForm({
  orderId,
  status,
  jobType,
  paid,
  minDeposit,
  donorReceived,
  estimatedReady,
  basePrice,
  agreedTotal,
  disabled,
}: {
  orderId: number;
  status: string;
  jobType: string;
  paid: number;
  minDeposit: number;
  donorReceived: boolean;
  estimatedReady: string;
  basePrice: number | null;
  agreedTotal: number | null;
  disabled: boolean;
}) {
  const { call, busy, error, message, setError } = useApi();
  const [next, setNext] = useState(status);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [donor, setDonor] = useState(false);
  const [customerNote, setCustomerNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [estimate, setEstimate] = useState(estimatedReady);
  const [base, setBase] = useState(penceToInput(basePrice));
  const [agreed, setAgreed] = useState(penceToInput(agreedTotal));

  const amountP = inputToPence(amount);
  const pendingPaid = paid + (typeof amountP === "number" ? amountP : 0);
  const depositBlocked = jobType === "new_build" && NEEDS_DEPOSIT.includes(next) && next !== status && pendingPaid < minDeposit;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const basePence = inputToPence(base);
    const agreedPence = inputToPence(agreed);
    if (amountP === "invalid" || basePence === "invalid" || agreedPence === "invalid") {
      setError("Enter amounts like 12.50.");
      return;
    }
    const ok = await call("POST", `/api/admin/orders/${orderId}/tracking`, {
      status: next !== status ? next : undefined,
      paymentPence: amountP ?? undefined,
      paymentMethod: method,
      donorReceived: donor || undefined,
      customerNote,
      internalNote,
      estimatedReady: estimate !== estimatedReady ? estimate : undefined,
      basePricePence: basePence !== basePrice ? basePence : undefined,
      agreedTotalPence: agreedPence !== agreedTotal ? agreedPence : undefined,
    }, { success: "Saved. The customer's page now shows this update." });
    if (ok) {
      setAmount("");
      setMethod("");
      setDonor(false);
      setCustomerNote("");
      setInternalNote("");
    }
  }

  const statusLabel = STATUSES.find((s) => s[0] === next)?.[1];
  const willShow: string[] = [];
  if (next !== status) willShow.push(`Stage changes to “${statusLabel}”.`);
  if (typeof amountP === "number" && amountP > 0) willShow.push(`Payment received: ${formatPence(amountP)}.`);
  if (donor) willShow.push("Your calculator has arrived.");
  if (estimate !== estimatedReady) willShow.push(estimate ? `Estimated ready date: ${estimate} (estimate).` : "Estimated ready date removed.");
  if (customerNote.trim()) willShow.push(customerNote.trim());

  return (
    <form className="a-card a-form" onSubmit={onSubmit} aria-labelledby="update-tracking-title">
      <h2 id="update-tracking-title">Update tracking</h2>
      {disabled && <p className="a-note">This order is cancelled, so tracking can&apos;t be updated.</p>}
      <fieldset disabled={disabled || busy} className="a-fieldset-plain">
        <label className="a-field">
          <span>1. Stage</span>
          <select value={next} onChange={(e) => setNext(e.target.value)}>
            {STATUSES.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
                {id === status ? " (current)" : ""}
              </option>
            ))}
          </select>
          {depositBlocked && (
            <small className="a-warn">
              A new build needs at least {formatPence(minDeposit)} received first. Received so far: {formatPence(pendingPaid)}.
            </small>
          )}
          <small>Picked the wrong stage earlier? Choose the right one and save; the history keeps a record.</small>
        </label>

        <div className="a-grid2">
          <label className="a-field">
            <span>2. Money received now (£)</span>
            <input inputMode="decimal" placeholder="e.g. 5.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <small>Only money actually received. Leave blank if none.</small>
          </label>
          <label className="a-field">
            <span>How it was paid</span>
            <input placeholder="e.g. bank transfer" value={method} onChange={(e) => setMethod(e.target.value)} maxLength={40} />
          </label>
        </div>

        <label className="a-check">
          <input type="checkbox" checked={donor || donorReceived} disabled={donorReceived} onChange={(e) => setDonor(e.target.checked)} />
          3. The customer&apos;s calculator has been received {donorReceived && <span className="a-muted">(already recorded)</span>}
        </label>

        <label className="a-field">
          <span>4. Update for the customer</span>
          <textarea rows={3} value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} maxLength={2000} placeholder="Shown on their tracking page" />
        </label>

        <label className="a-field a-field--private">
          <span>5. Private note (never shown to the customer)</span>
          <textarea rows={2} value={internalNote} onChange={(e) => setInternalNote(e.target.value)} maxLength={4000} placeholder="Only you can see this" />
        </label>

        <div className="a-grid2">
          <label className="a-field">
            <span>7. Estimated ready date</span>
            <span className="a-inline">
              <input type="date" value={estimate} onChange={(e) => setEstimate(e.target.value)} />
              {estimate && (
                <button type="button" className="a-btn a-btn--sm a-btn--ghost" onClick={() => setEstimate("")}>
                  Clear
                </button>
              )}
            </span>
            <small>Shown to the customer as an estimate. Leave empty for none.</small>
          </label>
          <div className="a-grid2">
            <label className="a-field">
              <span>Base price (£)</span>
              <input inputMode="decimal" value={base} onChange={(e) => setBase(e.target.value)} placeholder="when known" />
            </label>
            <label className="a-field">
              <span>Agreed total (£)</span>
              <input inputMode="decimal" value={agreed} onChange={(e) => setAgreed(e.target.value)} placeholder="when known" />
            </label>
          </div>
        </div>

        <div className="a-preview-box" aria-live="polite">
          <strong>8. The customer will see:</strong>
          {willShow.length ? (
            <ul>
              {willShow.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          ) : (
            <p className="a-muted">No customer-visible changes yet.{internalNote.trim() ? " (Your private note stays private.)" : ""}</p>
          )}
        </div>

        <Feedback error={error} message={message} />
        <button className="a-btn a-btn--primary" disabled={depositBlocked}>
          {busy ? "Saving…" : "9. Save update"}
        </button>
      </fieldset>
    </form>
  );
}
