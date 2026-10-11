"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      router.replace("/admin");
      router.refresh();
    } else {
      const data = await res?.json().catch(() => ({}));
      setError((data as { error?: string })?.error ?? "Couldn't sign in.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="a-form">
      <label className="a-field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label className="a-field">
        <span>Password</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error && <p className="a-error" role="alert">{error}</p>}
      <button className="a-btn a-btn--primary" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
