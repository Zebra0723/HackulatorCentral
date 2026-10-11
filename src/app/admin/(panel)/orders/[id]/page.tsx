import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPence } from "@/config/offer";
import { HistoryList } from "@/components/admin/HistoryList";
import { OrderActions } from "@/components/admin/OrderActions";
import { PhotoManager } from "@/components/admin/PhotoManager";
import { TrackingLinkBox } from "@/components/admin/TrackingLinkBox";
import { UpdateTrackingForm } from "@/components/admin/UpdateTrackingForm";
import { fmtDateTime } from "@/components/admin/fmt";
import { TrackingCard } from "@/components/tracking/TrackingCard";
import { requireAdminPage } from "@/lib/server/http";
import { MIN_DEPOSIT_PENCE, buildTrackingView, jobTypeLabel, orderDetail, statusLabel } from "@/lib/server/orders";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { db } = await requireAdminPage();
  const id = Number((await params).id);
  const d = Number.isInteger(id) ? await orderDetail(db, id) : null;
  if (!d) notFound();
  const { order, events, payments, photos, devices, paid } = d;
  const view = await buildTrackingView(db, order);
  const est = order.estimated_ready ? new Date(order.estimated_ready).toISOString().slice(0, 10) : "";

  return (
    <div className="a-stack">
      <p className="small"><Link href="/admin/orders">← Orders</Link></p>
      <div className="a-head">
        <div>
          <h1>
            {order.reference} <span className={`a-status a-status--${order.status}`}>{statusLabel(order.status)}</span>
          </h1>
          <p className="a-muted">
            {order.customer_name}
            {order.customer_email && ` · ${order.customer_email}`} · {jobTypeLabel(order.job_type)}
            {order.covered && " · covered by pass"}
            {order.is_test && " · TEST"}
            {order.archived && " · archived"}
          </p>
        </div>
        <div className="a-money">
          <span>Received <strong>{formatPence(paid)}</strong></span>
          <span>Agreed total <strong>{order.agreed_total_pence != null ? formatPence(order.agreed_total_pence) : "not set"}</strong></span>
          {order.agreed_total_pence != null && (
            <span>Balance <strong>{formatPence(Math.max(0, order.agreed_total_pence - paid))}</strong></span>
          )}
        </div>
      </div>

      <div className="a-cols a-cols--wide">
        <div className="a-stack">
          <UpdateTrackingForm
            orderId={order.id}
            status={order.status}
            jobType={order.job_type}
            paid={paid}
            minDeposit={MIN_DEPOSIT_PENCE}
            donorReceived={!!order.donor_received_at}
            estimatedReady={est}
            basePrice={order.base_price_pence}
            agreedTotal={order.agreed_total_pence}
            disabled={order.status === "cancelled"}
          />
          <PhotoManager orderId={order.id} photos={photos.map((p) => ({ id: p.id, caption: p.caption }))} />
          <HistoryList
            orderId={order.id}
            items={events.map((e) => ({
              id: e.id,
              kind: e.kind,
              message: e.message,
              customerVisible: e.customer_visible,
              hidden: e.hidden,
              by: e.created_by,
              at: new Date(e.created_at).toISOString(),
            }))}
          />
        </div>
        <div className="a-stack">
          <TrackingLinkBox orderId={order.id} token={order.tracking_token} />
          <section className="a-card">
            <h2>Payments</h2>
            {payments.length === 0 ? (
              <p className="a-empty">No payments recorded.</p>
            ) : (
              <ul className="a-list a-list--small">
                {payments.map((p) => (
                  <li key={p.id}>
                    <span>{formatPence(p.amount_pence)} {p.method && `· ${p.method}`}</span>
                    <span className="a-muted">{fmtDateTime(p.received_at)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="small a-muted">Record payments with “Money received” in Update tracking. They can&apos;t be deleted.</p>
          </section>
          <section className="a-card">
            <h2>Devices</h2>
            {devices.length ? (
              <ul className="a-list">
                {devices.map((dv) => (
                  <li key={dv.id}><Link href={`/admin/devices/${dv.id}`}>{dv.reference}</Link></li>
                ))}
              </ul>
            ) : (
              <p className="a-empty">No device linked yet.</p>
            )}
            <Link className="a-btn a-btn--sm" href={`/admin/devices?order=${order.reference}`}>Add device record</Link>
          </section>
          <OrderActions
            orderId={order.id}
            reference={order.reference}
            status={order.status}
            archived={order.archived}
            hasPayments={payments.length > 0}
            isTest={order.is_test}
          />
          <details className="a-card a-customer-preview">
            <summary><h2>Preview: what the customer sees</h2></summary>
            <div className="a-preview-frame">
              <TrackingCard embedded view={view} photoBase={`/api/admin/orders/${order.id}/photos`} />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
