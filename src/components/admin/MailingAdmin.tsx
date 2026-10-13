"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BLOCK_LIBRARY,
  EMAIL_IMAGES,
  NEWSLETTER_LIMITS as L,
  NEWSLETTER_PRESETS,
  QUICK_CTAS,
  QUICK_DEFAULT,
  QUICK_STYLES,
  THEMES,
  buildQuickDrop,
  createBlock,
  newBlockId,
  renderNewsletter,
  sanitizeQuickDrop,
  type BlockType,
  type EmailBlock,
  type NewsletterContent,
  type QuickDrop,
  type ThemeId,
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

export interface UploadedImage {
  id: string;
  name: string;
  url: string;
}

type Tab = "quick" | "content" | "add" | "theme" | "templates";

const QUICK_KEY = "hackulator.quickDrop";

/** Set a field on a block; "items.2.title" reaches into a list. */
function setPath(block: EmailBlock, path: string, value: string): EmailBlock {
  const [head, idx, leaf] = path.split(".");
  if (leaf === undefined) return { ...block, [head]: value } as EmailBlock;
  const list = (block as unknown as Record<string, unknown>)[head];
  if (!Array.isArray(list)) return block;
  return { ...block, [head]: list.map((x, i) => (i === Number(idx) ? { ...x, [leaf]: value } : x)) } as EmailBlock;
}

/* ------------------------------------------------------------ undo history */

