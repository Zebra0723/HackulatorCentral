"use client";

import { useState } from "react";

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
        <p className="lede">You won&apos;t get the Weekly Drop any more.</p>
      </>
    );
  }
  return (
    <>
      <h1 className="h2">Unsubscribe from the Weekly Drop?</h1>
      <p className="lede">You&apos;ll stop getting the Weekly Drop. This doesn&apos;t affect a waitlist spot or an order.</p>
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
