"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Feedback, useApi } from "./useApi";

export function NewOrderForm({ enquiry }: { enquiry: { id: number; name: string; email: string; status: string } | null }) {
  const router = useRouter();
  const { call, busy, error, message } = useApi();
  const [jobType, setJobType] = useState("new_build");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await call<{ id: number }>("POST", "/api/admin/orders", {
      enquiryId: enquiry?.id,
      jobType: fd.get("jobType"),
      customerName: fd.get("customerName"),
      customerEmail: fd.get("customerEmail"),
      shareCode: fd.get("shareCode") || undefined,
      coverName: fd.get("coverName") || "",
      welcome: fd.get("welcome") || "",
      covered: fd.get("covered") === "on",
      isTest: fd.get("isTest") === "on",
      initialStatus: fd.get("initialStatus"),
    }, { refresh: false });
    if (res?.id) router.push(`/admin/orders/${res.id}`);
  }

  if (enquiry?.status === "converted") return <p className="a-note">This enquiry has already been turned into an order.</p>;

  return (
    <form className="a-card a-form" onSubmit={onSubmit}>
      <label className="a-field">
        <span>Job type</span>
        <select name="jobType" value={jobType} onChange={(e) => setJobType(e.target.value)}>
          <option value="new_build">New Hackulator build</option>
          <option value="software">Software job</option>
          <option value="repair">Repair</option>
          <option value="ui_change">UI change</option>
        </select>
      </label>
      <div className="a-grid2">
        <label className="a-field">
          <span>Customer name</span>
          <input name="customerName" defaultValue={enquiry?.name} required={!enquiry} maxLength={80} />
        </label>
        <label className="a-field">
          <span>Customer email (optional)</span>
          <input name="customerEmail" type="email" defaultValue={enquiry?.email} maxLength={160} />
        </label>
      </div>
      {!enquiry && (
        <fieldset className="a-fieldset">
          <legend>Configuration</legend>
          <label className="a-field">
            <span>Build link from the website configurator</span>
            <input name="shareCode" placeholder="Paste the Share link (or leave empty for the base build)" />
            <small>Use “Share” in Build Yours, then paste the link here. Share links leave out personal text, so add it below.</small>
          </label>
          <div className="a-grid2">
            <label className="a-field">
              <span>Name on cover (if chosen)</span>
              <input name="coverName" maxLength={14} />
            </label>
            <label className="a-field">
              <span>Welcome text (if Custom UI)</span>
              <input name="welcome" maxLength={16} />
            </label>
          </div>
        </fieldset>
      )}
      <label className="a-field">
        <span>Starting status</span>
        <select name="initialStatus" defaultValue={jobType === "new_build" ? "waiting_deposit" : "accepted"} key={jobType}>
          <option value="waiting_deposit">Waiting for deposit</option>
          <option value="waiting_calculator">Waiting for calculator</option>
          <option value="waiting_parts">Waiting for parts</option>
          <option value="accepted">Order accepted</option>
        </select>
      </label>
      {jobType !== "new_build" && (
        <label className="a-check">
          <input type="checkbox" name="covered" /> Covered by the customer&apos;s pass (no charge, no deposit needed)
        </label>
      )}
      <label className="a-check">
        <input type="checkbox" name="isTest" /> This is a test record (can be deleted later)
      </label>
      <Feedback error={error} message={message} />
      <button className="a-btn a-btn--primary" disabled={busy}>
        {busy ? "Creating…" : "Create order"}
      </button>
    </form>
  );
}
