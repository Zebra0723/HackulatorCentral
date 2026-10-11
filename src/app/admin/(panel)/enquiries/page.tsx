import Link from "next/link";
import { formatPence } from "@/config/offer";
import { EnquiryStatus } from "@/components/admin/EnquiryStatus";
import { fmtDateTime } from "@/components/admin/fmt";
import { requireAdminPage } from "@/lib/server/http";
import { listEnquiries } from "@/lib/server/orders";

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { db } = await requireAdminPage();
  const { status } = await searchParams;
  const rows = await listEnquiries(db, status);
  return (
    <div className="a-stack">
      <div className="a-head">
        <h1>Enquiries</h1>
        <Link className="a-btn" href="/admin/orders/new">Create manual order</Link>
      </div>
      <nav className="a-filters" aria-label="Filter enquiries">
        {[["", "All"], ["new", "New"], ["reviewed", "Reviewed"], ["converted", "Became orders"], ["closed", "Closed"]].map(([id, label]) => (
          <Link key={id} href={id ? `/admin/enquiries?status=${id}` : "/admin/enquiries"} aria-current={(status ?? "") === id ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="a-empty">No enquiries yet. Requests sent from the website appear here.</p>
      ) : (
        <ul className="a-stack">
          {rows.map((e) => (
            <li key={e.id} className="a-card">
              <div className="a-head">
                <div>
                  <h2>{e.reference} · {e.kind === "order" ? "Order request" : "Question"}</h2>
                  <p className="a-muted small">{fmtDateTime(e.created_at)} · {e.name} · <a href={`mailto:${e.email}`}>{e.email}</a></p>
                </div>
                <span className={`a-status a-status--enq-${e.status}`}>{e.status}</span>
              </div>
              {e.message && <p className="a-quote">{e.message}</p>}
              {e.quote && (
                <details>
                  <summary>Requested configuration · extras {formatPence(e.quote.extrasSubtotal)}</summary>
                  <ul className="a-list a-list--small">
                    {e.quote.lines.map((l) => (
                      <li key={l.key}><span>{l.label}</span><span>{l.amount ? formatPence(l.amount) : (l.note ?? "Included")}</span></li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="a-inline a-wrap">
                {e.status !== "converted" && <Link className="a-btn a-btn--sm a-btn--primary" href={`/admin/orders/new?enquiry=${e.id}`}>Accept as order</Link>}
                <EnquiryStatus id={e.id} status={e.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
