"use client";

import { Feedback, useApi } from "./useApi";

export function EnquiryStatus({ id, status }: { id: number; status: string }) {
  const { call, busy, error, message } = useApi();
  if (status === "converted") return <span className="a-muted small">Turned into an order</span>;
  return (
    <>
      {status !== "reviewed" && <button type="button" className="a-btn a-btn--sm" disabled={busy} onClick={() => call("PATCH", `/api/admin/enquiries/${id}`, { status: "reviewed" })}>Mark reviewed</button>}
      {status !== "closed" && <button type="button" className="a-btn a-btn--sm a-btn--ghost" disabled={busy} onClick={() => call("PATCH", `/api/admin/enquiries/${id}`, { status: "closed" })}>Close</button>}
      {status === "closed" && <button type="button" className="a-btn a-btn--sm a-btn--ghost" disabled={busy} onClick={() => call("PATCH", `/api/admin/enquiries/${id}`, { status: "new" })}>Reopen</button>}
      <Feedback error={error} message={message} />
    </>
  );
}
