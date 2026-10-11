"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Calls an admin API route and refreshes server data on success. */
export function useApi() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function call<T = Record<string, unknown>>(
    method: string,
    url: string,
    body?: unknown,
    opts: { success?: string; refresh?: boolean } = {},
  ): Promise<T | null> {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
        body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as T & { error?: string };
      if (res.status === 401) {
        setError("Your session has ended. Please sign in again.");
        router.push("/admin/login");
        return null;
      }
      if (!res.ok) {
        setError(data.error ?? `Something went wrong (${res.status}). Nothing was changed.`);
        return null;
      }
      if (opts.success) setMessage(opts.success);
      if (opts.refresh !== false) router.refresh();
      return data;
    } catch {
      setError("Couldn't reach the server. Nothing was changed.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { call, busy, error, message, setError, setMessage };
}

export function Feedback({ error, message }: { error: string | null; message: string | null }) {
  if (error) return <p className="a-error" role="alert">{error}</p>;
  if (message) return <p className="a-success" role="status">{message}</p>;
  return null;
}
