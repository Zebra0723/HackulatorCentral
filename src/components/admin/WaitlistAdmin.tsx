"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Feedback, useApi } from "./useApi";

export interface WaitlistEntry {
  id: number;
  queueNumber: number | null;
  name: string;
  email: string;
  note: string;
  privateNote: string;
  status: string;
  source: string;
  joined: string;
  code: string;
}

const STATUS_OPTIONS = [
  ["waiting", "Waiting"],
  ["contacted", "Contacted"],
  ["converted", "Became an order"],
  ["withdrawn", "Withdrawn (frees the spot)"],
] as const;

/** Spots and open/closed, right on the waitlist page. */
export function WaitlistControls({ spots, open, taken }: { spots: number; open: boolean; taken: number }) {
  const { call, busy, error, message } = useApi();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await call("PUT", "/api/admin/settings", { waitlistSpots: Number(fd.get("spots")), waitlistOpen: fd.get("open") === "on" }, { success: "Saved." });
  }
  return (
    <form className="a-form" onSubmit={onSubmit}>
      <div className="a-grid2">
        <label className="a-field">
          <span>Number of spots</span>
          <input name="spots" type="number" min={0} max={10000} defaultValue={spots} required />
          <small>{taken} taken now. The website shows how many are left.</small>
        </label>
        <div className="a-field">
          <span>Status</span>
          <label className="a-check">
            <input name="open" type="checkbox" defaultChecked={open} /> Open: people can join from the website
          </label>
        </div>
      </div>
      <Feedback error={error} message={message} />
      <button className="a-btn a-btn--primary a-btn--sm" disabled={busy}>Save waitlist settings</button>
    </form>
  );
}

export function AddWaitlistEntry() {
  const { call, busy, error, message } = useApi();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await call("POST", "/api/admin/waitlist", { name: fd.get("name"), email: fd.get("email"), note: fd.get("note"), privateNote: fd.get("privateNote") }, { success: "Added to the end of the list." });
    if (res) form.reset();
  }
  return (
    <form className="a-form" onSubmit={onSubmit}>
      <div className="a-grid2">
        <label className="a-field"><span>Name</span><input name="name" maxLength={80} required /></label>
        <label className="a-field"><span>Email</span><input name="email" type="email" maxLength={160} required /></label>
      </div>
      <div className="a-grid2">
        <label className="a-field"><span>Their note</span><input name="note" maxLength={300} /></label>
        <label className="a-field a-field--private"><span>Private note (only you)</span><textarea name="privateNote" rows={1} maxLength={1000} /></label>
      </div>
      <Feedback error={error} message={message} />
      <button className="a-btn a-btn--sm" disabled={busy}>Add person</button>
    </form>
  );
}

export function WaitlistRowEditor({ entry, first, last }: { entry: WaitlistEntry; first: boolean; last: boolean }) {
  const { call, busy, error, message } = useApi();
  const [editing, setEditing] = useState(false);
  const url = `/api/admin/waitlist/${entry.id}`;

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await call("PATCH", url, {
      name: fd.get("name"),
      email: fd.get("email"),
      note: fd.get("note"),
      privateNote: fd.get("privateNote"),
      status: fd.get("status"),
    }, { success: "Saved." });
    if (res) setEditing(false);
  }

  return (
    <li className={`a-card a-wl${entry.status === "withdrawn" ? " a-wl--withdrawn" : ""}`}>
      <div className="a-wl__row">
        <span className="a-wl__num" aria-label={entry.queueNumber ? `Queue number ${entry.queueNumber}` : "Not holding a spot"}>
          {entry.queueNumber ?? "–"}
        </span>
        <div className="a-wl__main">
          <strong>{entry.name}</strong>
          <span className="a-muted small">
            <a href={`mailto:${entry.email}`}>{entry.email}</a> · joined {entry.joined}
            {entry.source === "owner" ? " · added by you" : ""}
          </span>
          <span className="a-wl__id small">
            Waitlist ID <code>{entry.code}</code>
          </span>
          {entry.note && <span className="a-quote small">“{entry.note}”</span>}
          {entry.privateNote && <span className="a-chip a-chip--private">Private: {entry.privateNote}</span>}
        </div>
        <span className={`a-status a-status--wl-${entry.status}`}>{STATUS_OPTIONS.find(([v]) => v === entry.status)?.[1].replace(" (frees the spot)", "")}</span>
      </div>
      <div className="a-inline a-wrap">
        <button type="button" className="a-btn a-btn--sm a-btn--ghost" disabled={busy || first} onClick={() => call("PATCH", url, { move: "up" })} aria-label={`Move ${entry.name} up`}>↑ Up</button>
        <button type="button" className="a-btn a-btn--sm a-btn--ghost" disabled={busy || last} onClick={() => call("PATCH", url, { move: "down" })} aria-label={`Move ${entry.name} down`}>↓ Down</button>
        <button type="button" className="a-btn a-btn--sm" onClick={() => setEditing((v) => !v)} aria-expanded={editing}>{editing ? "Close" : "Edit"}</button>
        <button
          type="button"
          className="a-btn a-btn--sm a-btn--ghost"
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Give ${entry.name} a new waitlist ID? Their old ID will stop working for orders.`)) {
              call("PATCH", url, { newId: true }, { success: "New ID issued. Send it to them yourself." });
            }
          }}
        >
          New ID
        </button>
        <button
          type="button"
          className="a-btn a-btn--sm a-btn--danger"
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Remove ${entry.name} from the waitlist completely? (To keep a record, set them to Withdrawn instead.)`)) call("DELETE", url);
          }}
        >
          Remove
        </button>
      </div>
      {editing && (
        <form className="a-form a-subform" onSubmit={onSave}>
          <div className="a-grid2">
            <label className="a-field"><span>Name</span><input name="name" defaultValue={entry.name} maxLength={80} required /></label>
            <label className="a-field"><span>Email</span><input name="email" type="email" defaultValue={entry.email} maxLength={160} required /></label>
          </div>
          <div className="a-grid2">
            <label className="a-field">
              <span>Status</span>
              <select name="status" defaultValue={entry.status}>
                {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="a-field"><span>Their note</span><input name="note" defaultValue={entry.note} maxLength={300} /></label>
          </div>
          <label className="a-field a-field--private"><span>Private note (only you)</span><textarea name="privateNote" rows={2} defaultValue={entry.privateNote} maxLength={1000} /></label>
          <button className="a-btn a-btn--primary a-btn--sm" disabled={busy}>Save</button>
        </form>
      )}
      <Feedback error={error} message={message} />
    </li>
  );
}
