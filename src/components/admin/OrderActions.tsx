"use client";

import { useRouter } from "next/navigation";
import { Feedback, useApi } from "./useApi";

export function OrderActions({
  orderId,
  reference,
  status,
  archived,
  hasPayments,
  isTest,
}: {
  orderId: number;
  reference: string;
  status: string;
  archived: boolean;
  hasPayments: boolean;
  isTest: boolean;
}) {
  const router = useRouter();
  const { call, busy, error, message } = useApi();
  const url = `/api/admin/orders/${orderId}`;
  return (
    <section className="a-card">
      <h2>Order actions</h2>
      <div className="a-inline a-wrap">
        <a className="a-btn a-btn--sm" href={`/admin/orders/${orderId}/sheet`}>Build sheet</a>
        {status !== "cancelled" && status !== "delivered" && (
          <button
            type="button"
            className="a-btn a-btn--sm a-btn--ghost"
            disabled={busy}
            onClick={() => {
              const reason = prompt("Cancel this order? Payments and history are kept. Reason (optional):");
              if (reason !== null) call("PATCH", url, { action: "cancel", reason }, { success: "Order cancelled." });
            }}
          >
            Cancel order
          </button>
        )}
        {(status === "delivered" || status === "cancelled") && (
          <button type="button" className="a-btn a-btn--sm a-btn--ghost" disabled={busy} onClick={() => call("PATCH", url, { action: archived ? "unarchive" : "archive" }, { success: archived ? "Back in the order list." : "Archived. It stays in All history." })}>
            {archived ? "Unarchive" : "Archive"}
          </button>
        )}
        {!hasPayments && (
          <button
            type="button"
            className="a-btn a-btn--sm a-btn--danger"
            disabled={busy}
            onClick={async () => {
              const typed = prompt(`Permanently delete ${isTest ? "this test record" : "this order"}? This can't be undone.\nOnly do this for test or mistaken records.\n\nType DELETE ${reference} to confirm:`);
              if (!typed) return;
              const ok = await call("PATCH", url, { action: "delete", confirmation: typed }, { refresh: false });
              if (ok) router.push("/admin/orders");
            }}
          >
            Delete record
          </button>
        )}
      </div>
      {hasPayments && <p className="small a-muted">Orders with recorded payments can&apos;t be deleted. Cancel or archive instead.</p>}
      <Feedback error={error} message={message} />
    </section>
  );
}
