import Link from "next/link";
import { formatPence } from "@/config/offer";
import { fmtDateTime } from "@/components/admin/fmt";
import { requireAdminPage } from "@/lib/server/http";
import { jobTypeLabel, listOrders, statusLabel } from "@/lib/server/orders";

const FILTERS = [
  { id: "active", label: "Active" },
  { id: "unpaid", label: "Balance owed" },
  { id: "archived", label: "Archived" },
  { id: "all", label: "All history" },
] as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ filter?: string; status?: string }> }) {
  const { db } = await requireAdminPage();
  const sp = await searchParams;
  const filter = (FILTERS.find((f) => f.id === sp.filter)?.id ?? "active") as (typeof FILTERS)[number]["id"];
  let rows = await listOrders(db, filter);
  if (sp.status) rows = rows.filter((r) => r.status === sp.status);
  return (
    <div className="a-stack">
      <div className="a-head">
        <h1>Orders</h1>
        <Link className="a-btn a-btn--primary" href="/admin/orders/new">New order</Link>
      </div>
      <nav className="a-filters" aria-label="Filter orders">
        {FILTERS.map((f) => (
          <Link key={f.id} href={`/admin/orders?filter=${f.id}`} aria-current={f.id === filter && !sp.status ? "page" : undefined}>
            {f.label}
          </Link>
        ))}
        {sp.status && <span className="a-chip">Status: {statusLabel(sp.status)} · <Link href="/admin/orders">clear</Link></span>}
      </nav>
      {rows.length === 0 ? (
        <p className="a-empty">No orders here.</p>
      ) : (
        <ul className="a-rows">
          {rows.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="a-row">
                <span className="a-row__main">
                  <strong>{o.reference}</strong> {o.customer_name}
                  {o.is_test && <span className="a-chip">test</span>}
                  <span className="a-muted a-row__sub">{jobTypeLabel(o.job_type)} · updated {fmtDateTime(o.updated_at)}</span>
                </span>
                <span className="a-row__side">
                  <span className={`a-status a-status--${o.status}`}>{statusLabel(o.status)}</span>
                  <span className="a-muted small">
                    Paid {formatPence(o.paid)}
                    {o.agreed_total_pence != null && ` of ${formatPence(o.agreed_total_pence)}`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
