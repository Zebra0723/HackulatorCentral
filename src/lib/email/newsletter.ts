/**
 * The weekly Hackulator email. Pure functions shared by the control room's live
 * preview and the server that sends it, so what you preview is what people get.
 *
 * Email HTML is old-fashioned on purpose: tables, inline styles and bgcolor
 * attributes are what Gmail, Outlook and Apple Mail all render the same way.
 */

export interface NewsletterSection {
  title: string;
  body: string;
}

export interface NewsletterContent {
  subject: string;
  /** Grey preview text shown after the subject in most inboxes. */
  preheader: string;
  headline: string;
  intro: string;
  /** Optional full-width picture (an https:// image URL). */
  imageUrl: string;
  sections: NewsletterSection[];
  ctaLabel: string;
  ctaUrl: string;
  /** Show the live "X of N spots left" block. */
  showWaitlist: boolean;
}

export const EMPTY_NEWSLETTER: NewsletterContent = {
  subject: "",
  preheader: "",
  headline: "",
  intro: "",
  imageUrl: "",
  sections: [],
  ctaLabel: "",
  ctaUrl: "",
  showWaitlist: true,
};

export const STARTER_NEWSLETTER: NewsletterContent = {
  subject: "This week on the bench 🔧",
  preheader: "What changed on the Hackulator this week, and how many spots are left.",
  headline: "This week on the bench",
  intro: "Hi {name}! Here's what happened with the Hackulator this week.",
  imageUrl: "",
  sections: [
    { title: "What I built", body: "Write about the biggest thing you worked on. **Bold** bits and [links](https://example.com) work." },
    { title: "What's next", body: "- One thing you're doing next\n- Another thing\n- A sneak peek" },
  ],
  ctaLabel: "Build your Hackulator",
  ctaUrl: "/#build",
  showWaitlist: true,
};

export const NEWSLETTER_LIMITS = {
  subject: 120,
  preheader: 160,
  headline: 120,
  intro: 2000,
  imageUrl: 500,
  sectionTitle: 100,
  sectionBody: 4000,
  sections: 6,
  ctaLabel: 40,
  ctaUrl: 500,
} as const;

export interface RenderContext {
  /** Absolute site URL without a trailing slash, e.g. https://hackulator.example. */
  siteUrl: string;
  unsubscribeUrl: string;
  issueNumber: number;
  date: Date;
  /** The reader's first name, if we have it. Replaces {name}. */
  name?: string;
  waitlist?: { spots: number; left: number; open: boolean };
}

const C = {
  bg: "#0d0d0c",
  card: "#161615",
  line: "#2a2a27",
  text: "#e9e6df",
  muted: "#a3a19b",
  lime: "#b4e23c",
  limeInk: "#1c2600",
  dim: "#3a3a36",
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Make a link absolute; only http(s) and site-relative links are allowed. */
export function safeUrl(url: string, siteUrl: string): string | null {
  const u = url.trim();
  if (!u) return null;
  if (u.startsWith("/") && !u.startsWith("//")) return siteUrl + u;
  return /^https?:\/\/[^\s"'<>]+$/i.test(u) ? u : null;
}

function personalise(s: string, name?: string) {
  return s.replace(/\{name\}/g, name?.trim() || "there");
}

/** **bold**, [text](url), "- " bullet lines and blank-line paragraphs. Everything else is escaped. */
export function renderRichText(src: string, siteUrl: string, color = C.text): string {
  const inline = (line: string) =>
    escapeHtml(line)
      .replace(/\*\*(.+?)\*\*/g, `<strong style="color:#ffffff">$1</strong>`)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text: string, href: string) => {
        const url = safeUrl(href.replace(/&amp;/g, "&"), siteUrl);
        return url ? `<a href="${escapeHtml(url)}" style="color:${C.lime};text-decoration:underline">${text}</a>` : text;
      });
  const p = `margin:0 0 14px;font:16px/1.6 ${FONT};color:${color}`;
  return src
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.split("\n").filter((l) => l.trim()))
    .filter((lines) => lines.length)
    .map((lines) => {
      if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
        const items = lines
          .map((l) => `<li style="margin:0 0 6px">${inline(l.replace(/^\s*[-•]\s+/, ""))}</li>`)
          .join("");
        return `<ul style="margin:0 0 14px;padding-left:20px;font:16px/1.6 ${FONT};color:${color}">${items}</ul>`;
      }
      return `<p style="${p}">${lines.map(inline).join("<br>")}</p>`;
    })
    .join("");
}

