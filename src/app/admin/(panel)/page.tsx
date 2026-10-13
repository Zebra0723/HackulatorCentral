import Link from "next/link";
import { fmtDateTime } from "@/components/admin/fmt";
import { recentAudit } from "@/lib/server/audit";
import { requireAdminPage } from "@/lib/server/http";
import { dashboard, listOrders, statusLabel } from "@/lib/server/orders";
import { getSettings } from "@/lib/server/settings";

const ACTION_TEXT: Record<string, string> = {
  "order.create": "Order created",
  "order.tracking": "Tracking updated",
  "order.cancel": "Order cancelled",
  "order.archive": "Order archived",
  "order.unarchive": "Order unarchived",
  "order.delete": "Order deleted",
  "order.photo.add": "Photo added",
  "order.photo.remove": "Photo removed",
  "order.tracking.revoke": "Tracking link revoked",
  "order.tracking.regenerate": "New tracking link",
  "order.event.hide": "Update hidden from customer",
  "order.event.unhide": "Update shown to customer",
  "enquiry.status": "Enquiry updated",
  "catalogue.game.create": "Game added",
  "catalogue.game.update": "Game edited",
  "catalogue.pack.create": "Pack added",
  "catalogue.pack.update": "Pack edited",
  "device.create": "Device added",
  "device.update": "Device edited",
  "device.service.add": "Service record added",
  "release.create": "Release added",
  "release.update": "Release edited",
  export: "Data exported",
  "waitlist.add": "Waitlist: person added",
  "waitlist.update": "Waitlist: entry edited",
  "waitlist.move": "Waitlist: order changed",
  "waitlist.delete": "Waitlist: entry removed",
  "waitlist.newid": "Waitlist: new ID issued",
  "settings.update": "Site settings changed",
  "enquiry.email_failed": "Order email not sent",
  "mailing.send": "Weekly Drop sent",
  "mailing.remove": "Subscriber deleted",
};

export default async function AdminHome() {
  const { db } = await requireAdminPage();
  const c = await dashboard(db);
  const active = (await listOrders(db, "active")).slice(0, 6);
  const changes = await recentAudit(db, 12);
  const settings = await getSettings(db);
  const tiles = [
    { label: "New enquiries", n: c.new_enquiries, href: "/admin/enquiries" },
    { label: `Waitlist (of ${settings.waitlistSpots})`, n: c.waitlist_taken, href: "/admin/waitlist" },
    { label: "Active builds", n: c.active_builds, href: "/admin/orders" },
    { label: "Waiting for deposit", n: c.waiting_deposit, href: "/admin/orders?status=waiting_deposit" },
    { label: "Need testing", n: c.testing, href: "/admin/orders?status=testing" },
    { label: "Ready", n: c.ready, href: "/admin/orders?status=ready" },
  ];
  return (
    <div className="a-stack">
      <div className="a-head">
        <h1>Home</h1>
        <div className="a-head__actions">
          <Link className="a-btn a-btn--primary" href="/admin/orders/new">New order</Link>
          <a className="a-btn" href="/api/admin/export">Download backup</a>
        </div>
      </div>
      <div className="a-tiles">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="a-tile">
            <span className="a-tile__n">{t.n}</span>
            <span className="a-tile__l">{t.label}</span>
          </Link>
        ))}
      </div>
      <div className="a-cols">
        <section className="a-card">
          <h2>Build queue</h2>
          {active.length === 0 ? (
            <p className="a-empty">No active builds.</p>
          ) : (
            <ul className="a-list">
              {active.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`}>
                    <strong>{o.reference}</strong> · {o.customer_name}
                  </Link>
                  <span className={`a-status a-status--${o.status}`}>{statusLabel(o.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="a-card">
          <h2>Recent changes</h2>
          {changes.length === 0 ? (
            <p className="a-empty">Nothing yet.</p>
          ) : (
            <ul className="a-list a-list--small">
              {changes.map((a) => (
                <li key={a.id}>
                  <span>
                    {ACTION_TEXT[a.action] ?? a.action}
                    {a.entity === "order" && a.entity_id ? (
                      <> · <Link href={`/admin/orders/${a.entity_id}`}>order</Link></>
                    ) : null}
                  </span>
                  <span className="a-muted">{fmtDateTime(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
