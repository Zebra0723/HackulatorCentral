"use client";

import { fmtDateTime } from "./fmt";
import { Feedback, useApi } from "./useApi";

export interface HistoryItem {
  id: number;
  kind: string;
  message: string;
  customerVisible: boolean;
  hidden: boolean;
  by: string;
  at: string;
}

export function HistoryList({ orderId, items }: { orderId: number; items: HistoryItem[] }) {
  const { call, busy, error, message } = useApi();
  return (
    <section className="a-card">
      <h2>History</h2>
      <Feedback error={error} message={message} />
      <ol className="a-history">
        {items.map((e) => (
          <li key={e.id} className={e.hidden ? "is-hidden" : !e.customerVisible ? "is-private" : undefined}>
            <div>
              {!e.customerVisible && <span className="a-chip a-chip--private">Private</span>}
              {e.hidden && <span className="a-chip">Hidden from customer</span>}
              <span>{e.message}</span>
            </div>
            <div className="a-muted small">
              {fmtDateTime(e.at)} · {e.by}
              {e.customerVisible && (
                <button
                  type="button"
                  className="a-linkbtn"
                  disabled={busy}
                  onClick={() => call("PATCH", `/api/admin/orders/${orderId}`, { action: e.hidden ? "unhide-event" : "hide-event", eventId: e.id })}
                >
                  {e.hidden ? "Show to customer" : "Hide from customer"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
