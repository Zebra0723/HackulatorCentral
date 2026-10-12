import { AddWaitlistEntry, WaitlistControls, WaitlistRowEditor } from "@/components/admin/WaitlistAdmin";
import { fmtDateTime } from "@/components/admin/fmt";
import { requireAdminPage } from "@/lib/server/http";
import { listWaitlist, waitlistSummary } from "@/lib/server/waitlist";

export default async function WaitlistPage() {
  const { db } = await requireAdminPage();
  const [rows, summary] = await Promise.all([listWaitlist(db), waitlistSummary(db)]);
  const emails = rows.filter((r) => r.status !== "withdrawn").map((r) => r.email).join(", ");
  return (
    <div className="a-stack">
      <div className="a-head">
        <h1>Waitlist</h1>
        <span className="a-muted">
          {summary.taken} of {summary.spots} spots taken · {summary.left} left · {summary.open ? "open" : "closed"}
        </span>
      </div>
      <p className="a-note">
        Joining is free with no obligation to buy. Nobody is emailed automatically. Contact people yourself when their spot comes up.
        Set someone to <strong>Withdrawn</strong> to free their spot but keep the record.
      </p>
      <div className="a-cols">
        <section className="a-card">
          <h2>Spots</h2>
          <WaitlistControls spots={summary.spots} open={summary.open} taken={summary.taken} />
        </section>
        <section className="a-card">
          <h2>Add someone</h2>
          <AddWaitlistEntry />
        </section>
      </div>
      <section className="a-stack">
        <div className="a-head">
          <h2>Queue</h2>
          {emails && <a className="a-btn a-btn--sm" href={`mailto:?bcc=${encodeURIComponent(emails)}`}>Email everyone holding a spot</a>}
        </div>
        {rows.length === 0 ? (
          <p className="a-empty">Nobody yet. Sign-ups from the website appear here in order.</p>
        ) : (
          <ol className="a-stack a-wl-list">
            {rows.map((r, i) => (
              <WaitlistRowEditor
                key={r.id}
                first={i === 0}
                last={i === rows.length - 1}
                entry={{
                  id: r.id,
                  queueNumber: r.queue_number,
                  name: r.name,
                  email: r.email,
                  note: r.note,
                  privateNote: r.private_note,
                  status: r.status,
                  source: r.source,
                  joined: fmtDateTime(r.created_at),
                  code: r.code,
                }}
              />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
