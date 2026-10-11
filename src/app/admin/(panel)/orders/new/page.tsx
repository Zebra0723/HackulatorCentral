import { NewOrderForm } from "@/components/admin/NewOrderForm";
import { formatPence } from "@/config/offer";
import { requireAdminPage } from "@/lib/server/http";
import type { EnquiryRow } from "@/lib/server/orders";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ enquiry?: string }> }) {
  const { db } = await requireAdminPage();
  const { enquiry } = await searchParams;
  const enq = enquiry
    ? (await db.query<EnquiryRow>("select * from enquiries where id = $1", [Number(enquiry) || 0]))[0] ?? null
    : null;
  return (
    <div className="a-stack a-narrow">
      <h1>New order</h1>
      {enq && (
        <section className="a-card">
          <h2>From enquiry {enq.reference}</h2>
          <p>
            {enq.name} · {enq.email}
          </p>
          {enq.quote && (
            <ul className="a-list a-list--small">
              {enq.quote.lines.map((l) => (
                <li key={l.key}>
                  <span>{l.label}</span>
                  <span>{l.amount ? formatPence(l.amount) : (l.note ?? "Included")}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="small a-muted">The configuration and its prices are copied into the order when you create it.</p>
        </section>
      )}
      <NewOrderForm enquiry={enq ? { id: enq.id, name: enq.name, email: enq.email, status: enq.status } : null} />
    </div>
  );
}