function plainText(src: string) {
  return src.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)");
}

function spotsBlock(w: NonNullable<RenderContext["waitlist"]>, siteUrl: string) {
  const shown = Math.min(w.spots, 20);
  const taken = w.spots - w.left;
  const cells = Array.from({ length: shown }, (_, i) => {
    const isTaken = i < Math.round((taken / Math.max(1, w.spots)) * shown);
    return `<td width="${Math.floor(100 / shown)}%" style="padding:0 2px"><div style="height:22px;border-radius:5px;background:${isTaken ? C.lime : C.dim};font:700 11px/22px ${MONO};color:${isTaken ? C.limeInk : C.muted};text-align:center">${isTaken ? "✓" : i + 1}</div></td>`;
  }).join("");
  const headline = !w.open ? "The waitlist is closed right now" : w.left === 0 ? `All ${w.spots} spots are taken` : `${w.left} of ${w.spots} spots left`;
  return `
  <tr><td style="padding:0 32px 28px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-radius:16px" bgcolor="${C.bg}">
      <tr><td style="padding:20px 20px 8px;font:700 12px/1 ${MONO};letter-spacing:2px;color:${C.lime};text-transform:uppercase">🔥 Waitlist</td></tr>
      <tr><td style="padding:0 20px 14px;font:800 26px/1.2 ${FONT};color:#ffffff">${headline}</td></tr>
      <tr><td style="padding:0 18px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table></td></tr>
      ${w.open && w.left > 0 ? `<tr><td style="padding:0 20px 20px;font:15px/1.5 ${FONT};color:${C.muted}">Free to join, no obligation to buy. <a href="${escapeHtml(siteUrl)}/#waitlist" style="color:${C.lime}">Reserve a spot →</a></td></tr>` : ""}
    </table>
  </td></tr>`;
}

