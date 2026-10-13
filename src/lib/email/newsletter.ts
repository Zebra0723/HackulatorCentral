/**
 * The weekly Hackulator email ("The Weekly Drop"). Pure functions shared by the
 * control room's live preview and the server that sends it, so the preview is
 * exactly what people get.
 *
 * Email HTML is old-fashioned on purpose: tables, inline styles, bgcolor and a
 * "fluid hybrid" layout (inline-block columns that stack on phones) are what
 * Gmail, Apple Mail and Outlook render reliably.
 */

export interface NewsletterHighlight {
  value: string;
  label: string;
}

export interface NewsletterSection {
  title: string;
  body: string;
  /** Optional picture beside the text (https:// or a site path like /email/snake.png). */
  imageUrl: string;
}

export interface NewsletterContent {
  subject: string;
  /** Grey preview text shown after the subject in most inboxes. */
  preheader: string;
  /** Small pill above the headline, e.g. "New this week". */
  eyebrow: string;
  headline: string;
  /** Optional second headline line, shown in lime. */
  headlineAccent: string;
  intro: string;
  /** Big picture under the headline. */
  imageUrl: string;
  /** Up to 4 big numbers in a strip, e.g. 3 / "games included". */
  highlights: NewsletterHighlight[];
  sections: NewsletterSection[];
  closingHeadline: string;
  closingText: string;
  ctaLabel: string;
  ctaUrl: string;
  /** Show the live "X of N spots left" banner. */
  showWaitlist: boolean;
}

/** Pictures made for the email, served from /public/email. */
export const EMAIL_IMAGES = [
  { url: "/email/hero.jpg", label: "Hackulator (hero)" },
  { url: "/email/snake.png", label: "Snake" },
  { url: "/email/2048.png", label: "2048" },
  { url: "/email/tetris.png", label: "Tetris" },
] as const;

export const EMPTY_NEWSLETTER: NewsletterContent = {
  subject: "",
  preheader: "",
  eyebrow: "",
  headline: "",
  headlineAccent: "",
  intro: "",
  imageUrl: "",
  highlights: [],
  sections: [],
  closingHeadline: "",
  closingText: "",
  ctaLabel: "",
  ctaUrl: "",
  showWaitlist: true,
};

export const NEWSLETTER_PRESETS: { id: string; label: string; content: NewsletterContent }[] = [
  {
    id: "promo",
    label: "Launch promo",
    content: {
      subject: "Your calculator is about to get a lot more fun 🎮",
      preheader: "Snake, 2048 and Tetris on a colour screen. Only a handful of spots in the first batch.",
      eyebrow: "The Weekly Drop",
      headline: "A calculator.",
      headlineAccent: "Reimagined.",
      intro: "Hi {name}! New electronics, a colour display and real games, built into the scientific calculator you already know.",
      imageUrl: "/email/hero.jpg",
      highlights: [
        { value: "3", label: "games included" },
        { value: "8", label: "cover colours" },
        { value: "8", label: "cover icons" },
        { value: "£5", label: "Custom UI" },
      ],
      sections: [
        {
          title: "Snake, but smoother",
          body: "Glides between squares, wraps through the walls and speeds up as you eat. Watch out for the **golden apple**.",
          imageUrl: "/email/snake.png",
        },
        {
          title: "2048 that slides",
          body: "Tiles glide, merges pop and new tiles grow in. One more go… then one more.",
          imageUrl: "/email/2048.png",
        },
        {
          title: "Tetris with a ghost piece",
          body: "Fair 7-piece bags, hard drop, a next queue and line-clear flashes. **Try all three** in the web demo on the site right now.",
          imageUrl: "/email/tetris.png",
        },
      ],
      closingHeadline: "Be one of the first.",
      closingText: "Joining the waitlist is free with no obligation to buy. It just reserves your place in the build queue.",
      ctaLabel: "Reserve my spot",
      ctaUrl: "/#waitlist",
      showWaitlist: true,
    },
  },
  {
    id: "weekly",
    label: "Weekly update",
    content: {
      subject: "This week on the bench 🔧",
      preheader: "What changed on the Hackulator this week, and how many spots are left.",
      eyebrow: "This week on the bench",
      headline: "Week in review.",
      headlineAccent: "",
      intro: "Hi {name}! Here's what happened with the Hackulator this week.",
      imageUrl: "/email/hero.jpg",
      highlights: [],
      sections: [
        { title: "What I built", body: "Write about the biggest thing you worked on. **Bold** bits and [links](https://example.com) work.", imageUrl: "" },
        { title: "What's next", body: "- One thing you're doing next\n- Another thing\n- A sneak peek", imageUrl: "" },
      ],
      closingHeadline: "Want one?",
      closingText: "Design yours in Build Yours and see the price as you go.",
      ctaLabel: "Build your Hackulator",
      ctaUrl: "/#build",
      showWaitlist: true,
    },
  },
];

