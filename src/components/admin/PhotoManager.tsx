"use client";
/* eslint-disable @next/next/no-img-element -- private photos via authenticated route */

import { useRef, type FormEvent } from "react";
import { Feedback, useApi } from "./useApi";

export function PhotoManager({ orderId, photos }: { orderId: number; photos: { id: number; caption: string }[] }) {
  const { call, busy, error, message } = useApi();
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("photo");
    if (!(file instanceof File) || !file.size) return;
    if (file.size > 4 * 1024 * 1024) return alert("Photos must be 4 MB or smaller.");
    const ok = await call("POST", `/api/admin/orders/${orderId}/photos`, fd, { success: "Photo added to the customer's page." });
    if (ok) formRef.current?.reset();
  }

  return (
    <section className="a-card">
      <h2>6. Progress photos</h2>
      <p className="small a-muted">Only photos of this customer&apos;s own unit. JPEG, PNG or WebP, up to 4 MB.</p>
      <form ref={formRef} className="a-form" onSubmit={onSubmit}>
        <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required aria-label="Photo file" />
        <input name="caption" maxLength={200} placeholder="Caption (optional, shown to the customer)" aria-label="Caption" />
        <button className="a-btn a-btn--sm" disabled={busy}>{busy ? "Uploading…" : "Upload photo"}</button>
      </form>
      <Feedback error={error} message={message} />
      {photos.length > 0 && (
        <ul className="a-photos">
          {photos.map((p) => (
            <li key={p.id}>
              <img src={`/api/admin/orders/${orderId}/photos/${p.id}`} alt={p.caption || "Progress photo"} />
              <span className="small">{p.caption}</span>
              <button
                type="button"
                className="a-btn a-btn--sm a-btn--ghost"
                onClick={() => confirm("Remove this photo from the customer's page?") && call("DELETE", `/api/admin/orders/${orderId}/photos/${p.id}`, undefined, { success: "Photo removed." })}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
