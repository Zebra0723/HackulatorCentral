import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPence } from "@/config/offer";
import { DeviceForm } from "@/components/admin/DeviceForm";
import { ServiceForm } from "@/components/admin/ServiceForm";
import { fmtDateTime } from "@/components/admin/fmt";
import { SERVICE_ACTIONS, getDevice } from "@/lib/server/devices";
import { requireAdminPage } from "@/lib/server/http";

export default async function DevicePage({ params }: { params: Promise<{ id: string }> }) {
  const { db } = await requireAdminPage();
  const r = await getDevice(db, Number((await params).id) || 0);
  if (!r) notFound();
  const { device, services } = r;
  return (
    <div className="a-stack">
      <p className="small"><Link href="/admin/devices">← Devices</Link></p>
      <h1>{device.reference}</h1>
      <div className="a-cols">
        <section className="a-card">
          <h2>Device record</h2>
          <DeviceForm
            device={{
              id: device.id,
              ownerName: device.owner_name,
              order: device.order_reference ?? "",
              hardwareRevision: device.hardware_revision,
              softwareVersion: device.software_version,
              owned: device.owned.join("\n"),
              installed: device.installed.join("\n"),
              notes: device.notes,
            }}
          />
          <p className="small a-muted">Removing software from “Installed” never removes it from “Owned”.</p>
        </section>
        <div className="a-stack">
          <section className="a-card">
            <h2>Add a service record</h2>
            <ServiceForm deviceId={device.id} actions={SERVICE_ACTIONS} />
          </section>
          <section className="a-card">
            <h2>Service history</h2>
            {services.length === 0 ? (
              <p className="a-empty">No service records.</p>
            ) : (
              <ul className="a-list a-list--small">
                {services.map((s) => (
                  <li key={s.id}>
                    <span>
                      <strong>{s.category}</strong> · {s.action}
                      {s.description && ` · ${s.description}`}
                    </span>
                    <span className="a-muted">
                      {s.covered ? "Covered" : s.price_pence != null ? formatPence(s.price_pence) : "No charge"} · {fmtDateTime(s.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