export const STARTER_NEWSLETTER = NEWSLETTER_PRESETS[0].content;

export const NEWSLETTER_LIMITS = {
  subject: 120,
  preheader: 160,
  eyebrow: 40,
  headline: 80,
  headlineAccent: 80,
  intro: 2000,
  imageUrl: 500,
  highlights: 4,
  highlightValue: 12,
  highlightLabel: 30,
  sectionTitle: 100,
  sectionBody: 4000,
  sections: 6,
  closingHeadline: 100,
  closingText: 600,
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
  bg: "#0b0b0a",
  card: "#151514",
  line: "#2a2a27",
  text: "#e9e6df",
  muted: "#a3a19b",
  lime: "#b4e23c",
  limeInk: "#1c2606",
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
export function renderRichText(src: string, siteUrl: string, opts: { color?: string; size?: number; align?: "left" | "center" } = {}): string {
  const color = opts.color ?? C.text;
  const size = opts.size ?? 16;
  const align = opts.align ?? "left";
  const inline = (line: string) =>
    escapeHtml(line)
      .replace(/\*\*(.+?)\*\*/g, `<strong style="color:#ffffff">$1</strong>`)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text: string, href: string) => {
        const url = safeUrl(href.replace(/&amp;/g, "&"), siteUrl);
        return url ? `<a href="${escapeHtml(url)}" style="color:${C.lime};text-decoration:underline">${text}</a>` : text;
      });
  const font = `${size}px/1.6 ${FONT}`;
  return src
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.split("\n").filter((l) => l.trim()))
    .filter((lines) => lines.length)
    .map((lines) => {
      if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
        const items = lines.map((l) => `<li style="margin:0 0 6px">${inline(l.replace(/^\s*[-•]\s+/, ""))}</li>`).join("");
        return `<ul style="margin:0 0 14px;padding-left:20px;font:${font};color:${color};text-align:left">${items}</ul>`;
      }
      return `<p style="margin:0 0 14px;font:${font};color:${color};text-align:${align}">${lines.map(inline).join("<br>")}</p>`;
    })
    .join("");
}

function plainText(src: string) {
  return src.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)");
}

