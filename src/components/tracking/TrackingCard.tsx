/* eslint-disable @next/next/no-img-element -- private photos served through an access-checked route */
import { formatPence } from "@/config/offer";
import type { TrackingView } from "@/lib/server/orders";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const fmtDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** The customer's read-only view. Rendered from TrackingView only, which never contains internal data. */
export function TrackingCard({ view, photoBase, embedded = false }: { view: TrackingView; photoBase: string; embedded?: boolean }) {
  const Title = embedded ? "h3" : "h1";
  return (
    <div className="track">
      <header className="track__head">
        <p className="eyebrow">Follow your build</p>
        <Title className="track__ref">{view.reference}</Title>
        <p className="muted">{view.jobType}</p>
        <p className="small muted">Last updated {fmt(view.lastUpdated)}</p>
      </header>

      {view.cancelled ? (
        <div className="track__banner track__banner--muted" role="status">This order has been cancelled.</div>
      ) : view.waiting ? (
        <div className="track__banner" role="status">
          <strong>{view.waiting}.</strong> We&apos;ll update this page as soon as that changes.
        </div>
      ) : null}

      <ol className="track__steps" aria-label="Build progress">
        {view.steps.map((s) => (
          <li key={s.id} className={`track__step is-${s.state}`} aria-current={s.state === "current" ? "step" : undefined}>
            <span className="track__dot" aria-hidden="true" />
            <span>{s.label}</span>
            <span className="visually-hidden">{s.state === "done" ? " (done)" : s.state === "current" ? " (current stage)" : ""}</span>
          </li>
        ))}
      </ol>

      <div className="track__grid">
        <section className="track__card">
          <h2 className="h3">Updates</h2>
          {view.milestones.length === 0 ? (
            <p className="muted">No updates yet.</p>
          ) : (
            <ol className="track__timeline">
              {[...view.milestones].reverse().map((m, i) => (
                <li key={i}>
                  <time dateTime={m.at}>{fmt(m.at)}</time>
                  <p>{m.text}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="track__side">
          {view.estimatedReady && (
            <section className="track__card">
              <h2 className="h3">Estimated ready date</h2>
              <p className="track__big">{fmtDate(view.estimatedReady)}</p>
              <p className="small muted">This is an estimate, not a guarantee.</p>
            </section>
          )}

          {view.money && (
            <section className="track__card">
              <h2 className="h3">Payments</h2>
              <dl className="track__kv">
                <div>
                  <dt>Received</dt>
                  <dd>{formatPence(view.money.received)}</dd>
                </div>
                <div>
                  <dt>Agreed total</dt>
                  <dd>{view.money.agreedTotal != null ? formatPence(view.money.agreedTotal) : "To be confirmed"}</dd>
                </div>
                {view.money.balance != null && (
                  <div>
                    <dt>Remaining</dt>
                    <dd>{formatPence(view.money.balance)}</dd>
                  </div>
                )}
              </dl>
              {view.money.depositRequired != null && !view.cancelled && (
                <p className="small">
                  A deposit of at least {formatPence(view.money.depositRequired + view.money.received)} is needed before building
                  starts. It counts towards your total; it isn&apos;t an extra fee.
                </p>
              )}
            </section>
          )}

          {view.configuration && (
            <section className="track__card">
              <h2 className="h3">Your configuration</h2>
              <ul className="track__config">
                {view.configuration.lines.map((l, i) => (
                  <li key={i}>
                    <span>{l.label}</span>
                    <span>{l.value}</span>
                  </li>
                ))}
              </ul>
              <ul className="small muted track__details">
                {view.configuration.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {view.photos.length > 0 && (
        <section className="track__card">
          <h2 className="h3">Photos of your Hackulator</h2>
          <div className="track__photos">
            {view.photos.map((p) => (
              <figure key={p.id}>
                <img src={`${photoBase}/${p.id}`} alt={p.caption || "Photo of your Hackulator in progress"} loading="lazy" />
                {p.caption && <figcaption className="small muted">{p.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