function useHistory(initial: NewsletterContent) {
  const [h, setH] = useState({ doc: initial, past: [] as NewsletterContent[], future: [] as NewsletterContent[], at: 0 });

  /** Typing bursts merge into one undo step. */
  const update = useCallback((fn: (d: NewsletterContent) => NewsletterContent, merge = true) => {
    const now = Date.now();
    setH((st) => {
      const next = fn(st.doc);
      if (next === st.doc) return st;
      const push = !merge || now - st.at > 700;
      return { doc: next, past: push ? [...st.past.slice(-80), st.doc] : st.past, future: [], at: push ? now : st.at };
    });
  }, []);
  const undo = useCallback(
    () => setH((st) => (st.past.length ? { doc: st.past[st.past.length - 1], past: st.past.slice(0, -1), future: [...st.future, st.doc], at: 0 } : st)),
    [],
  );
  const redo = useCallback(
    () => setH((st) => (st.future.length ? { doc: st.future[st.future.length - 1], future: st.future.slice(0, -1), past: [...st.past, st.doc], at: 0 } : st)),
    [],
  );
  return { doc: h.doc, update, undo, redo, canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
}

/* ------------------------------------------------------------------ builder */

/**
 * The Weekly Drop builder: a theme plus a stack of blocks, with a live preview
 * rendered by the same code the server sends with. Click anything in the preview
 * to edit it; drag blocks to reorder; changes autosave as a draft.
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
  images: initialImages,
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
  images: UploadedImage[];
}) {
  const { doc, update, undo, redo, canUndo, canRedo } = useHistory(initial);
  const [tab, setTab] = useState<Tab>("quick");
  const [quick, setQuick] = useState<QuickDrop>(QUICK_DEFAULT);
  const lastQuick = useRef<NewsletterContent | null>(null);
  const customSubject = useRef(false);
  const [selected, setSelected] = useState<string | null>(initial.blocks[0]?.id ?? null);
  const [width, setWidth] = useState<"desktop" | "phone">("desktop");
  const [previewName, setPreviewName] = useState("Ada");
  const [images, setImages] = useState(initialImages);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error" | "idle">("idle");
  const test = useApi();
  const send = useApi();

  /* autosave */
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/mailing/draft", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doc) });
        setSaveState(res.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [doc]);

  /* keyboard undo/redo when not typing */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const setField = <K extends keyof NewsletterContent>(k: K, v: NewsletterContent[K]) => update((d) => ({ ...d, [k]: v }));
  const patchBlock = (id: string, patch: Partial<EmailBlock>) =>
    update((d) => ({ ...d, blocks: d.blocks.map((x) => (x.id === id ? ({ ...x, ...patch } as EmailBlock) : x)) }));
  const addBlock = (type: BlockType) => {
    if (doc.blocks.length >= L.blocks) return;
    const nb = createBlock(type);
    update((d) => {
      const i = d.blocks.findIndex((x) => x.id === selected);
      const blocks = [...d.blocks];
      blocks.splice(i < 0 ? blocks.length : i + 1, 0, nb);
      return { ...d, blocks };
    }, false);
    setSelected(nb.id);
    setTab("content");
  };
  const moveBlock = (from: number, to: number) =>
    update((d) => {
      if (to < 0 || to >= d.blocks.length || from === to) return d;
      const blocks = [...d.blocks];
      const [m] = blocks.splice(from, 1);
      blocks.splice(to, 0, m);
      return { ...d, blocks };
    }, false);
  const duplicate = (i: number) => {
    const copy = { ...structuredClone(doc.blocks[i]), id: newBlockId() };
    update((d) => {
      const blocks = [...d.blocks];
      blocks.splice(i + 1, 0, copy);
      return { ...d, blocks };
    }, false);
    setSelected(copy.id);
  };
  const remove = (id: string) => update((d) => ({ ...d, blocks: d.blocks.filter((x) => x.id !== id) }), false);

  /* Quick Drop: answers → whole email, live, until blocks are edited by hand */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(QUICK_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off restore of this browser's Quick Drop answers
      if (saved) setQuick(sanitizeQuickDrop(JSON.parse(saved)));
    } catch {
      /* storage unavailable */
    }
  }, []);
  const linked = lastQuick.current !== null && lastQuick.current.blocks === doc.blocks && lastQuick.current.theme === doc.theme;
  const applyQuick = (q: QuickDrop) => {
    const next = buildQuickDrop(q);
    update((d) => {
      const built = customSubject.current ? { ...next, subject: d.subject, preheader: d.preheader } : next;
      lastQuick.current = built;
      return built;
    });
  };
  const changeQuick = (patch: Partial<QuickDrop>) => {
    const q = { ...quick, ...patch };
    setQuick(q);
    try {
      localStorage.setItem(QUICK_KEY, JSON.stringify(q));
    } catch {
      /* storage unavailable */
    }
    if (linked) applyQuick(q);
  };

  /* In-place editing and photo drops inside the preview */
  const patchPath = (id: string, path: string, value: string) =>
    update((d) => ({ ...d, blocks: d.blocks.map((x) => (x.id === id ? setPath(x, path, value) : x)) }), false);
  const patchRef = useRef(patchPath);
  const uploadRef = useRef<(f: File) => Promise<string | null>>(async () => null);
  useEffect(() => {
    patchRef.current = patchPath;
    uploadRef.current = uploadImage;
  });

  /* preview */
  const html = useMemo(
    () => renderNewsletter(doc, { siteUrl, unsubscribeUrl: "#unsubscribe", issueNumber, date: new Date(), name: previewName, waitlist, preview: {} }).html,
    [doc, siteUrl, issueNumber, previewName, waitlist],
  );
  const frame = useRef<HTMLIFrameElement>(null);
  const scrollY = useRef(0);
  const selectRef = useRef(setSelected);
  useEffect(() => {
    selectRef.current = (id) => {
      setSelected(id);
      setTab("content");
    };
  });
  const markSelected = useCallback((id: string | null) => {
    const d = frame.current?.contentDocument;
    if (!d) return;
    d.querySelectorAll("[data-bid].is-sel").forEach((el) => el.classList.remove("is-sel"));
    if (id) d.querySelector(`[data-bid="${CSS.escape(id)}"]`)?.classList.add("is-sel");
  }, []);
  const onFrameLoad = () => {
    const f = frame.current;
    const d = f?.contentDocument;
    if (!f || !d) return;
    f.contentWindow?.scrollTo(0, scrollY.current);
    d.addEventListener("scroll", () => (scrollY.current = f.contentWindow?.scrollY ?? 0));
    d.addEventListener("click", (e) => {
      e.preventDefault();
      const el = (e.target as HTMLElement).closest("[data-bid]");
      if (el) selectRef.current(el.getAttribute("data-bid"));
    });
    // Type straight onto the email: single-line text commits on Enter or when you click away.
    d.querySelectorAll<HTMLElement>("[data-f]").forEach((el) => {
      el.contentEditable = "plaintext-only";
      if (el.contentEditable !== "plaintext-only") el.contentEditable = "true";
      el.spellcheck = true;
      const before = el.textContent ?? "";
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          el.blur();
        }
        if (e.key === "Escape") {
          el.textContent = before;
          el.blur();
        }
      });
      el.addEventListener("blur", () => {
        const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
        const bid = el.closest("[data-bid]")?.getAttribute("data-bid");
        if (bid && text !== before) patchRef.current(bid, el.dataset.f!, text);
      });
    });
    // Drop a photo onto any picture to replace it.
    d.addEventListener("dragover", (e) => {
      const im = (e.target as HTMLElement).closest?.("img[data-img]");
      d.querySelectorAll(".is-drop").forEach((x) => x !== im && x.classList.remove("is-drop"));
      if (im && e.dataTransfer?.types.includes("Files")) {
        e.preventDefault();
        im.classList.add("is-drop");
      }
    });
    d.addEventListener("drop", async (e) => {
      const im = (e.target as HTMLElement).closest?.("img[data-img]") as HTMLElement | null;
      const file = e.dataTransfer?.files?.[0];
      if (!im || !file) return;
      e.preventDefault();
      const bid = im.closest("[data-bid]")?.getAttribute("data-bid");
      const field = im.getAttribute("data-img");
      const url = await uploadRef.current(file);
      if (url && bid && field) patchRef.current(bid, field, url);
    });
    markSelected(selected);
  };
  useEffect(() => markSelected(selected), [selected, markSelected]);
  useEffect(() => {
    if (selected) document.getElementById(`eb-layer-${selected}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  /* scale the desktop preview to fit */
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / (width === "desktop" ? 680 : 390))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  const frameW = width === "desktop" ? 680 : 390;

  async function uploadImage(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch("/api/admin/mailing/images", { method: "POST", body: fd });
    const data = (await res.json().catch(() => ({}))) as { id?: string; url?: string; error?: string };
    if (!res.ok || !data.url || !data.id) {
      window.alert(data.error ?? "Upload failed.");
      return null;
    }
    setImages((list) => [{ id: data.id!, name: file.name, url: data.url! }, ...list]);
    return data.url;
  }

  async function sendAll() {
    if (!window.confirm(`Send “${doc.subject || "(no subject)"}” to ${subscribers} ${subscribers === 1 ? "person" : "people"}? This can't be undone.`)) return;
    const r = await send.call<{ sent: number; failed: number; issue: number; error?: string }>("POST", "/api/admin/mailing/send", { confirm: true, content: doc });
    if (r && r.failed) send.setError(`Issue #${r.issue}: sent to ${r.sent}, but ${r.failed} failed. ${r.error ?? ""}`);
    else if (r) send.setMessage(`Issue #${r.issue} sent to ${r.sent} ${r.sent === 1 ? "person" : "people"}! 🎉`);
  }

  const busy = test.busy || send.busy;
  const imageCtx: ImageCtx = { images, upload: uploadImage };

  return (
    <div className="eb">
      {/* Top bar */}
      <div className="eb__top a-card">
        <div className="eb__inbox">
          <label className="a-field">
            <span>Subject line</span>
            <input value={doc.subject} maxLength={L.subject} onChange={(e) => { customSubject.current = true; setField("subject", e.target.value); }} placeholder="Your calculator is about to get a lot more fun 🎮" />
          </label>
          <label className="a-field">
            <span>Preview text</span>
            <input value={doc.preheader} maxLength={L.preheader} onChange={(e) => setField("preheader", e.target.value)} placeholder="The grey line after the subject" />
          </label>
        </div>
        <div className="eb__actions">
          <div className="a-inline">
            <button type="button" className="a-btn a-btn--sm a-btn--ghost" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">↶ Undo</button>
            <button type="button" className="a-btn a-btn--sm a-btn--ghost" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">↷ Redo</button>
            <span className={`eb__save eb__save--${saveState}`}>
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "✓ Draft saved" : saveState === "error" ? "Couldn't save" : "Autosaves as you go"}
            </span>
          </div>
          <div className="a-inline a-wrap">
            <button type="button" className="a-btn" disabled={busy || !emailReady} onClick={() => test.call("POST", "/api/admin/mailing/test", doc, { success: `Test sent to ${testTo}. Check your inbox!`, refresh: false })}>
              Send a test to me
            </button>
            <button type="button" className="a-btn a-btn--primary" disabled={busy || !bulkReady || subscribers === 0} onClick={sendAll}>
              {send.busy ? "Sending…" : `Send to ${subscribers} ${subscribers === 1 ? "subscriber" : "subscribers"}`}
            </button>
          </div>
        </div>
        <Feedback error={test.error} message={test.message} />
        <Feedback error={send.error} message={send.message} />
        {!emailReady ? (
          <p className="a-note small">
            <strong>Email isn&apos;t set up yet.</strong> Add <code>RESEND_API_KEY</code> in Vercel to send tests. You can still design and preview.
          </p>
        ) : !bulkReady ? (
          <p className="a-note small">
            <strong>Tests work, but sending to subscribers needs your own domain.</strong> Verify it in Resend, then set <code>EMAIL_FROM</code> (e.g.{" "}
            <code>Hackulator &lt;drop@dailyos.uk&gt;</code>) in Vercel and redeploy.
          </p>
        ) : null}
      </div>

      <div className="eb__body">
        {/* Left: panels */}
        <div className="eb__panel a-card">
          <div className="eb__tabs" role="tablist">
            {(
              [
                ["quick", "⚡ Quick"],
                ["content", `Blocks (${doc.blocks.length})`],
                ["add", "+ Add"],
                ["theme", "Theme"],
                ["templates", "Templates"],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>

          {tab === "quick" && (
            <QuickPanel
              q={quick}
              linked={linked}
              onChange={changeQuick}
              onBuild={() => {
                if (doc.blocks.length && !linked && !window.confirm("Build the email from these answers? It replaces the current blocks (Undo brings them back).")) return;
                applyQuick(quick);
              }}
              onFineTune={() => setTab("content")}
              imageCtx={imageCtx}
            />
          )}

          {tab === "content" && (
            <Layers
              blocks={doc.blocks}
              selected={selected}
              onSelect={setSelected}
              onMove={moveBlock}
              onDuplicate={duplicate}
              onRemove={remove}
              onAdd={() => setTab("add")}
              renderEditor={(block) => <BlockForm block={block} onChange={(patch) => patchBlock(block.id, patch)} imageCtx={imageCtx} />}
            />
          )}

          {tab === "add" && (
            <div className="eb__lib">
              <p className="a-muted small">Click a block to add it {selected ? "below the selected one" : "at the end"}.</p>
              <div className="eb__lib-grid">
                {BLOCK_LIBRARY.map((item) => (
                  <button key={item.type} type="button" className="eb__lib-item" onClick={() => addBlock(item.type)}>
                    <span className="eb__lib-icon" aria-hidden="true">{item.icon}</span>
                    <strong>{item.label}</strong>
                    <span>{item.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "theme" && (
            <div className="eb__themes">
              {(Object.keys(THEMES) as ThemeId[]).map((id) => {
                const t = THEMES[id];
                return (
                  <button key={id} type="button" className="eb__theme" aria-pressed={doc.theme === id} onClick={() => setField("theme", id)} style={{ background: t.bg, color: t.heading, borderColor: doc.theme === id ? t.accent : t.line }}>
                    <span className="eb__theme-swatch">
                      <i style={{ background: t.accent }} />
                      <i style={{ background: t.surface, borderColor: t.line }} />
                      <i style={{ background: t.text }} />
                    </span>
                    <strong>{t.name}</strong>
                    <span className="eb__theme-btn" style={{ background: t.accent, color: t.accentInk }}>Button →</span>
                  </button>
                );
              })}
            </div>
          )}

          {tab === "templates" && (
            <div className="eb__templates">
              <p className="a-muted small">Start from a designed email, then make it yours. (Replaces what&apos;s in the editor; Undo brings it back.)</p>
              {NEWSLETTER_PRESETS.map((pr) => {
                const t = THEMES[pr.build().theme];
                return (
                  <button
                    key={pr.id}
                    type="button"
                    className="eb__tpl"
                    style={{ background: t.bg, color: t.heading, borderColor: t.line }}
                    onClick={() => {
                      const next = pr.build();
                      update(() => next, false);
                      setSelected(next.blocks[0]?.id ?? null);
                      setTab("content");
                    }}
                  >
                    <span className="eb__tpl-emoji" aria-hidden="true">{pr.emoji}</span>
                    <strong>{pr.label}</strong>
                    <span style={{ color: t.accent }}>{t.name} theme · {pr.build().blocks.length} blocks</span>
                  </button>
                );
              })}
              {past.length > 0 && (
                <>
                  <h3 className="eb__h">Past issues</h3>
                  <ul className="a-list">
                    {past.map((pi) => (
                      <li key={pi.id} className="eb__past">
                        <span>
                          <strong>{pi.subject}</strong>
                          <br />
                          <span className="a-muted small">
                            {pi.sentAt} · {pi.recipients} sent{pi.failed ? ` · ${pi.failed} failed` : ""}
                          </span>
                        </span>
                        <button type="button" className="a-btn a-btn--sm" onClick={() => { update(() => pi.content, false); setTab("content"); }}>
                          Reuse
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: preview */}
        <div className="eb__preview">
          <div className="a-inline a-wrap eb__bar">
            <strong>Live preview</strong>
            <span className="a-muted small">Type on headlines to edit them · click a block for more · drop a photo on a picture</span>
            <div className="a-seg" role="group" aria-label="Preview width">
              <button type="button" aria-pressed={width === "desktop"} onClick={() => setWidth("desktop")}>🖥 Desktop</button>
              <button type="button" aria-pressed={width === "phone"} onClick={() => setWidth("phone")}>📱 Phone</button>
            </div>
            <label className="a-mail__as">
              as <input value={previewName} onChange={(e) => setPreviewName(e.target.value)} maxLength={30} aria-label="Preview first name" />
            </label>
          </div>
          <div className="a-mail__inbox">
            <div className="a-mail__inbox-from">Hackulator</div>
            <div className="a-mail__inbox-subject">{doc.subject.replace(/\{name\}/g, previewName || "there") || "(no subject)"}</div>
            <div className="a-mail__inbox-pre">{doc.preheader.replace(/\{name\}/g, previewName || "there")}</div>
          </div>
          <div className="eb__stage" ref={stage}>
            <div className="eb__frame-wrap" style={{ width: frameW * scale }}>
              <iframe
                ref={frame}
                title="Email preview"
                className="eb__frame"
                srcDoc={html}
                onLoad={onFrameLoad}
                sandbox="allow-same-origin"
                style={{ width: frameW, transform: `scale(${scale})`, ["--eb-scale" as string]: scale }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ layers */

const LABEL = Object.fromEntries(BLOCK_LIBRARY.map((b) => [b.type, b])) as Record<BlockType, (typeof BLOCK_LIBRARY)[number]>;

function summary(b: EmailBlock): string {
  switch (b.type) {
    case "hero": return [b.headline, b.accentLine].filter(Boolean).join(" ");
    case "image": return b.caption || imageName(b.imageUrl);
    case "text": return b.heading || b.body.slice(0, 40);
    case "button": return b.label;
    case "stats": return b.items.map((i) => i.value).join(" · ");
    case "waitlist": return "Live spots left";
    case "feature": return b.title;
    case "grid": return b.items.map((i) => i.title).filter(Boolean).join(" · ");
    case "banner": return b.text;
    case "quote": return b.quote.slice(0, 40);
    case "cta": return b.headline;
    case "divider": return b.style;
  }
}

function imageName(url: string) {
  return EMAIL_IMAGES.find((i) => i.url === url)?.label ?? (url ? "Your picture" : "No picture");
}

function Layers({
  blocks,
  selected,
  onSelect,
  onMove,
  onDuplicate,
  onRemove,
  onAdd,
  renderEditor,
}: {
  blocks: EmailBlock[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onMove: (from: number, to: number) => void;
  onDuplicate: (i: number) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  renderEditor: (b: EmailBlock) => ReactNode;
}) {
  const dragFrom = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  if (!blocks.length) {
    return (
      <div className="eb__empty">
        <p>This email is empty.</p>
        <button type="button" className="a-btn a-btn--primary" onClick={onAdd}>+ Add your first block</button>
      </div>
    );
  }
  return (
    <ol className="eb__layers">
      {blocks.map((b, i) => {
        const open = b.id === selected;
        const lib = LABEL[b.type];
        return (
          <li
            key={b.id}
            id={`eb-layer-${b.id}`}
            className={`eb__layer${open ? " is-open" : ""}${over === i ? " is-over" : ""}`}
            onDragOver={(e) => {
              if (dragFrom.current == null) return;
              e.preventDefault();
              setOver(i);
            }}
            onDragLeave={() => setOver((o) => (o === i ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragFrom.current != null) onMove(dragFrom.current, i);
              dragFrom.current = null;
              setOver(null);
            }}
          >
            <div className="eb__layer-head">
              <span
                className="eb__grip"
                draggable
                onDragStart={(e) => {
                  dragFrom.current = i;
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => {
                  dragFrom.current = null;
                  setOver(null);
                }}
                title="Drag to move"
                aria-hidden="true"
              >
                ⠿
              </span>
              <button type="button" className="eb__layer-title" onClick={() => onSelect(open ? null : b.id)} aria-expanded={open}>
                <span aria-hidden="true">{lib.icon}</span>
                <strong>{lib.label}</strong>
                <span className="eb__layer-sum">{summary(b)}</span>
              </button>
              <span className="eb__layer-tools">
                <button type="button" onClick={() => onMove(i, i - 1)} disabled={i === 0} aria-label={`Move ${lib.label} up`} title="Move up">↑</button>
                <button type="button" onClick={() => onMove(i, i + 1)} disabled={i === blocks.length - 1} aria-label={`Move ${lib.label} down`} title="Move down">↓</button>
                <button type="button" onClick={() => onDuplicate(i)} aria-label={`Duplicate ${lib.label}`} title="Duplicate">⧉</button>
                <button type="button" onClick={() => onRemove(b.id)} aria-label={`Delete ${lib.label}`} title="Delete" className="is-danger">✕</button>
              </span>
            </div>
            {open && <div className="eb__layer-body">{renderEditor(b)}</div>}
          </li>
        );
      })}
      <li className="eb__add-row">
        <button type="button" className="a-btn a-btn--sm" onClick={onAdd}>+ Add block</button>
      </li>
    </ol>
  );
}

/* -------------------------------------------------------------- block forms */

interface ImageCtx {
  images: UploadedImage[];
  upload: (f: File) => Promise<string | null>;
}

function Text({ label, value, onChange, max = L.title, placeholder }: { label: string; value: string; onChange: (v: string) => void; max?: number; placeholder?: string }) {
  return (
    <label className="a-field">
      <span>{label}</span>
      <input value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
function Area({ label, value, onChange, rows = 3, max = L.body }: { label: string; value: string; onChange: (v: string) => void; rows?: number; max?: number }) {
  return (
    <label className="a-field">
      <span>{label}</span>
      <textarea rows={rows} value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
function Seg<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="a-field">
      <span>{label}</span>
      <div className="a-seg" role="group" aria-label={label}>
        {options.map(([v, l]) => (
          <button key={String(v)} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>
        ))}
      </div>
    </div>
  );
}
function Link2({ label, url, onLabel, onUrl }: { label: string; url: string; onLabel: (v: string) => void; onUrl: (v: string) => void }) {
  return (
    <div className="a-grid2">
      <Text label="Button text" value={label} onChange={onLabel} max={L.label} placeholder="Leave empty for no button" />
      <Text label="Button link" value={url} onChange={onUrl} max={L.url} placeholder="/#waitlist or https://…" />
    </div>
  );
}

const QUICK_LINKS: [string, string][] = [
  ["/#waitlist", "Waitlist"],
  ["/#build", "Build Yours"],
  ["/#games", "Game demo"],
  ["/#film", "Concept film"],
  ["/my-spot", "Check my spot"],
  ["/", "Homepage"],
];

function ImageField({ label, value, onChange, ctx, defaultOpen = false }: { label: string; value: string; onChange: (v: string) => void; ctx: ImageCtx; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const all = [...EMAIL_IMAGES.map((i) => ({ url: i.url as string, name: i.label as string })), ...ctx.images.map((i) => ({ url: i.url, name: i.name || "Uploaded" }))];
  return (
    <div className="a-field">
      <span>{label}</span>
      <div className="eb__img">
        <button type="button" className="eb__img-current" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of an email picture */}
          {value ? <img src={value} alt="" /> : <span className="eb__img-none">No picture</span>}
          <span>{open ? "Close" : "Change picture"}</span>
        </button>
        {open && (
          <div className="eb__gallery">
            <button type="button" className={`eb__thumb eb__thumb--none${!value ? " is-on" : ""}`} onClick={() => { onChange(""); setOpen(false); }}>None</button>
            {all.map((im) => (
              <button key={im.url} type="button" className={`eb__thumb${value === im.url ? " is-on" : ""}`} title={im.name} onClick={() => { onChange(im.url); setOpen(false); }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of an email picture */}
                <img src={im.url} alt={im.name} />
              </button>
            ))}
            <button type="button" className="eb__thumb eb__thumb--up" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? "Uploading…" : "⬆ Upload"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                setBusy(true);
                const url = await ctx.upload(f);
                setBusy(false);
                if (url) {
                  onChange(url);
                  setOpen(false);
                }
              }}
            />
            <input className="eb__img-link" placeholder="…or paste an image link (https://)" defaultValue={value.startsWith("http") ? value : ""} onBlur={(e) => e.target.value.trim() && onChange(e.target.value.trim())} />
            <small className="a-muted">Uploads are public (mail apps load them). JPEG, PNG or GIF up to 3 MB.</small>
          </div>
        )}
      </div>
    </div>
  );
}

function BlockForm({ block, onChange, imageCtx }: { block: EmailBlock; onChange: (patch: Partial<EmailBlock>) => void; imageCtx: ImageCtx }) {
  const quick = (set: (v: string) => void) => (
    <div className="eb__quick">
      {QUICK_LINKS.map(([u, l]) => (
        <button key={u} type="button" onClick={() => set(u)}>{l}</button>
      ))}
    </div>
  );
  const tip = <small className="a-muted">**bold**, [link](https://…), “- ” bullets, {"{name}"} = first name</small>;
  switch (block.type) {
    case "hero":
      return (
        <div className="eb__form">
          <Text label="Little pill" value={block.eyebrow} max={L.short} onChange={(v) => onChange({ eyebrow: v })} />
          <div className="a-grid2">
            <Text label="Headline" value={block.headline} onChange={(v) => onChange({ headline: v })} />
            <Text label="Second line (accent colour)" value={block.accentLine} onChange={(v) => onChange({ accentLine: v })} />
          </div>
          <Area label="Text" value={block.text} onChange={(v) => onChange({ text: v })} />
          {tip}
          <Link2 label={block.buttonLabel} url={block.buttonUrl} onLabel={(v) => onChange({ buttonLabel: v })} onUrl={(v) => onChange({ buttonUrl: v })} />
          {quick((v) => onChange({ buttonUrl: v }))}
          <ImageField label="Picture" value={block.imageUrl} onChange={(v) => onChange({ imageUrl: v })} ctx={imageCtx} />
          <Seg label="Align" value={block.align} options={[["center", "Centre"], ["left", "Left"]]} onChange={(v) => onChange({ align: v })} />
        </div>
      );
    case "image":
      return (
        <div className="eb__form">
          <ImageField label="Picture" value={block.imageUrl} onChange={(v) => onChange({ imageUrl: v })} ctx={imageCtx} />
          <Seg label="Size" value={block.width} options={[["inset", "With margins"], ["full", "Edge to edge"]]} onChange={(v) => onChange({ width: v })} />
          <Text label="Caption (optional)" value={block.caption} onChange={(v) => onChange({ caption: v })} />
          <Text label="Link when tapped (optional)" value={block.linkUrl} max={L.url} onChange={(v) => onChange({ linkUrl: v })} />
          {quick((v) => onChange({ linkUrl: v }))}
        </div>
      );
    case "text":
      return (
        <div className="eb__form">
          <Text label="Heading" value={block.heading} onChange={(v) => onChange({ heading: v })} />
          <Area label="Text" rows={5} value={block.body} onChange={(v) => onChange({ body: v })} />
          {tip}
          <div className="a-grid2">
            <Seg label="Align" value={block.align} options={[["left", "Left"], ["center", "Centre"]]} onChange={(v) => onChange({ align: v })} />
            <Seg label="Style" value={block.boxed ? "box" : "plain"} options={[["plain", "Plain"], ["box", "In a card"]]} onChange={(v) => onChange({ boxed: v === "box" })} />
          </div>
        </div>
      );
    case "button":
      return (
        <div className="eb__form">
          <Text label="Button text" value={block.label} max={L.label} onChange={(v) => onChange({ label: v })} />
          <Text label="Link" value={block.url} max={L.url} onChange={(v) => onChange({ url: v })} />
          {quick((v) => onChange({ url: v }))}
          <Seg label="Style" value={block.style} options={[["solid", "Solid"], ["outline", "Outline"]]} onChange={(v) => onChange({ style: v })} />
        </div>
      );
    case "stats":
      return (
        <div className="eb__form">
          {block.items.map((it, i) => (
            <div key={i} className="a-inline a-mail__hl">
              <input aria-label={`Number ${i + 1}`} value={it.value} maxLength={12} placeholder="3" onChange={(e) => onChange({ items: block.items.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} />
              <input aria-label={`Label ${i + 1}`} value={it.label} maxLength={30} placeholder="games included" onChange={(e) => onChange({ items: block.items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
              <button type="button" className="a-btn a-btn--sm a-btn--ghost" aria-label={`Remove number ${i + 1}`} onClick={() => onChange({ items: block.items.filter((_, j) => j !== i) })}>✕</button>
            </div>
          ))}
          {block.items.length < L.stats && (
            <button type="button" className="a-btn a-btn--sm" onClick={() => onChange({ items: [...block.items, { value: "", label: "" }] })}>+ Add number</button>
          )}
        </div>
      );
    case "waitlist":
      return (
        <div className="eb__form">
          <p className="a-muted small">Shows the live number of spots left when you send, with a &ldquo;Reserve free&rdquo; button.</p>
          <Seg label="Style" value={block.style} options={[["accent", "Bright"], ["surface", "Subtle"]]} onChange={(v) => onChange({ style: v })} />
        </div>
      );
    case "feature":
      return (
        <div className="eb__form">
          <div className="a-grid2">
            <Text label="Small label (e.g. 01)" value={block.eyebrow} max={L.short} onChange={(v) => onChange({ eyebrow: v })} />
            <Text label="Title" value={block.title} onChange={(v) => onChange({ title: v })} />
          </div>
          <Area label="Text" value={block.body} onChange={(v) => onChange({ body: v })} />
          {tip}
          <ImageField label="Picture" value={block.imageUrl} onChange={(v) => onChange({ imageUrl: v })} ctx={imageCtx} />
          <Seg label="Picture side" value={block.imageSide} options={[["left", "Left"], ["right", "Right"]]} onChange={(v) => onChange({ imageSide: v })} />
          <Link2 label={block.buttonLabel} url={block.buttonUrl} onLabel={(v) => onChange({ buttonLabel: v })} onUrl={(v) => onChange({ buttonUrl: v })} />
        </div>
      );
    case "grid":
      return (
        <div className="eb__form">
          <Seg label="Columns" value={block.columns} options={[[2, "2"], [3, "3"]]} onChange={(v) => onChange({ columns: v })} />
          {block.items.map((it, i) => {
            const set = (patch: Partial<typeof it>) => onChange({ items: block.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <div key={i} className="eb__card-edit">
                <div className="a-inline a-wrap">
                  <strong>Card {i + 1}</strong>
                  <button type="button" className="a-btn a-btn--sm a-btn--ghost" onClick={() => onChange({ items: block.items.filter((_, j) => j !== i) })}>Remove</button>
                </div>
                <ImageField label="Picture" value={it.imageUrl} onChange={(v) => set({ imageUrl: v })} ctx={imageCtx} />
                <Text label="Title" value={it.title} onChange={(v) => set({ title: v })} />
                <Area label="Text" rows={2} max={600} value={it.body} onChange={(v) => set({ body: v })} />
                <Text label="Link (optional)" value={it.linkUrl} max={L.url} onChange={(v) => set({ linkUrl: v })} />
              </div>
            );
          })}
          {block.items.length < L.grid && (
            <button type="button" className="a-btn a-btn--sm" onClick={() => onChange({ items: [...block.items, { imageUrl: "", title: "", body: "", linkUrl: "" }] })}>+ Add card</button>
          )}
        </div>
      );
    case "banner":
      return (
        <div className="eb__form">
          <Text label="Small text above" value={block.kicker} max={L.short} onChange={(v) => onChange({ kicker: v })} />
          <Text label="BIG text" value={block.text} onChange={(v) => onChange({ text: v })} />
          <Seg label="Style" value={block.style} options={[["accent", "Bright"], ["surface", "Card"], ["outline", "Outline"]]} onChange={(v) => onChange({ style: v })} />
        </div>
      );
    case "quote":
      return (
        <div className="eb__form">
          <Area label="Quote" value={block.quote} max={600} onChange={(v) => onChange({ quote: v })} />
          <Text label="Who said it" value={block.who} max={L.short} onChange={(v) => onChange({ who: v })} />
          <small className="a-muted">Only quote real people with their permission.</small>
        </div>
      );
    case "cta":
      return (
        <div className="eb__form">
          <Text label="Headline" value={block.headline} onChange={(v) => onChange({ headline: v })} />
          <Area label="Text" rows={2} value={block.text} onChange={(v) => onChange({ text: v })} />
          <Link2 label={block.buttonLabel} url={block.buttonUrl} onLabel={(v) => onChange({ buttonLabel: v })} onUrl={(v) => onChange({ buttonUrl: v })} />
          {quick((v) => onChange({ buttonUrl: v }))}
        </div>
      );
    case "divider":
      return (
        <div className="eb__form">
          <Seg label="Style" value={block.style} options={[["line", "Line"], ["dots", "• • •"], ["space", "Just space"]]} onChange={(v) => onChange({ style: v })} />
        </div>
      );
  }
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

/* --------------------------------------------------------------- quick drop */

function QuickPanel({
  q,
  linked,
  onChange,
  onBuild,
  onFineTune,
  imageCtx,
}: {
  q: QuickDrop;
  linked: boolean;
  onChange: (patch: Partial<QuickDrop>) => void;
  onBuild: () => void;
  onFineTune: () => void;
  imageCtx: ImageCtx;
}) {
  const setItem = (i: number, patch: Partial<QuickDrop["items"][number]>) => onChange({ items: q.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  return (
    <div className="eb__quickdrop">
      <p className="eb__qd-lead">
        <strong>Answer a few things and your email designs itself.</strong> {linked ? "The preview updates as you type." : ""}
      </p>

      <div className="a-field">
        <span>1. Pick a vibe</span>
        <div className="eb__qd-themes">
          {(Object.keys(THEMES) as ThemeId[]).map((id) => (
            <button key={id} type="button" title={THEMES[id].name} aria-label={THEMES[id].name} aria-pressed={q.theme === id} onClick={() => onChange({ theme: id })} style={{ background: THEMES[id].bg, borderColor: q.theme === id ? THEMES[id].accent : "transparent" }}>
              <i style={{ background: THEMES[id].accent }} />
            </button>
          ))}
          <span className="a-muted small">{THEMES[q.theme].name}</span>
        </div>
        <div className="eb__qd-styles">
          {QUICK_STYLES.map((st) => (
            <button key={st.id} type="button" aria-pressed={q.style === st.id} onClick={() => onChange({ style: st.id })}>
              <span aria-hidden="true">{st.emoji}</span>
              <strong>{st.label}</strong>
              <small>{st.hint}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="a-field">
        <span>2. Headline</span>
        <div className="a-grid2">
          <input value={q.headline} maxLength={80} placeholder="This week on the bench." onChange={(e) => onChange({ headline: e.target.value })} aria-label="Headline" />
          <input value={q.accentLine} maxLength={80} placeholder="Second line (optional, in colour)" onChange={(e) => onChange({ accentLine: e.target.value })} aria-label="Second line" />
        </div>
        <textarea rows={2} value={q.intro} maxLength={600} placeholder="A sentence to start. {name} = their first name." onChange={(e) => onChange({ intro: e.target.value })} aria-label="Intro" />
      </div>

      <div className="a-field">
        <span>3. What&apos;s new? <em>(up to 4)</em></span>
        {q.items.map((it, i) => (
          <div key={i} className="eb__qd-item">
            <div className="eb__qd-item-text">
              <input value={it.title} maxLength={100} placeholder={["Built the new screen", "Snake got faster", "Prototype 2 on the bench", "Sneak peek"][i]} onChange={(e) => setItem(i, { title: e.target.value })} aria-label={`News ${i + 1} title`} />
              <textarea rows={2} value={it.text} maxLength={600} placeholder="A line or two about it. **bold** works." onChange={(e) => setItem(i, { text: e.target.value })} aria-label={`News ${i + 1} text`} />
            </div>
            <QuickPhoto value={it.imageUrl} onChange={(v) => setItem(i, { imageUrl: v })} ctx={imageCtx} />
            {q.items.length > 1 && (
              <button type="button" className="eb__qd-x" aria-label={`Remove news ${i + 1}`} onClick={() => onChange({ items: q.items.filter((_, j) => j !== i) })}>✕</button>
            )}
          </div>
        ))}
        {q.items.length < 4 && (
          <button type="button" className="a-btn a-btn--sm" onClick={() => onChange({ items: [...q.items, { title: "", text: "", imageUrl: "" }] })}>+ Add another</button>
        )}
      </div>

      <div className="a-field">
        <span>4. Extras</span>
        <label className="a-check"><input type="checkbox" checked={q.showSpots} onChange={(e) => onChange({ showSpots: e.target.checked })} /> 🔥 Live &ldquo;spots left&rdquo; counter</label>
        <label className="a-check"><input type="checkbox" checked={q.showNumbers} onChange={(e) => onChange({ showNumbers: e.target.checked })} /> 🔢 Big numbers (3 games · 8 colours · 8 icons · £5 UI)</label>
        <div className="eb__quick">
          {QUICK_CTAS.map((c) => (
            <button key={c.id} type="button" aria-pressed={q.cta === c.id} onClick={() => onChange({ cta: c.id })}>{c.label}</button>
          ))}
        </div>
      </div>

      <div className="eb__qd-go">
        {linked ? (
          <>
            <span className="eb__qd-live">● Live: changes show in the preview</span>
            <button type="button" className="a-btn a-btn--sm" onClick={onFineTune}>Fine-tune blocks →</button>
          </>
        ) : (
          <button type="button" className="a-btn a-btn--primary" onClick={onBuild}>✨ Build my email</button>
        )}
      </div>
      {!linked && <small className="a-muted">Already edited the blocks by hand? Building again replaces them (Undo brings them back).</small>}
    </div>
  );
}

function QuickPhoto({ value, onChange, ctx }: { value: string; onChange: (v: string) => void; ctx: ImageCtx }) {
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  return (
    <div className="eb__qd-photo">
      <button
        type="button"
        className={`eb__qd-photo-btn${over ? " is-over" : ""}`}
        onClick={() => setOpen((o) => !o)}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) {
            const url = await ctx.upload(f);
            if (url) onChange(url);
          }
        }}
        title="Click to choose, or drop a photo"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of an email picture */}
        {value ? <img src={value} alt="" /> : <span>📷<br />Photo</span>}
      </button>
      {open && (
        <div className="eb__qd-pop">
          <ImageField label="Picture" value={value} onChange={(v) => { onChange(v); setOpen(false); }} ctx={ctx} defaultOpen />
        </div>
      )}
    </div>
  );
}
