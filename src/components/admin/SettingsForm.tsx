"use client";

import type { FormEvent } from "react";
import { Feedback, useApi } from "./useApi";

export interface SettingsValues {
  waitlistSpots: number;
  waitlistOpen: boolean;
  announcementOn: boolean;
  announcementText: string;
  statusLabel: string;
  stageText: string;
  basePricePence: number | null;
  availabilityText: string;
  fulfilmentText: string;
  enquiriesOpen: boolean;
  orderEmailTo: string;
}

export function SettingsForm({
  values,
  emailReady,
  defaultEmail,
}: {
  values: SettingsValues;
  /** Whether RESEND_API_KEY is set on the server. */
  emailReady: boolean;
  /** The site's contact email, used when no order email address is set. */
  defaultEmail: string;
}) {
  const { call, busy, error, message, setError } = useApi();
  const test = useApi();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const priceText = String(fd.get("basePrice") ?? "").replace(/[£,\s]/g, "");
    let basePricePence: number | null = null;
    if (priceText) {
      const n = Number(priceText);
      if (!Number.isFinite(n) || n < 0) return setError("Base price must be an amount like 49.99, or empty.");
      basePricePence = Math.round(n * 100);
    }
    await call(
      "PUT",
      "/api/admin/settings",
      {
        announcementOn: fd.get("announcementOn") === "on",
        announcementText: fd.get("announcementText"),
        statusLabel: fd.get("statusLabel"),
        waitlistSpots: Number(fd.get("waitlistSpots")),
        waitlistOpen: fd.get("waitlistOpen") === "on",
        stageText: fd.get("stageText"),
        basePricePence,
        availabilityText: fd.get("availabilityText"),
        fulfilmentText: fd.get("fulfilmentText"),
        enquiriesOpen: fd.get("enquiriesOpen") === "on",
        orderEmailTo: fd.get("orderEmailTo"),
      },
      { success: "Saved. The website shows the change straight away." },
    );
  }
  return (
    <form className="a-form" onSubmit={onSubmit}>
      <fieldset className="a-fieldset">
        <legend>Announcement bar</legend>
        <label className="a-check"><input type="checkbox" name="announcementOn" defaultChecked={values.announcementOn} /> Show a bar across the top of the website</label>
        <label className="a-field"><span>Text</span><input name="announcementText" defaultValue={values.announcementText} maxLength={140} placeholder="e.g. Prototype 2 is on the bench!" /><small>Up to 140 characters.</small></label>
      </fieldset>

      <fieldset className="a-fieldset">
        <legend>Waitlist</legend>
        <div className="a-grid2">
          <label className="a-field"><span>Number of spots</span><input name="waitlistSpots" type="number" min={0} max={10000} defaultValue={values.waitlistSpots} required /></label>
          <div className="a-field"><span>Status</span><label className="a-check"><input type="checkbox" name="waitlistOpen" defaultChecked={values.waitlistOpen} /> Open for new sign-ups</label></div>
        </div>
      </fieldset>

      <fieldset className="a-fieldset">
        <legend>Project status (homepage)</legend>
        <label className="a-field"><span>Status pill at the top</span><input name="statusLabel" defaultValue={values.statusLabel} maxLength={60} required /></label>
        <div className="a-grid2">
          <label className="a-field"><span>Stage</span><input name="stageText" defaultValue={values.stageText} maxLength={60} required /></label>
          <label className="a-field">
            <span>Base price (£)</span>
            <input name="basePrice" inputMode="decimal" defaultValue={values.basePricePence == null ? "" : (values.basePricePence / 100).toFixed(2)} placeholder="Leave empty: to be confirmed" />
            <small>Shown in Build Yours and the status card. Extras keep their own prices.</small>
          </label>
        </div>
        <div className="a-grid2">
          <label className="a-field"><span>Availability</span><input name="availabilityText" defaultValue={values.availabilityText} maxLength={120} placeholder="Leave empty: Not yet available" /></label>
          <label className="a-field"><span>Fulfilment terms</span><input name="fulfilmentText" defaultValue={values.fulfilmentText} maxLength={200} placeholder="Leave empty: To be published" /></label>
        </div>
      </fieldset>

      <fieldset className="a-fieldset">
        <legend>Online requests</legend>
        <label className="a-check"><input type="checkbox" name="enquiriesOpen" defaultChecked={values.enquiriesOpen} /> Let people send order requests and questions from Build Yours</label>
        <small className="a-muted">When off, the site offers the email link instead and stores nothing.</small>
      </fieldset>

      <fieldset className="a-fieldset">
        <legend>Order request emails</legend>
        <label className="a-field">
          <span>Email each new order request to</span>
          <input name="orderEmailTo" type="email" defaultValue={values.orderEmailTo} maxLength={160} placeholder={defaultEmail || "you@example.com"} />
          <small>Leave empty to use {defaultEmail || "the site's contact email"}. Reply to the email to answer the customer. Questions aren&apos;t emailed; they stay in Enquiries.</small>
        </label>
        {emailReady ? (
          <div className="a-inline a-wrap">
            <span className="a-chip">Email sending is set up</span>
            <button
              type="button"
              className="a-btn a-btn--sm"
              disabled={test.busy}
              onClick={() => test.call("POST", "/api/admin/settings/test-email", {}, { success: "Test email sent. Check your inbox (and spam)." })}
            >
              Send a test email
            </button>
          </div>
        ) : (
          <p className="a-note small">
            <strong>Not sending yet:</strong> add a free Resend API key as <code>RESEND_API_KEY</code> in Vercel, then redeploy.
            Until then, order requests are only saved in Enquiries.
          </p>
        )}
        <Feedback error={test.error} message={test.message} />
      </fieldset>

      <Feedback error={error} message={message} />
      <button className="a-btn a-btn--primary" disabled={busy}>Save settings</button>
    </form>
  );
}
