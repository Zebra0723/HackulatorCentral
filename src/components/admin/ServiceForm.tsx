"use client";

import { useState, type FormEvent } from "react";
import { inputToPence } from "./fmt";
import { Feedback, useApi } from "./useApi";

const ALWAYS_COVERED = ["SOFTWARE"];

export function ServiceForm({ deviceId, actions }: { deviceId: number; actions: Record<string, string[]> }) {
  const { call, busy, error, message, setError } = useApi();
  const [category, setCategory] = useState("SOFTWARE");
  const [covered, setCovered] = useState(true);
  const alwaysCovered = ALWAYS_COVERED.includes(category);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const price = inputToPence(String(fd.get("price") ?? ""));
    if (price === "invalid") return setError("Enter the price like 12.50.");
    const ok = await call("POST", `/api/admin/devices/${deviceId}/services`, {
      category,
      action: fd.get("action"),
      description: fd.get("description"),
      covered: alwaysCovered || covered,
      pricePence: alwaysCovered || covered ? null : price,
    }, { success: "Service record added." });
    if (ok) e.currentTarget?.reset();
  }

  return (
    <form className="a-form" onSubmit={onSubmit}>
      <div className="a-grid2">
        <label className="a-field">
          <span>Category</span>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setCovered(e.target.value === "SOFTWARE"); }}>
            {Object.keys(actions).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="a-field">
          <span>Action</span>
          <select name="action" key={category}>
            {actions[category].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
      </div>
      <label className="a-field"><span>What was done</span><input name="description" maxLength={2000} /></label>
      {alwaysCovered ? (
        <p className="small a-muted">Installs, updates and reinstalls of owned software are always covered: no charge.</p>
      ) : (
        <div className="a-grid2">
          <label className="a-check"><input type="checkbox" checked={covered} onChange={(e) => setCovered(e.target.checked)} /> Covered (no charge)</label>
          {!covered && <label className="a-field"><span>Price you agreed (£)</span><input name="price" inputMode="decimal" required /></label>}
        </div>
      )}
      <Feedback error={error} message={message} />
      <button className="a-btn a-btn--primary a-btn--sm" disabled={busy}>Add record</button>
    </form>
  );
}
