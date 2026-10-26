"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { readSavedWaitlistId } from "@/lib/waitlist-id";

interface SpotView {
  firstName: string;
  code: string;
  status: "waiting" | "contacted" | "converted" | "withdrawn";
  queueNumber: number | null;
  spots: number;
  joined: string;
  requests: { reference: string; status: string; created: string }[];
}

const STATUS: Record<SpotView["status"], { label: string; text: string }> = {
  waiting: { label: "Waiting", text: "Your place in the manufacturing queue is reserved. We'll be in touch when your spot comes up." },
  contacted: { label: "We've been in touch", text: "Your spot is coming up. Check your email for a message from Hackulator." },
  converted: { label: "Order in progress", text: "Your spot has become an order. You'll get a private tracking link for the build." },
  withdrawn: { label: "Withdrawn", text: "This spot isn't held any more. Get in touch if you'd like to rejoin." },
};

const REQUEST_STATUS: Record<string, string> = {
  new: "Received",
  reviewed: "Being reviewed",
  converted: "Accepted as an order",
  closed: "Closed",
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/** Look up your own spot by waitlist ID. The ID this browser was given is filled in automatically. */
export function MySpot({ email }: { email?: string }) {
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<SpotView | null>(null);

  useEffect(() => {
    const saved = readSavedWaitlistId();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off prefill from this browser after mount
    if (saved) setId(saved);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/waitlist/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json().catch(() => ({}))) as SpotView & { error?: string };
      if (!res.ok) {
        setView(null);
        setError(data.error ?? "Something went wrong. Please try again.");
      } else setView(data);
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const s = view ? STATUS[view.status] : null;
  return (
    <div className="myspot">
      <p className="myspot__kicker">Waitlist</p>
      <h1 className="h2">Check my spot</h1>
      <p className="lede">Enter the waitlist ID you got when you joined to see your place in the queue.</p>

      <form className="myspot__form" onSubmit={onSubmit}>
        <label className="visually-hidden" htmlFor="myspot-id">
          Waitlist ID
        </label>
        <input
          id="myspot-id"
          className="myspot__input"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="HK-XXXX-XXXX"
          maxLength={20}
          autoComplete="off"
          spellCheck={false}
          required
        />
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Checking…" : "Check"}
        </button>
      </form>
      {error && (
        <p className="myspot__error" role="alert">
          {error}
        </p>
      )}

      {view && s && (
        <section className={`myspot__card myspot__card--${view.status}`} aria-live="polite">
          <p className="myspot__hi">Hi {view.firstName}!</p>
          <div className="myspot__num">
            {view.queueNumber != null ? (
              <>
                <strong>#{view.queueNumber}</strong>
                <span>in the queue</span>
              </>
            ) : (
              <strong className="myspot__num--none">–</strong>
            )}
          </div>
          <p className="myspot__status">
            <span className={`myspot__pill myspot__pill--${view.status}`}>{s.label}</span>
          </p>
          <p>{s.text}</p>
          <dl className="myspot__facts">
            <div>
              <dt>Waitlist ID</dt>
              <dd>
                <code>{view.code}</code>
              </dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{fmtDate(view.joined)}</dd>
            </div>
          </dl>
          <h2 className="myspot__h">Your order requests</h2>
          {view.requests.length ? (
            <ul className="myspot__reqs">
              {view.requests.map((r) => (
                <li key={r.reference}>
                  <strong>{r.reference}</strong>
                  <span>{fmtDate(r.created)}</span>
                  <span className="myspot__req-status">{REQUEST_STATUS[r.status] ?? r.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="myspot__muted">
              None yet. <Link href="/#build">Build yours</Link> and send an order request with this ID.
            </p>
          )}
        </section>
      )}

      <p className="myspot__muted myspot__foot">
        Lost your ID? {email ? <>Email <a href={`mailto:${email}`}>{email}</a> from the address you joined with.</> : "Get in touch."}{" "}
        Not on the list yet? <Link href="/#waitlist">Join free</Link>.
      </p>
    </div>
  );
}
