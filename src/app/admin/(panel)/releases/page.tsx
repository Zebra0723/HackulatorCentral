import { ReleaseForm } from "@/components/admin/ReleaseForm";
import { fmtDate } from "@/components/admin/fmt";
import { listReleases } from "@/lib/server/devices";
import { requireAdminPage } from "@/lib/server/http";

export default async function ReleasesPage() {
  const { db } = await requireAdminPage();
  const rows = await listReleases(db);
  return (
    <div className="a-stack">
      <h1>Software releases</h1>
      <p className="a-muted">A record of versions and what changed. Releasing a version here doesn&apos;t install it on any calculator; updates are installed by hand.</p>
      <section className="a-card">
        <h2>Record a release</h2>
        <ReleaseForm release={null} />
      </section>
      {rows.map((r) => (
        <details key={r.id} className="a-card">
          <summary>
            <strong>{r.version}</strong> {r.name} · <span className={`a-status a-status--${r.status}`}>{r.status === "released" ? `Released ${fmtDate(r.released_at)}` : "Draft"}</span>
          </summary>
          <ReleaseForm release={{ id: r.id, version: r.version, name: r.name, changes: r.changes, compatibility: r.compatibility, status: r.status }} />
        </details>
      ))}
    </div>
  );
}