function button(label: string, href: string, dark = false) {
  const bg = dark ? C.limeInk : C.lime;
  const fg = dark ? C.lime : C.limeInk;
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto"><tr><td bgcolor="${bg}" style="border-radius:999px;background:${bg}">
<a href="${escapeHtml(href)}" style="display:inline-block;padding:17px 34px;border-radius:999px;background:${bg};color:${fg};font:800 17px/1 ${FONT};text-decoration:none;letter-spacing:-0.2px">${escapeHtml(label)}&nbsp;→</a>
</td></tr></table>`;
}

function highlightsBlock(items: NewsletterHighlight[]) {
  const list = items.filter((h) => h.value.trim() || h.label.trim()).slice(0, 4);
  if (!list.length) return "";
  const w = `${Math.floor(100 / list.length)}%`;
  const cells = list
    .map(
      (h) => `<div class="stat" style="display:inline-block;width:${w};vertical-align:top;text-align:center;padding:18px 0">
<div style="font:900 36px/1 ${FONT};color:${C.lime};letter-spacing:-1px">${escapeHtml(h.value)}</div>
<div style="padding-top:8px;font:700 11px/1.3 ${MONO};letter-spacing:1.5px;text-transform:uppercase;color:${C.muted}">${escapeHtml(h.label)}</div>
</div>`,
    )
    .join("");
  return `<tr><td class="px" style="padding:6px 32px 30px">
<div style="border-top:1px solid ${C.line};border-bottom:1px solid ${C.line};font-size:0;text-align:center">${cells}</div>
</td></tr>`;
}

function scarcityBlock(w: NonNullable<RenderContext["waitlist"]>, site: string) {
  const shown = Math.min(w.spots, 20);
  const taken = w.spots - w.left;
  const filled = Math.round((taken / Math.max(1, w.spots)) * shown);
  const squares = Array.from(
    { length: shown },
    (_, i) =>
      `<td width="${(100 / shown).toFixed(2)}%" style="padding:0 2px"><div style="height:20px;border-radius:5px;background:${i < filled ? C.limeInk : "rgba(28,38,6,0.18)"};font:700 10px/20px ${MONO};color:${i < filled ? C.lime : C.limeInk};text-align:center">${i < filled ? "✓" : i + 1}</div></td>`,
  ).join("");
  const big = !w.open ? "Closed" : w.left === 0 ? "Full" : `${w.left}`;
  const line = !w.open ? "The waitlist is closed right now" : w.left === 0 ? `All ${w.spots} spots are taken` : `of ${w.spots} spots left in the first batch`;
  return `<tr><td class="px" style="padding:0 24px 34px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.lime}" style="background:${C.lime};border-radius:24px">
<tr><td align="center" style="padding:28px 24px 6px;font:800 12px/1 ${MONO};letter-spacing:3px;color:${C.limeInk};text-transform:uppercase">🔥 Waitlist</td></tr>
<tr><td align="center" style="padding:6px 24px 0;font:900 76px/1 ${FONT};letter-spacing:-3px;color:${C.limeInk}">${big}</td></tr>
<tr><td align="center" style="padding:6px 24px 18px;font:700 17px/1.3 ${FONT};color:${C.limeInk}">${line}</td></tr>
<tr><td style="padding:0 22px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${squares}</tr></table></td></tr>
${w.open && w.left > 0 ? `<tr><td align="center" style="padding:0 24px 8px">${button("Reserve free", `${site}/#waitlist`, true)}</td></tr>
<tr><td align="center" style="padding:6px 24px 26px;font:13px/1.4 ${FONT};color:${C.limeInk}">Free to join · no obligation to buy</td></tr>` : `<tr><td style="height:10px"></td></tr>`}
</table></td></tr>`;
}

function sectionBlock(s: NewsletterSection, i: number, site: string, name?: string) {
  const num = `<div style="font:800 13px/1 ${MONO};letter-spacing:2px;color:${C.lime};padding-bottom:10px">${String(i + 1).padStart(2, "0")}</div>`;
  const title = s.title.trim() ? `<div style="font:900 26px/1.15 ${FONT};letter-spacing:-0.6px;color:#ffffff;padding-bottom:12px">${escapeHtml(personalise(s.title, name))}</div>` : "";
  const body = renderRichText(personalise(s.body, name), site, { color: C.text, size: 16 });
  const img = safeUrl(s.imageUrl, site);
  if (!img) {
    return `<tr><td class="px" style="padding:0 32px 22px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.line};border-radius:20px">
<tr><td style="padding:26px 26px 12px">${num}${title}${body}</td></tr></table></td></tr>`;
  }
  const flip = i % 2 === 1;
  const imgCol = `<div class="col" dir="ltr" style="display:inline-block;width:100%;max-width:250px;vertical-align:middle">
<div style="padding:10px"><img src="${escapeHtml(img)}" width="230" alt="" style="display:block;width:100%;height:auto;border-radius:20px;border:1px solid ${C.line}"></div></div>`;
  const textCol = `<div class="col" dir="ltr" style="display:inline-block;width:100%;max-width:286px;vertical-align:middle;text-align:left">
<div style="padding:10px 10px 10px 18px">${num}${title}${body}</div></div>`;
  return `<tr><td class="px" style="padding:0 22px 18px"><div dir="${flip ? "rtl" : "ltr"}" style="font-size:0;text-align:center">${imgCol}${textCol}</div></td></tr>`;
}

export function renderNewsletter(c: NewsletterContent, ctx: RenderContext): { subject: string; html: string; text: string } {
  const site = ctx.siteUrl.replace(/\/$/, "");
  const name = ctx.name;
  const subject = personalise(c.subject, name);
  const dateLabel = ctx.date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const hero = safeUrl(c.imageUrl, site);
  const cta = c.ctaLabel.trim() ? safeUrl(c.ctaUrl, site) : null;
  const sections = c.sections.filter((s) => s.title.trim() || s.body.trim());
  const headline = personalise(c.headline || c.subject, name);
  const accent = personalise(c.headlineAccent, name);

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${escapeHtml(subject)}</title>
<style>
  body{margin:0;padding:0;background:${C.bg}}
  a{color:${C.lime}}
  @media (max-width:620px){
    .px{padding-left:18px!important;padding-right:18px!important}
    .h1{font-size:44px!important;letter-spacing:-1.5px!important}
    .col{max-width:100%!important}
    .stat{width:50%!important}
  }
</style></head>
<body style="margin:0;padding:0;background:${C.bg}" bgcolor="${C.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg}">${escapeHtml(personalise(c.preheader, name))}${"&#8204;&nbsp;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background:${C.bg}">
<tr><td align="center" style="padding:20px 10px 30px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">

  <tr><td class="px" style="padding:4px 32px 22px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><a href="${escapeHtml(site)}/"><img src="${escapeHtml(site)}/brand/hackulator-logo-dark.png" width="120" alt="HACKULATOR" style="display:block;border:0;width:120px;height:auto;color:#ffffff;font:800 20px ${FONT}"></a></td>
      <td align="right" style="font:700 11px/1.5 ${MONO};letter-spacing:1.5px;color:${C.muted};text-transform:uppercase">Issue <span style="color:${C.lime}">#${ctx.issueNumber}</span><br>${escapeHtml(dateLabel)}</td>
    </tr></table>
  </td></tr>

  ${c.eyebrow.trim() ? `<tr><td align="center" style="padding:12px 32px 18px"><span style="display:inline-block;padding:8px 16px;border:1px solid ${C.lime};border-radius:999px;font:800 11px/1 ${MONO};letter-spacing:2.5px;text-transform:uppercase;color:${C.lime}">${escapeHtml(personalise(c.eyebrow, name))}</span></td></tr>` : ""}
  <tr><td align="center" class="px h1" style="padding:0 32px;font:900 58px/1 ${FONT};letter-spacing:-2px;color:#ffffff">${escapeHtml(headline)}${accent.trim() ? `<br><span style="color:${C.lime}">${escapeHtml(accent)}</span>` : ""}</td></tr>
  ${c.intro.trim() ? `<tr><td align="center" class="px" style="padding:22px 52px 4px">${renderRichText(personalise(c.intro, name), site, { color: C.muted, size: 18, align: "center" })}</td></tr>` : ""}
  ${cta ? `<tr><td align="center" style="padding:12px 32px 8px">${button(c.ctaLabel, cta)}</td></tr>` : ""}
  ${hero ? `<tr><td style="padding:18px 0 0"><img src="${escapeHtml(hero)}" width="600" alt="" style="display:block;width:100%;height:auto;border:0"></td></tr>` : `<tr><td style="height:30px"></td></tr>`}

  ${highlightsBlock(c.highlights)}
  ${c.showWaitlist && ctx.waitlist ? scarcityBlock(ctx.waitlist, site) : ""}
  ${sections.map((s, i) => sectionBlock(s, i, site, name)).join("")}

  ${c.closingHeadline.trim() || c.closingText.trim() || cta ? `<tr><td class="px" style="padding:16px 24px 34px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="background:${C.card};border:2px solid ${C.lime};border-radius:28px">
      ${c.closingHeadline.trim() ? `<tr><td align="center" style="padding:38px 28px 10px;font:900 38px/1.05 ${FONT};letter-spacing:-1.2px;color:#ffffff">${escapeHtml(personalise(c.closingHeadline, name))}</td></tr>` : `<tr><td style="height:24px"></td></tr>`}
      ${c.closingText.trim() ? `<tr><td align="center" style="padding:4px 36px 10px">${renderRichText(personalise(c.closingText, name), site, { color: C.muted, size: 16, align: "center" })}</td></tr>` : ""}
      ${cta ? `<tr><td align="center" style="padding:8px 28px 38px">${button(c.ctaLabel, cta)}</td></tr>` : `<tr><td style="height:24px"></td></tr>`}
    </table>
  </td></tr>` : ""}

  <tr><td class="px" align="center" style="padding:10px 32px 0;font:13px/1.7 ${FONT};color:${C.muted}">
    <a href="${escapeHtml(site)}/" style="color:${C.text};text-decoration:none;font-weight:700">Website</a> &nbsp;·&nbsp;
    <a href="${escapeHtml(site)}/#build" style="color:${C.text};text-decoration:none;font-weight:700">Build yours</a> &nbsp;·&nbsp;
    <a href="${escapeHtml(site)}/my-spot" style="color:${C.text};text-decoration:none;font-weight:700">Check my spot</a>
  </td></tr>
  <tr><td class="px" align="center" style="padding:16px 40px 0;font:12px/1.7 ${FONT};color:#77756f">
    You're getting The Weekly Drop because you signed up at ${escapeHtml(site.replace(/^https?:\/\//, ""))}.
    <a href="${escapeHtml(ctx.unsubscribeUrl)}" style="color:${C.lime}">Unsubscribe</a> in one click.<br>
    Hackulator is an independent prototype project, still in development. Previews are mockups.
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

  const text = [
    `HACKULATOR · THE WEEKLY DROP · Issue #${ctx.issueNumber} · ${dateLabel}`,
    "",
    c.eyebrow.trim() ? personalise(c.eyebrow, name).toUpperCase() : "",
    [headline, accent].filter((s) => s.trim()).join(" "),
    "",
    c.intro.trim() ? plainText(personalise(c.intro, name)) + "\n" : "",
    cta ? `${c.ctaLabel}: ${cta}\n` : "",
    c.highlights.filter((h) => h.value.trim()).map((h) => `${h.value} ${h.label}`).join(" · "),
    "",
    c.showWaitlist && ctx.waitlist
      ? `WAITLIST: ${ctx.waitlist.open ? `${ctx.waitlist.left} of ${ctx.waitlist.spots} spots left. Join free: ${site}/#waitlist` : "closed right now"}\n`
      : "",
    ...sections.map((s, i) => `${String(i + 1).padStart(2, "0")} ${personalise(s.title, name)}\n${plainText(personalise(s.body, name))}\n`),
    c.closingHeadline.trim() ? personalise(c.closingHeadline, name) : "",
    c.closingText.trim() ? plainText(personalise(c.closingText, name)) : "",
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
  const obj = (v: unknown) => (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const L = NEWSLETTER_LIMITS;
  const sections = Array.isArray(r.sections) ? r.sections.slice(0, L.sections) : [];
  const highlights = Array.isArray(r.highlights) ? r.highlights.slice(0, L.highlights) : [];
  return {
    subject: str(r.subject, L.subject),
    preheader: str(r.preheader, L.preheader),
    eyebrow: str(r.eyebrow, L.eyebrow),
    headline: str(r.headline, L.headline),
    headlineAccent: str(r.headlineAccent, L.headlineAccent),
    intro: str(r.intro, L.intro, true),
    imageUrl: str(r.imageUrl, L.imageUrl),
    highlights: highlights.map((h) => ({ value: str(obj(h).value, L.highlightValue), label: str(obj(h).label, L.highlightLabel) })),
    sections: sections.map((s) => ({
      title: str(obj(s).title, L.sectionTitle),
      body: str(obj(s).body, L.sectionBody, true),
      imageUrl: str(obj(s).imageUrl, L.imageUrl),
    })),
    closingHeadline: str(r.closingHeadline, L.closingHeadline),
    closingText: str(r.closingText, L.closingText, true),
    ctaLabel: str(r.ctaLabel, L.ctaLabel),
    ctaUrl: str(r.ctaUrl, L.ctaUrl),
    showWaitlist: r.showWaitlist !== false,
  };
}
