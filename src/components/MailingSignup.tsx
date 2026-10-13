"use client";

import { useState, type FormEvent } from "react";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

/** Homepage sign-up for the weekly email. Consent is a required tick box; nothing is sent on sign-up. */
export function MailingSignup({ available }: { available: boolean }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/mailing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fd.get("email"), name: fd.get("name"), consent: fd.get("consent") === "on", website: fd.get("website") }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setState(res.ok ? { kind: "done" } : { kind: "error", message: data.error ?? "Something went wrong. You weren't signed up." });
    } catch {
      setState({ kind: "error", message: "Couldn't reach the server. You weren't signed up." });
    }
  }

  if (state.kind === "done") {
    return (
      <div className="drop__done" role="status">
        <strong>You&apos;re on the list! 📬</strong>
        <span>The next Weekly Drop lands in your inbox soon. Unsubscribe any time from the link in each email.</span>
      </div>
    );
  }
  if (!available) return <p className="drop__off">Sign-ups open soon.</p>;
  return (
    <form className="drop__form" onSubmit={onSubmit}>
      <div className="drop__row">
        <label className="visually-hidden" htmlFor="drop-name">First name (optional)</label>
        <input id="drop-name" name="name" placeholder="First name (optional)" maxLength={60} autoComplete="given-name" />
        <label className="visually-hidden" htmlFor="drop-email">Email</label>
        <input id="drop-email" name="email" type="email" placeholder="you@example.com" maxLength={160} autoComplete="email" required />
        <button className="btn btn-primary drop__btn" disabled={state.kind === "sending"}>
          {state.kind === "sending" ? "Signing up…" : "Get the Drop"}
        </button>
      </div>
      <label className="wl__hp" aria-hidden="true">
        Website <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <label className="drop__consent">
        <input type="checkbox" name="consent" required />
        <span>Email me the weekly Hackulator update. I can unsubscribe any time.</span>
      </label>
      {state.kind === "error" && (
        <p className="drop__error" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}

export function UnsubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  async function go() {
    setState("busy");
    try {
      const res = await fetch("/api/mailing/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }
  if (state === "done") {
    return (
      <>
        <h1 className="h2">You&apos;re unsubscribed</h1>
        <p className="lede">You won&apos;t get the weekly Hackulator email any more. Changed your mind? Sign up again on the homepage.</p>
      </>
    );
  }
  return (
    <>
      <h1 className="h2">Unsubscribe from the Weekly Drop?</h1>
      <p className="lede">You&apos;ll stop getting the weekly Hackulator email. This doesn&apos;t affect a waitlist spot or an order.</p>
      <button type="button" className="btn btn-primary" onClick={go} disabled={state === "busy"} style={{ marginTop: 18 }}>
        {state === "busy" ? "Unsubscribing…" : "Unsubscribe"}
      </button>
      {state === "error" && (
        <p className="myspot__error" role="alert">
          That unsubscribe link isn&apos;t valid. Use the link from your latest email, or get in touch.
        </p>
      )}
    </>
  );
}
