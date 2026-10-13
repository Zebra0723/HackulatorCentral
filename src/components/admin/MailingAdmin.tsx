"use client";

import { useMemo, useState } from "react";
import {
  EMAIL_IMAGES,
  NEWSLETTER_LIMITS as L,
  NEWSLETTER_PRESETS,
  renderNewsletter,
  type NewsletterContent,
} from "@/lib/email/newsletter";
import { Feedback, useApi } from "./useApi";

export interface PastIssue {
  id: number;
  subject: string;
  sentAt: string;
  recipients: number;
  failed: number;
  content: NewsletterContent;
}

/**
 * Weekly email composer. The preview uses the exact same template the server sends,
 * so it's what subscribers will see (each with their own name and unsubscribe link).
 */
export function MailingComposer({
  initial,
  issueNumber,
  waitlist,
  subscribers,
  emailReady,
  bulkReady,
  testTo,
  past,
  siteUrl,
}: {
  initial: NewsletterContent;
  issueNumber: number;
  waitlist: { spots: number; left: number; open: boolean };
  subscribers: number;
  emailReady: boolean;
  bulkReady: boolean;
  testTo: string;
  past: PastIssue[];
  siteUrl: string;
}) {
  const [c, setC] = useState<NewsletterContent>(initial);
  const [width, setWidth] = useState<"desktop" | "phone">("desktop");
  const [previewName, setPreviewName] = useState("Ada");
  const save = useApi();
  const test = useApi();
  const send = useApi();
  const busy = save.busy || test.busy || send.busy;

  const set = <K extends keyof NewsletterContent>(k: K, v: NewsletterContent[K]) => setC((p) => ({ ...p, [k]: v }));
  const setSection = (i: number, patch: Partial<NewsletterContent["sections"][number]>) =>
    setC((p) => ({ ...p, sections: p.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const moveSection = (i: number, d: -1 | 1) =>
    setC((p) => {
      const s = [...p.sections];
      const j = i + d;
      if (j < 0 || j >= s.length) return p;
      [s[i], s[j]] = [s[j], s[i]];
      return { ...p, sections: s };
    });

  const preview = useMemo(() => {
    return renderNewsletter(c, { siteUrl, unsubscribeUrl: "#unsubscribe", issueNumber, date: new Date(), name: previewName, waitlist }).html;
  }, [c, issueNumber, waitlist, previewName, siteUrl]);

  async function sendAll() {
    if (!window.confirm(`Send “${c.subject || "(no subject)"}” to ${subscribers} ${subscribers === 1 ? "person" : "people"}? This can't be undone.`)) return;
    const r = await send.call<{ sent: number; failed: number; issue: number; error?: string }>(
      "POST",
      "/api/admin/mailing/send",
      { confirm: true, content: c },
    );
    if (r && r.failed) send.setError(`Issue #${r.issue}: sent to ${r.sent}, but ${r.failed} failed. ${r.error ?? ""}`);
    else if (r) send.setMessage(`Issue #${r.issue} sent to ${r.sent} ${r.sent === 1 ? "person" : "people"}! 🎉`);
  }

  return (
    <div className="a-mail">
      <div className="a-mail__edit a-card">
        <div className="a-head">
          <h2>Write this week&apos;s Drop</h2>
          <label className="a-mail__preset">
            <span className="visually-hidden">Start from a template</span>
            <select
              value=""
              onChange={(e) => {
                const preset = NEWSLETTER_PRESETS.find((p) => p.id === e.target.value);
                if (preset && window.confirm(`Replace what you've written with the “${preset.label}” template?`)) setC(preset.content);
              }}
            >
              <option value="">Start from a template…</option>
              {NEWSLETTER_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="a-fieldset">
          <legend>Inbox</legend>
          <label className="a-field">
            <span>Subject line</span>
            <input value={c.subject} maxLength={L.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Your calculator is about to get a lot more fun 🎮" />
          </label>
          <label className="a-field">
            <span>Preview text <em>(the grey line after the subject)</em></span>
            <input value={c.preheader} maxLength={L.preheader} onChange={(e) => set("preheader", e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="a-fieldset">
          <legend>Hero</legend>
          <label className="a-field">
            <span>Little pill above the headline</span>
            <input value={c.eyebrow} maxLength={L.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} placeholder="The Weekly Drop" />
          </label>
          <div className="a-grid2">
            <label className="a-field">
              <span>Headline</span>
              <input value={c.headline} maxLength={L.headline} onChange={(e) => set("headline", e.target.value)} placeholder="A calculator." />
            </label>
            <label className="a-field">
              <span>Second line <em>(in lime)</em></span>
              <input value={c.headlineAccent} maxLength={L.headlineAccent} onChange={(e) => set("headlineAccent", e.target.value)} placeholder="Reimagined." />
            </label>
          </div>
          <label className="a-field">
            <span>Intro</span>
            <textarea rows={3} value={c.intro} maxLength={L.intro} onChange={(e) => set("intro", e.target.value)} />
          </label>
          <ImagePicker label="Big picture" value={c.imageUrl} onChange={(v) => set("imageUrl", v)} />
          <div className="a-grid2">
            <label className="a-field">
              <span>Button text</span>
              <input value={c.ctaLabel} maxLength={L.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} placeholder="Reserve my spot" />
            </label>
            <label className="a-field">
              <span>Button link</span>
              <input value={c.ctaUrl} maxLength={L.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="/#waitlist or https://…" />
            </label>
          </div>
        </fieldset>

        <fieldset className="a-fieldset">
          <legend>Big numbers strip <em className="a-muted">(up to 4, optional)</em></legend>
          {c.highlights.map((h, i) => (
            <div key={i} className="a-inline a-mail__hl">
              <input aria-label={`Number ${i + 1}`} value={h.value} maxLength={L.highlightValue} placeholder="3" onChange={(e) => setC((p) => ({ ...p, highlights: p.highlights.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) }))} />
              <input aria-label={`Label ${i + 1}`} value={h.label} maxLength={L.highlightLabel} placeholder="games included" onChange={(e) => setC((p) => ({ ...p, highlights: p.highlights.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) }))} />
              <button type="button" className="a-btn a-btn--sm a-btn--ghost" aria-label={`Remove number ${i + 1}`} onClick={() => setC((p) => ({ ...p, highlights: p.highlights.filter((_, j) => j !== i) }))}>✕</button>
            </div>
          ))}
          {c.highlights.length < L.highlights && (
            <button type="button" className="a-btn a-btn--sm" onClick={() => setC((p) => ({ ...p, highlights: [...p.highlights, { value: "", label: "" }] }))}>+ Add number</button>
          )}
        </fieldset>

        <label className="a-check">
          <input type="checkbox" checked={c.showWaitlist} onChange={(e) => set("showWaitlist", e.target.checked)} /> Show the big lime &ldquo;spots left&rdquo; banner
          ({waitlist.open ? `${waitlist.left} of ${waitlist.spots} left right now` : "closed"})
        </label>

        <fieldset className="a-fieldset">
          <legend>Features</legend>
          {c.sections.map((s, i) => (
            <div key={i} className="a-mail__section">
              <div className="a-inline a-wrap">
                <strong className="a-mail__num">{String(i + 1).padStart(2, "0")}</strong>
                <button type="button" className="a-btn a-btn--sm a-btn--ghost" disabled={i === 0} onClick={() => moveSection(i, -1)} aria-label={`Move feature ${i + 1} up`}>↑</button>
                <button type="button" className="a-btn a-btn--sm a-btn--ghost" disabled={i === c.sections.length - 1} onClick={() => moveSection(i, 1)} aria-label={`Move feature ${i + 1} down`}>↓</button>
                <button type="button" className="a-btn a-btn--sm a-btn--danger" onClick={() => setC((p) => ({ ...p, sections: p.sections.filter((_, j) => j !== i) }))}>Remove</button>
              </div>
              <label className="a-field">
                <span>Title</span>
                <input value={s.title} maxLength={L.sectionTitle} onChange={(e) => setSection(i, { title: e.target.value })} />
              </label>
              <label className="a-field">
                <span>Text</span>
                <textarea rows={3} value={s.body} maxLength={L.sectionBody} onChange={(e) => setSection(i, { body: e.target.value })} />
              </label>
              <ImagePicker label="Picture beside it" value={s.imageUrl} onChange={(v) => setSection(i, { imageUrl: v })} />
            </div>
          ))}
          {c.sections.length < L.sections && (
            <button type="button" className="a-btn a-btn--sm" onClick={() => setC((p) => ({ ...p, sections: [...p.sections, { title: "", body: "", imageUrl: "" }] }))}>
              + Add feature
            </button>
          )}
          <small className="a-muted">
            Formatting: <code>**bold**</code>, <code>[link text](https://…)</code>, lines starting <code>- </code> become bullets, and a blank
            line starts a new paragraph. <code>{"{name}"}</code> becomes each person&apos;s first name. Features with a picture sit side by side
            (zig-zagging); without one they&apos;re a card.
          </small>
        </fieldset>

        <fieldset className="a-fieldset">
          <legend>Ending</legend>
          <label className="a-field">
            <span>Closing headline</span>
            <input value={c.closingHeadline} maxLength={L.closingHeadline} onChange={(e) => set("closingHeadline", e.target.value)} placeholder="Be one of the first." />
          </label>
          <label className="a-field">
            <span>Closing text <em>(the button repeats under it)</em></span>
            <textarea rows={2} value={c.closingText} maxLength={L.closingText} onChange={(e) => set("closingText", e.target.value)} />
          </label>
        </fieldset>

        <div className="a-inline a-wrap">
          <button type="button" className="a-btn" disabled={busy} onClick={() => save.call("PUT", "/api/admin/mailing/draft", c, { success: "Draft saved.", refresh: false })}>
            Save draft
          </button>
          <button
            type="button"
            className="a-btn"
            disabled={busy || !emailReady}
            onClick={() => test.call("POST", "/api/admin/mailing/test", c, { success: `Test sent to ${testTo}. Check your inbox.`, refresh: false })}
          >
            Send a test to me
          </button>
          <button type="button" className="a-btn a-btn--primary" disabled={busy || !bulkReady || subscribers === 0} onClick={sendAll}>
            {send.busy ? "Sending…" : `Send to ${subscribers} ${subscribers === 1 ? "subscriber" : "subscribers"}`}
          </button>
        </div>
        <Feedback error={save.error} message={save.message} />
        <Feedback error={test.error} message={test.message} />
        <Feedback error={send.error} message={send.message} />
        {!emailReady ? (
          <p className="a-note small">
            <strong>Email isn&apos;t set up yet.</strong> Add <code>RESEND_API_KEY</code> in Vercel (see Site settings → Order request emails).
            You can still write and preview.
          </p>
        ) : !bulkReady ? (
          <p className="a-note small">
            <strong>Tests work, but sending to subscribers needs your own domain.</strong> In Resend, add and verify your domain (e.g.
            dailyos.uk), then set <code>EMAIL_FROM</code> in Vercel to something like <code>Hackulator &lt;drop@dailyos.uk&gt;</code> and redeploy.
          </p>
        ) : null}

        {past.length > 0 && (
          <details className="a-mail__past">
            <summary>Past issues ({past.length})</summary>
            <ul className="a-list">
              {past.map((p) => (
                <li key={p.id}>
                  <span>
                    <strong>{p.subject}</strong>
                    <br />
                    <span className="a-muted small">
                      {p.sentAt} · {p.recipients} sent{p.failed ? ` · ${p.failed} failed` : ""}
                    </span>
                  </span>
                  <button type="button" className="a-btn a-btn--sm" onClick={() => window.confirm("Load this issue into the editor? It replaces what you've written.") && setC(p.content)}>
                    Reuse
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="a-mail__preview">
        <div className="a-inline a-wrap a-mail__bar">
          <strong>Preview</strong>
          <div className="a-seg" role="group" aria-label="Preview width">
            <button type="button" aria-pressed={width === "desktop"} onClick={() => setWidth("desktop")}>Desktop</button>
            <button type="button" aria-pressed={width === "phone"} onClick={() => setWidth("phone")}>Phone</button>
          </div>
          <label className="a-mail__as">
            as <input value={previewName} onChange={(e) => setPreviewName(e.target.value)} maxLength={30} aria-label="Preview first name" />
          </label>
        </div>
        <div className="a-mail__inbox">
          <div className="a-mail__inbox-from">Hackulator</div>
          <div className="a-mail__inbox-subject">{c.subject.replace(/\{name\}/g, previewName || "there") || "(no subject)"}</div>
          <div className="a-mail__inbox-pre">{c.preheader.replace(/\{name\}/g, previewName || "there")}</div>
        </div>
        <iframe
          title="Email preview"
          className={`a-mail__frame a-mail__frame--${width}`}
          srcDoc={preview}
          sandbox="allow-popups"
        />
      </div>
    </div>
  );
}

/** Pick one of the ready-made email pictures, none, or paste your own image link. */
function ImagePicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const preset = EMAIL_IMAGES.some((im) => im.url === value) ? value : value ? "custom" : "";
  return (
    <div className="a-field">
      <span>{label}</span>
      <div className="a-mail__pick">
        <select value={preset} onChange={(e) => onChange(e.target.value === "custom" ? "https://" : e.target.value)} aria-label={label}>
          <option value="">No picture</option>
          {EMAIL_IMAGES.map((im) => (
            <option key={im.url} value={im.url}>{im.label}</option>
          ))}
          <option value="custom">My own picture (link)…</option>
        </select>
        {preset === "custom" && (
          <input value={value} maxLength={L.imageUrl} onChange={(e) => onChange(e.target.value)} placeholder="https://…/photo.jpg" aria-label={`${label} link`} />
        )}
      </div>
    </div>
  );
}

export interface SubscriberRow {
  id: number;
  email: string;
  name: string;
  source: string;
  joined: string;
  unsubscribed: boolean;
}

export function SubscriberList({ rows }: { rows: SubscriberRow[] }) {
  const { call, busy, error } = useApi();
  if (!rows.length) return <p className="a-empty">No subscribers yet. Sign-ups from the homepage and the waitlist form appear here.</p>;
  return (
    <>
      <Feedback error={error} message={null} />
      <ul className="a-list a-mail__subs">
        {rows.map((r) => (
          <li key={r.id} className={r.unsubscribed ? "is-off" : undefined}>
            <span>
              <strong>{r.name || r.email}</strong>
              {r.name && <span className="a-muted"> · {r.email}</span>}
              <br />
              <span className="a-muted small">
                {r.unsubscribed ? "Unsubscribed" : "Subscribed"} · from {r.source} · {r.joined}
              </span>
            </span>
            <button
              type="button"
              className="a-btn a-btn--sm a-btn--danger"
              disabled={busy}
              onClick={() => window.confirm(`Delete ${r.email} from the list completely?`) && call("DELETE", `/api/admin/mailing/subscribers/${r.id}`)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
