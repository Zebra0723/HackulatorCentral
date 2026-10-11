"use client";

import type { FormEvent } from "react";
import { Feedback, useApi } from "./useApi";

export function ReleaseForm({ release }: { release: { id: number; version: string; name: string; changes: string; compatibility: string; status: string } | null }) {
  const { call, busy, error, message } = useApi();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const body = { version: fd.get("version"), name: fd.get("name"), changes: fd.get("changes"), compatibility: fd.get("compatibility"), status: fd.get("status") };
    const ok = release
      ? await call("PUT", `/api/admin/releases/${release.id}`, body, { success: "Saved." })
      : await call("POST", "/api/admin/releases", body, { success: "Release recorded." });
    if (ok && !release) form.reset();
  }
  return (
    <form className="a-form" onSubmit={onSubmit}>
      <div className="a-grid2">
        <label className="a-field"><span>Version</span><input name="version" defaultValue={release?.version} required placeholder="e.g. 0.4.0" /></label>
        <label className="a-field"><span>Name (optional)</span><input name="name" defaultValue={release?.name} /></label>
      </div>
      <label className="a-field"><span>What changed</span><textarea name="changes" rows={4} defaultValue={release?.changes} /></label>
      <label className="a-field"><span>Compatible hardware / features</span><input name="compatibility" defaultValue={release?.compatibility} /></label>
      <label className="a-field">
        <span>Status</span>
        <select name="status" defaultValue={release?.status ?? "draft"}>
          <option value="draft">Draft</option>
          <option value="released">Released</option>
        </select>
      </label>
      <Feedback error={error} message={message} />
      <button className="a-btn a-btn--primary a-btn--sm" disabled={busy}>Save</button>
    </form>
  );
}