export function renderNewsletter(c: NewsletterContent, ctx: RenderContext): { subject: string; html: string; text: string } {
  const site = ctx.siteUrl.replace(/\/$/, "");
  const name = ctx.name;
  const subject = personalise(c.subject, name);
  const dateLabel = ctx.date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const image = safeUrl(c.imageUrl, site);
  const cta = c.ctaLabel.trim() ? safeUrl(c.ctaUrl, site) : null;
  const sections = c.sections.filter((s) => s.title.trim() || s.body.trim());

  const sectionHtml = sections
    .map(
      (s, i) => `
  <tr><td style="padding:0 32px 8px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line}">
      <tr><td style="padding:22px 0 8px;font:700 13px/1 ${MONO};letter-spacing:2px;color:${C.lime}">${String(i + 1).padStart(2, "0")}</td></tr>
      ${s.title.trim() ? `<tr><td style="padding:0 0 12px;font:800 22px/1.25 ${FONT};color:#ffffff">${escapeHtml(personalise(s.title, name))}</td></tr>` : ""}
      <tr><td>${renderRichText(personalise(s.body, name), site)}</td></tr>
    </table>
  </td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg}" bgcolor="${C.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg}">${escapeHtml(personalise(c.preheader, name))}${"&#8204;&nbsp;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background:${C.bg}">
<tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.card};border-radius:24px;overflow:hidden;border:1px solid ${C.line}" bgcolor="${C.card}">
  <tr><td bgcolor="${C.lime}" style="height:6px;line-height:6px;font-size:0;background:${C.lime}">&nbsp;</td></tr>
  <tr><td style="padding:26px 32px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><a href="${escapeHtml(site)}/"><img src="${escapeHtml(site)}/brand/hackulator-logo-dark.png" width="150" height="83" alt="HACKULATOR" style="display:block;border:0;width:150px;height:auto;color:#ffffff;font:800 22px ${FONT}"></a></td>
      <td align="right" style="font:700 11px/1.6 ${MONO};letter-spacing:2px;color:${C.muted};text-transform:uppercase">The Weekly Drop<br><span style="color:${C.lime}">Issue #${ctx.issueNumber}</span> · ${escapeHtml(dateLabel)}</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:28px 32px 6px;font:900 38px/1.08 ${FONT};letter-spacing:-1px;color:#ffffff">${escapeHtml(personalise(c.headline || c.subject, name))}</td></tr>
  <tr><td style="padding:0 32px 22px"><div style="width:64px;height:6px;border-radius:3px;background:${C.lime}"></div></td></tr>
  ${image ? `<tr><td style="padding:0 32px 24px"><img src="${escapeHtml(image)}" width="536" alt="" style="display:block;width:100%;height:auto;border-radius:16px;border:0"></td></tr>` : ""}
  ${c.intro.trim() ? `<tr><td style="padding:0 32px 10px">${renderRichText(personalise(c.intro, name), site)}</td></tr>` : ""}
  ${c.showWaitlist && ctx.waitlist ? spotsBlock(ctx.waitlist, site) : ""}
  ${sectionHtml}
  ${cta ? `<tr><td align="center" style="padding:18px 32px 34px"><a href="${escapeHtml(cta)}" style="display:inline-block;padding:16px 30px;border-radius:999px;background:${C.lime};color:${C.limeInk};font:800 17px/1 ${FONT};text-decoration:none">${escapeHtml(c.ctaLabel)} →</a></td></tr>` : `<tr><td style="height:16px"></td></tr>`}
  <tr><td bgcolor="${C.bg}" style="padding:22px 32px;background:${C.bg};border-top:1px solid ${C.line};font:13px/1.6 ${FONT};color:${C.muted}">
    You're getting this because you signed up for the weekly Hackulator email at <a href="${escapeHtml(site)}/" style="color:${C.muted}">${escapeHtml(site.replace(/^https?:\/\//, ""))}</a>.<br>
    <a href="${escapeHtml(ctx.unsubscribeUrl)}" style="color:${C.lime}">Unsubscribe</a> any time with one click.<br>
    Hackulator is an independent prototype project, still in development.
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    `THE WEEKLY DROP · Issue #${ctx.issueNumber} · ${dateLabel}`,
    "",
    personalise(c.headline || c.subject, name).toUpperCase(),
    "",
    c.intro.trim() ? plainText(personalise(c.intro, name)) + "\n" : "",
    c.showWaitlist && ctx.waitlist
      ? `WAITLIST: ${ctx.waitlist.open ? `${ctx.waitlist.left} of ${ctx.waitlist.spots} spots left. Join free: ${site}/#waitlist` : "closed right now"}\n`
      : "",
    ...sections.map((s, i) => `${String(i + 1).padStart(2, "0")} ${personalise(s.title, name)}\n${plainText(personalise(s.body, name))}\n`),
    cta ? `${c.ctaLabel}: ${cta}\n` : "",
    "—",
    `Unsubscribe: ${ctx.unsubscribeUrl}`,
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");

  return { subject, html, text };
}

/** Clean and limit untrusted newsletter content (used by the server before saving or sending). */
export function sanitizeNewsletter(raw: unknown): NewsletterContent {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown, max: number, multiline = false) => {
    let s = String(v ?? "").replace(/\r\n/g, "\n");
    s = multiline ? s.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "") : s.replace(/[\u0000-\u001f\u007f]/g, " ");
    return s.trim().slice(0, max);
  };
  const L = NEWSLETTER_LIMITS;
  const sections = Array.isArray(r.sections) ? r.sections.slice(0, L.sections) : [];
  return {
    subject: str(r.subject, L.subject),
    preheader: str(r.preheader, L.preheader),
    headline: str(r.headline, L.headline),
    intro: str(r.intro, L.intro, true),
    imageUrl: str(r.imageUrl, L.imageUrl),
    sections: sections.map((s) => {
      const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      return { title: str(o.title, L.sectionTitle), body: str(o.body, L.sectionBody, true) };
    }),
    ctaLabel: str(r.ctaLabel, L.ctaLabel),
    ctaUrl: str(r.ctaUrl, L.ctaUrl),
    showWaitlist: r.showWaitlist !== false,
  };
}
