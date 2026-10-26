"use client";

import { useState, type FormEvent } from "react";
import { WAITLIST_ID_KEY } from "@/lib/waitlist-id";

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done"; queueNumber: number | null; already: boolean; waitlistId: string | null }
  | { kind: "error"; message: string };

const PROMISES = ["Free to join", "No obligation to buy", "Reserves your place in the build queue", "Leave any time"];

/**
 * Public waitlist. Counts come from the server; the join form stores a name and
 * email only. Nothing is charged and nothing is emailed automatically.
 */
export function Waitlist({
  spots,
  taken: initialTaken,
  open,
  available,
}: {
  spots: number;
  taken: number;
  open: boolean;
  /** False when no database is connected: the form is replaced by a "opens soon" note. */
  available: boolean;
}) {
  const [taken, setTaken] = useState(initialTaken);
  const [state, setState] = useState<State>({ kind: "idle" });
  const left = Math.max(0, spots - taken);
  const full = left === 0;
  const showGrid = spots > 0 && spots <= 40;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          note: fd.get("note"),
          consent: fd.get("consent") === "on",
          website: fd.get("website"),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        queueNumber?: number | null;
        already?: boolean;
        waitlistId?: string | null;
        summary?: { taken: number };
      };
      if (!res.ok) return setState({ kind: "error", message: data.error ?? "Something went wrong. Nothing was saved." });
      if (data.summary) setTaken(data.summary.taken);
      const waitlistId = data.waitlistId ?? null;
      if (waitlistId) {
        try {
          localStorage.setItem(WAITLIST_ID_KEY, waitlistId);
        } catch {
          /* storage blocked: the ID is still shown on screen */
        }
      }
      setState({ kind: "done", queueNumber: data.queueNumber ?? null, already: Boolean(data.already), waitlistId });
    } catch {
      setState({ kind: "error", message: "Couldn't reach the server. Nothing was saved." });
    }
  }

  return (
    <div className="wl">
      <div className="wl__pitch">
        <p className="wl__kicker">
          <span className="wl__kicker-dot" aria-hidden="true" />
          {open && !full ? "Waitlist open" : full ? "Waitlist full" : "Waitlist closed"}
        </p>
        <h2 className="wl__title" id="waitlist-title">
          Only <span className="wl__hl">{spots}</span> {spots === 1 ? "spot" : "spots"}.
          <br />
          Be one of the first.
        </h2>
        <p className="wl__lede">
          The first Hackulators will be built by hand in a tiny batch. Join the waitlist to reserve your place in the
          manufacturing queue before the spots are gone.
        </p>
        <ul className="wl__promises">
          {PROMISES.map((p) => (
            <li key={p}>
              <span className="wl__tick" aria-hidden="true">✓</span>
              {p}
            </li>
          ))}
        </ul>

        <div className="wl__meter" aria-label={`${left} of ${spots} spots left`}>
          <div className="wl__count">
            <strong>{left}</strong>
            <span>
              of {spots} {spots === 1 ? "spot" : "spots"} left
            </span>
          </div>
          {showGrid ? (
            <ol className="wl__spots" aria-hidden="true">
              {Array.from({ length: spots }).map((_, i) => (
                <li key={i} className={i < taken ? "is-taken" : undefined}>
                  {i < taken ? "✓" : i + 1}
                </li>
              ))}
            </ol>
          ) : (
            <div className="wl__bar" aria-hidden="true">
              <span style={{ width: `${spots ? Math.min(100, (taken / spots) * 100) : 100}%` }} />
            </div>
          )}
        </div>
      </div>

      <div className="wl__card">
        {state.kind === "done" ? (
          <div className="wl__done" role="status">
            <div className="wl__confetti" aria-hidden="true">
              {Array.from({ length: 18 }).map((_, i) => (
                <span key={i} style={{ ["--i" as string]: i }} />
              ))}
            </div>
            {state.already ? (
              <>
                <h3>You&apos;re already on the list!</h3>
                <p>Your spot is safe. We&apos;ll be in touch when it comes up.</p>
                <p className="wl__fine">
                  Use the waitlist ID you got when you first joined to place your order.
                </p>
              </>
            ) : (
              <>
                <h3>You&apos;re in!</h3>
                {state.queueNumber != null && (
                  <p className="wl__done-num">
                    You&apos;re <strong>#{state.queueNumber}</strong> in the queue.
                  </p>
                )}
                {state.waitlistId && <WaitlistIdCard id={state.waitlistId} />}
                <p>
                  Your place is reserved. We&apos;ll contact you personally when your spot
                  comes up. Still no obligation to buy.
                </p>
              </>
            )}
          </div>
        ) : !available ? (
          <div className="wl__closed">
            <h3>The waitlist opens soon</h3>
            <p>Online sign-ups aren&apos;t switched on yet. Check back soon.</p>
          </div>
        ) : full || !open ? (
          <div className="wl__closed">
            <h3>{full ? `All ${spots} spots are taken` : "The waitlist is closed right now"}</h3>
            <p>{full ? "Spots sometimes open up, so check back soon." : "It may reopen soon."}</p>
          </div>
        ) : (
          <form className="wl__form" onSubmit={onSubmit}>
            <h3>Reserve your spot</h3>
            <label className="wl__field">
              <span>Your name</span>
              <input name="name" autoComplete="name" maxLength={80} required />
            </label>
            <label className="wl__field">
              <span>Email</span>
              <input name="email" type="email" autoComplete="email" maxLength={160} required />
            </label>
            <label className="wl__field">
              <span>
                Dream build <em>(optional)</em>
              </span>
              <input name="note" maxLength={300} placeholder="e.g. The Hacker, gold star on the cover" />
            </label>
            <label className="wl__hp" aria-hidden="true">
              Website <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
            <label className="wl__consent">
              <input type="checkbox" name="consent" required />
              <span>I&apos;m happy to be contacted about my waitlist spot.</span>
            </label>
            {state.kind === "error" && (
              <p className="wl__error" role="alert">
                {state.message}
              </p>
            )}
            <button className="btn btn-primary btn-block wl__submit" disabled={state.kind === "sending"}>
              {state.kind === "sending" ? "Reserving…" : "Reserve my spot. It's free"}
            </button>
            <p className="wl__fine">
              Joining is <strong>free</strong> and there&apos;s <strong>no obligation to buy</strong>. It only reserves
              your place in the manufacturing queue. Nothing is ever charged on this site, and we only use your details
              to contact you about your spot.
            </p>
          </form>
        )}
        <a className="wl__check" href="/my-spot">
          Already joined? <strong>Check my spot →</strong>
        </a>
      </div>
    </div>
  );
}

function WaitlistIdCard({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the ID is selectable */
    }
  }
  return (
    <div className="wl__id">
      <span className="wl__id-label">Your waitlist ID</span>
      <div className="wl__id-row">
        <code className="wl__id-code" data-testid="waitlist-id">{id}</code>
        <button type="button" className="btn btn-secondary wl__id-copy" onClick={copy}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="wl__id-hint">
        <strong>Save this ID.</strong> You&apos;ll need it to send your order request in Build Yours, and to{" "}
        <a href="/my-spot">check your spot</a> any time. This browser remembers it too.
      </p>
    </div>
  );
}
