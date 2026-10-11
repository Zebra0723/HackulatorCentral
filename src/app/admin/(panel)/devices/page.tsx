import Link from "next/link";
import { DeviceForm } from "@/components/admin/DeviceForm";
import { fmtDate } from "@/components/admin/fmt";
import { listDevices } from "@/lib/server/devices";
import { requireAdminPage } from "@/lib/server/http";

export default async function DevicesPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { db } = await requireAdminPage();
  const { order } = await searchParams;
  const rows = await listDevices(db);
  return (
    <div className="a-stack">
      <h1>Devices</h1>
      <p className="a-muted">
        Device IDs (HACK-####) are separate from order numbers. These are records you keep up to date, not live readings
        from a calculator.
      </p>
      <section className="a-card">
        <h2>Add a device</h2>
        <DeviceForm device={null} defaultOrder={order ?? ""} />
      </section>
      {rows.length === 0 ? (
        <p className="a-empty">No devices yet.</p>
      ) : (
        <ul className="a-rows">
          {rows.map((d) => (
            <li key={d.id}>
              <Link className="a-row" href={`/admin/devices/${d.id}`}>
                <span className="a-row__main">
                  <strong>{d.reference}</strong> {d.owner_name}
                  <span className="a-muted a-row__sub">
                    {d.order_reference ? `Order ${d.order_reference}` : "No order linked"} · software {d.software_version || "—"} · hardware {d.hardware_revision || "—"}
                  </span>
                </span>
                <span className="a-row__side a-muted small">Updated {fmtDate(d.updated_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
