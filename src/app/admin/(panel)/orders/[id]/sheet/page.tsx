import { notFound } from "next/navigation";
import { COVER_ICONS, findGame, formatPence, getCoverColour, getTier } from "@/config/offer";
import { PrintButton } from "@/components/admin/PrintButton";
import { fmtDate } from "@/components/admin/fmt";
import { describeUi, ownedGames, uiIncluded } from "@/lib/pricing";
import { readCatalogue } from "@/lib/server/catalogue";
import { requireAdminPage } from "@/lib/server/http";
import { jobTypeLabel, orderDetail } from "@/lib/server/orders";

const CHECKS = [
  "Donor calculator inspected; casing and keys undamaged",
  "Board fitted and seated; no loose wires",
  "Display aligned inside the opening",
  "Every key registers (test all keys)",
  "Calculator mode: basic arithmetic correct",
  "Each owned game launches and plays",
  "Custom UI applied as specified (if chosen)",
  "Cover name and icon checked against this sheet (if chosen)",
  "Power: switches on/off correctly",
  "Final clean and photo for the customer",
];

/** Printable build sheet. Contains only this order's details. */
export default async function SheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { db } = await requireAdminPage();
  const d = await orderDetail(db, Number((await params).id) || 0);
  if (!d) notFound();
  const { order, devices, events } = d;
  const b = order.build;
  const catalogue = await readCatalogue(db);
  const notes = events.filter((e) => e.kind === "internal").map((e) => e.message);
  const icon = b?.coverIcon.enabled ? COVER_ICONS.find((i) => i.id === b.coverIcon.iconId)?.label : null;

  return (
    <article className="sheet">
      <div className="sheet__actions no-print">
        <PrintButton />
      </div>
      <h1>Build sheet · {order.reference}</h1>
      <table className="sheet__table">
        <tbody>
          <tr><th>Order</th><td>{order.reference} · {jobTypeLabel(order.job_type)} · created {fmtDate(order.created_at)}</td></tr>
          <tr><th>Device ID</th><td>{devices.length ? devices.map((x) => x.reference).join(", ") : "Not assigned yet"}</td></tr>
          <tr><th>Customer</th><td>{order.customer_name}</td></tr>
          <tr><th>Calculator</th><td>An ordinary Casio scientific calculator (customer-supplied or sourced)</td></tr>
          {b && (
            <>
              <tr><th>Software level</th><td>{getTier(b.tier).name}</td></tr>
              <tr><th>Games</th><td>{ownedGames(b, catalogue).map((g) => g.name).join(", ")}{getTier(b.tier).includesAllGames ? " (+ future compatible games)" : ""}</td></tr>
              {b.tier === "choose" && b.packIds.length > 0 && <tr><th>Packs</th><td>{b.packIds.join(", ")}</td></tr>}
              {b.tier === "choose" && b.gameIds.length > 0 && (
                <tr><th>Single games</th><td>{b.gameIds.map((id) => findGame(catalogue, id)?.name ?? id).join(", ")}</td></tr>
              )}
              <tr><th>Cover name</th><td>{b.coverName.enabled ? <><strong className="sheet__exact">“{b.coverName.text}”</strong> in {getCoverColour(b.coverName.colour).label}</> : "None"}</td></tr>
              <tr><th>Cover icon</th><td>{icon ? <><strong>{icon}</strong> in {getCoverColour(b.coverIcon.colour).label}</> : "None"}</td></tr>
              <tr><th>Custom UI</th><td>{uiIncluded(b) ? describeUi(b.ui) : "Standard UI"}</td></tr>
              <tr><th>Extras (at acceptance)</th><td>{formatPence(order.extras_pence)}</td></tr>
            </>
          )}
        </tbody>
      </table>
      <h2>Build notes</h2>
      {notes.length ? <ul>{notes.map((n, i) => <li key={i}>{n}</li>)}</ul> : <p>None.</p>}
      <h2>Testing checklist</h2>
      <ul className="sheet__checks">
        {CHECKS.map((c) => (
          <li key={c}><span className="sheet__box" aria-hidden="true" /> {c}</li>
        ))}
      </ul>
      <p className="sheet__foot">Tested by: ____________________ Date: ____________</p>
    </article>
  );
}
