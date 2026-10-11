"use client";

import { useSyncExternalStore } from "react";
import { Feedback, useApi } from "./useApi";

export function TrackingLinkBox({ orderId, token }: { orderId: number; token: string | null }) {
  const { call, busy, error, message, setMessage } = useApi();
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const url = token ? `${origin}/track/${token}` : "";

  return (
    <section className="a-card">
      <h2>Private tracking link</h2>
      {token ? (
        <>
          <input className="a-link-input" readOnly value={url} aria-label="Tracking link" onFocus={(e) => e.currentTarget.select()} />
          <div className="a-inline a-wrap">
            <button
              type="button"
              className="a-btn a-btn--sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setMessage("Copied. Nothing has been sent; paste it to the customer yourself.");
                } catch {
                  setMessage("Select the link above and copy it.");
                }
              }}
            >
              Copy link
            </button>
            <a className="a-btn a-btn--sm" href={`/track/${token}`} target="_blank" rel="noreferrer">
              Open customer page
            </a>
            <button
              type="button"
              className="a-btn a-btn--sm a-btn--ghost"
              disabled={busy}
              onClick={() => confirm("Make a new link? The old link will stop working.") && call("PATCH", `/api/admin/orders/${orderId}`, { action: "regenerate-link" }, { success: "New link created. The old one no longer works." })}
            >
              New link
            </button>
            <button
              type="button"
              className="a-btn a-btn--sm a-btn--ghost"
              disabled={busy}
              onClick={() => confirm("Turn off the tracking link? The customer won't be able to view the page until you make a new one.") && call("PATCH", `/api/admin/orders/${orderId}`, { action: "revoke-link" }, { success: "Link turned off." })}
            >
              Turn off
            </button>
          </div>
          <p className="small a-muted">Anyone with this link can view this order&apos;s tracking page, so only share it with the customer.</p>
        </>
      ) : (
        <>
          <p>Tracking is turned off for this order.</p>
          <button type="button" className="a-btn a-btn--sm" disabled={busy} onClick={() => call("PATCH", `/api/admin/orders/${orderId}`, { action: "regenerate-link" }, { success: "Link created." })}>
            Create tracking link
          </button>
        </>
      )}
      <Feedback error={error} message={message} />
    </section>
  );
}
