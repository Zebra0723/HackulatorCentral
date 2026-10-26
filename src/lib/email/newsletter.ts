/**
 * The Weekly Drop email builder. An email is a theme plus a list of blocks
 * (hero, picture, features, numbers, waitlist banner…). These pure functions are
 * shared by the control room's live preview and the server that sends the email,
 * so the preview is exactly what people get.
 *
 * Email HTML is old-fashioned on purpose: tables, inline styles, bgcolor and a
 * "fluid hybrid" layout (inline-block columns that stack on phones) are what
 * Gmail, Apple Mail and Outlook render reliably.
 */

/* ------------------------------------------------------------------ themes */

export const THEMES = {
  midnight: { name: "Midnight Lime", bg: "#0b0b0a", surface: "#151514", line: "#2a2a27", text: "#e9e6df", muted: "#a3a19b", heading: "#ffffff", accent: "#b4e23c", accentInk: "#1c2606", logo: "dark" },
  arcade: { name: "Arcade", bg: "#0d0820", surface: "#1a1035", line: "#34265f", text: "#ece6ff", muted: "#a99cd1", heading: "#ffffff", accent: "#ff4fd8", accentInk: "#2a0626", logo: "dark" },
  sunset: { name: "Sunset", bg: "#190c07", surface: "#27150c", line: "#4a2b1b", text: "#fbe9dd", muted: "#d2a88e", heading: "#ffffff", accent: "#ff7a2f", accentInk: "#2b0f02", logo: "dark" },
  ocean: { name: "Ocean", bg: "#06141f", surface: "#0d2233", line: "#1d3d55", text: "#e3f2fb", muted: "#8fb3c9", heading: "#ffffff", accent: "#3ec6ff", accentInk: "#02202d", logo: "dark" },
  paper: { name: "Paper", bg: "#f4f1ea", surface: "#ffffff", line: "#e2ddd2", text: "#2a2926", muted: "#6b6862", heading: "#141413", accent: "#141413", accentInk: "#b4e23c", logo: "light" },
  limepop: { name: "Lime Pop", bg: "#b4e23c", surface: "#c8f05a", line: "#93bd22", text: "#1c2606", muted: "#3f5212", heading: "#0b0b0a", accent: "#0b0b0a", accentInk: "#b4e23c", logo: "light" },
} as const;
export type ThemeId = keyof typeof THEMES;
type Theme = (typeof THEMES)[ThemeId];
const THEME_IDS = Object.keys(THEMES) as ThemeId[];

/* ------------------------------------------------------------------ blocks */

export interface StatItem { value: string; label: string }
export interface GridItem { imageUrl: string; title: string; body: string; linkUrl: string }

export type EmailBlock =
  | { id: string; type: "hero"; eyebrow: string; headline: string; accentLine: string; text: string; buttonLabel: string; buttonUrl: string; imageUrl: string; align: "center" | "left" }
  | { id: string; type: "image"; imageUrl: string; linkUrl: string; caption: string; width: "full" | "inset" }
  | { id: string; type: "text"; heading: string; body: string; align: "left" | "center"; boxed: boolean }
  | { id: string; type: "button"; label: string; url: string; style: "solid" | "outline" }
  | { id: string; type: "stats"; items: StatItem[] }
  | { id: string; type: "waitlist"; style: "accent" | "surface" }
  | { id: string; type: "feature"; eyebrow: string; title: string; body: string; imageUrl: string; imageSide: "left" | "right"; buttonLabel: string; buttonUrl: string }
  | { id: string; type: "grid"; columns: 2 | 3; items: GridItem[] }
  | { id: string; type: "banner"; kicker: string; text: string; style: "accent" | "surface" | "outline" }
  | { id: string; type: "quote"; quote: string; who: string }
  | { id: string; type: "cta"; headline: string; text: string; buttonLabel: string; buttonUrl: string }
  | { id: string; type: "divider"; style: "line" | "dots" | "space" };

export type BlockType = EmailBlock["type"];

export interface NewsletterContent {
  version: 2;
  subject: string;
  /** Grey preview text shown after the subject in most inboxes. */
  preheader: string;
  theme: ThemeId;
  blocks: EmailBlock[];
}

/** What each block is for, shown in the "Add block" library. */
export const BLOCK_LIBRARY: { type: BlockType; label: string; hint: string }[] = [
  { type: "hero", label: "Hero", hint: "Giant headline, button and picture" },
  { type: "image", label: "Picture", hint: "A big photo or graphic" },
  { type: "feature", label: "Feature", hint: "Picture beside text" },
  { type: "grid", label: "Cards", hint: "2 or 3 picture cards in a row" },
  { type: "stats", label: "Big numbers", hint: "Up to 4 stats in a strip" },
  { type: "waitlist", label: "Spots left", hint: "Live waitlist counter" },
  { type: "banner", label: "Banner", hint: "Huge announcement text" },
  { type: "text", label: "Text", hint: "Heading and paragraphs" },
  { type: "quote", label: "Quote", hint: "A quote or shout-out" },
  { type: "button", label: "Button", hint: "A single button" },
  { type: "cta", label: "Call to action", hint: "Closing box with a button" },
  { type: "divider", label: "Divider", hint: "Line, dots or space" },
];

export function newBlockId() {
  return Math.random().toString(36).slice(2, 10);
}

export function createBlock(type: BlockType): EmailBlock {
  const id = newBlockId();
  switch (type) {
    case "hero":
      return { id, type, eyebrow: "New this week", headline: "Big news.", accentLine: "Really big.", text: "Say what's new in a sentence or two.", buttonLabel: "Take a look", buttonUrl: "/", imageUrl: "/email/hero.jpg", align: "center" };
    case "image":
      return { id, type, imageUrl: "/email/product.jpg", linkUrl: "", caption: "", width: "inset" };
    case "text":
      return { id, type, heading: "A heading", body: "Write something here. **Bold** and [links](https://example.com) work.", align: "left", boxed: false };
    case "button":
      return { id, type, label: "Build yours", url: "/#build", style: "solid" };
    case "stats":
      return { id, type, items: [{ value: "3", label: "games included" }, { value: "8", label: "cover colours" }, { value: "£5", label: "Custom UI" }] };
    case "waitlist":
      return { id, type, style: "accent" };
    case "feature":
      return { id, type, eyebrow: "", title: "A cool feature", body: "Tell people why it's great.", imageUrl: "/email/snake.png", imageSide: "left", buttonLabel: "", buttonUrl: "" };
    case "grid":
      return {
        id,
        type,
        columns: 3,
        items: [
          { imageUrl: "/email/snake.png", title: "Snake", body: "Wraps through walls.", linkUrl: "" },
          { imageUrl: "/email/2048.png", title: "2048", body: "Tiles that slide.", linkUrl: "" },
          { imageUrl: "/email/tetris.png", title: "Tetris", body: "With a ghost piece.", linkUrl: "" },
        ],
      };
    case "banner":
      return { id, type, kicker: "Just dropped", text: "Something big.", style: "accent" };
    case "quote":
      return { id, type, quote: "This is the coolest calculator I've ever seen.", who: "A very happy tester" };
    case "cta":
      return { id, type, headline: "Be one of the first.", text: "Joining the waitlist is free with no obligation to buy.", buttonLabel: "Reserve my spot", buttonUrl: "/#waitlist" };
    case "divider":
      return { id, type, style: "dots" };
  }
}

/** Ready-made pictures, served from /public/email. */
export const EMAIL_IMAGES = [
  { url: "/email/hero.jpg", label: "Hackulator (tilted hero)" },
  { url: "/email/product.jpg", label: "Hackulator (front)" },
  { url: "/email/film.jpg", label: "Concept film (play button)" },
  { url: "/email/snake.png", label: "Snake" },
  { url: "/email/2048.png", label: "2048" },
  { url: "/email/tetris.png", label: "Tetris" },
  { url: "/email/colours.png", label: "Cover colours" },
] as const;

/* --------------------------------------------------------------- templates */

const b = <T extends BlockType>(type: T, patch: Partial<Extract<EmailBlock, { type: T }>>) =>
  ({ ...createBlock(type), ...patch }) as Extract<EmailBlock, { type: T }>;

export const NEWSLETTER_PRESETS: { id: string; label: string; build: () => NewsletterContent }[] = [
  {
    id: "intro",
    label: "Introducing the Hackulator",
    build: () => ({
      version: 2,
      subject: "Meet the Hackulator",
      preheader: "A scientific calculator with a colour screen and real games. Here's what it is, and how to get one.",
      theme: "midnight",
      blocks: [
        b("hero", {
          eyebrow: "Introducing",
          headline: "Meet the",
          accentLine: "Hackulator.",
          text: "Hi {name}! New electronics, a colour display and real games, built inside the scientific calculator you already know.",
          buttonLabel: "Reserve my spot",
          buttonUrl: "/#waitlist",
          imageUrl: "/email/hero.jpg",
        }),
        b("banner", { kicker: "What is it?", text: "Your calculator. Upgraded.", style: "outline" }),
        b("text", {
          heading: "",
          body: "The Hackulator starts as an ordinary Casio scientific calculator. Inside goes a **custom board and a colour screen**. It still does your maths, and then it plays games.\n\nIt's a **prototype in development**, built by hand, and the first batch is tiny.",
          align: "center",
        }),
        b("stats", { items: [{ value: "3", label: "games included" }, { value: "8", label: "cover colours" }, { value: "8", label: "cover icons" }, { value: "£5", label: "Custom UI" }] }),
        b("grid", {
          columns: 3,
          items: [
            { imageUrl: "/email/snake.png", title: "Snake", body: "Wraps through the walls.", linkUrl: "/#games" },
            { imageUrl: "/email/2048.png", title: "2048", body: "Tiles that slide and pop.", linkUrl: "/#games" },
            { imageUrl: "/email/tetris.png", title: "Tetris", body: "With a ghost piece.", linkUrl: "/#games" },
          ],
        }),
        b("feature", {
          eyebrow: "Make it yours",
          title: "Your calculator, your style",
          body: "- Your **name** on the cover\n- A **cover icon** (dog, star, lightning…)\n- **8 colours** for the name and icon\n- **Custom UI**: your colours, font and welcome text",
          imageUrl: "/email/colours.png",
          imageSide: "left",
          buttonLabel: "Build yours",
          buttonUrl: "/#build",
        }),
        b("feature", {
          eyebrow: "Try it now",
          title: "Play it in your browser",
          body: "The virtual Hackulator on the website is playable. Type **HOME 2 0 4 8 OK** to unlock the games.",
          imageUrl: "/email/product.jpg",
          imageSide: "right",
          buttonLabel: "Play the demo",
          buttonUrl: "/#games",
        }),
        b("image", { imageUrl: "/email/film.jpg", linkUrl: "/#film", caption: "Tap to watch the concept film", width: "inset" }),
        b("waitlist", { style: "accent" }),
        b("cta", {
          headline: "Be one of the first.",
          text: "Joining the waitlist is **free** with **no obligation to buy**. It just reserves your place in the manufacturing queue.",
          buttonLabel: "Reserve my spot",
          buttonUrl: "/#waitlist",
        }),
      ],
    }),
  },
  {
    id: "launch",
    label: "Launch promo",
    build: () => ({
      version: 2,
      subject: "Your calculator is about to get a lot more fun",
      preheader: "Snake, 2048 and Tetris on a colour screen. Only a handful of spots in the first batch.",
      theme: "midnight",
      blocks: [
        b("hero", { eyebrow: "The Weekly Drop", headline: "A calculator.", accentLine: "Reimagined.", text: "Hi {name}! New electronics, a colour display and real games, built into the scientific calculator you already know.", buttonLabel: "Reserve my spot", buttonUrl: "/#waitlist" }),
        b("stats", { items: [{ value: "3", label: "games included" }, { value: "8", label: "cover colours" }, { value: "8", label: "cover icons" }, { value: "£5", label: "Custom UI" }] }),
        b("waitlist", {}),
        b("feature", { eyebrow: "01", title: "Snake, but smoother", body: "Glides between squares, wraps through the walls and speeds up as you eat. Watch out for the **golden apple**.", imageUrl: "/email/snake.png" }),
        b("feature", { eyebrow: "02", title: "2048 that slides", body: "Tiles glide, merges pop and new tiles grow in. One more go… then one more.", imageUrl: "/email/2048.png", imageSide: "right" }),
        b("feature", { eyebrow: "03", title: "Tetris with a ghost piece", body: "Fair 7-piece bags, hard drop and line-clear flashes. **Try all three** in the web demo right now.", imageUrl: "/email/tetris.png", buttonLabel: "Play the demo", buttonUrl: "/#games" }),
        b("cta", {}),
      ],
    }),
  },
  {
    id: "spotlight",
    label: "Game spotlight",
    build: () => ({
      version: 2,
      subject: "Game of the week: Tetris",
      preheader: "Ghost piece, hard drop, line-clear flashes. Try it in your browser.",
      theme: "arcade",
      blocks: [
        b("banner", { kicker: "Game of the week", text: "TETRIS", style: "accent" }),
        b("image", { imageUrl: "/email/tetris.png", width: "inset", linkUrl: "/#games" }),
        b("text", { heading: "Why it's addictive", body: "- Fair **7-piece bags**, so no droughts\n- A **ghost piece** shows where it'll land\n- **Hard drop** with = or EXE\n- Line-clear flashes and level-ups", align: "left", boxed: true }),
        b("button", { label: "Play it in your browser", url: "/#games" }),
        b("grid", { columns: 2, items: [
          { imageUrl: "/email/snake.png", title: "Also: Snake", body: "Wraps through the walls.", linkUrl: "/#games" },
          { imageUrl: "/email/2048.png", title: "Also: 2048", body: "Tiles that slide and pop.", linkUrl: "/#games" },
        ] }),
        b("waitlist", { style: "surface" }),
      ],
    }),
  },
  {
    id: "announce",
    label: "Big announcement",
    build: () => ({
      version: 2,
      subject: "Big news from the Hackulator bench",
      preheader: "Something new just landed. Here's the first look.",
      theme: "sunset",
      blocks: [
        b("hero", { eyebrow: "Announcement", headline: "It's here.", accentLine: "First look inside.", text: "Hi {name}! Say what the big news is right here.", buttonLabel: "See it", buttonUrl: "/", imageUrl: "" }),
        b("banner", { kicker: "Watch", text: "The concept film", style: "outline" }),
        b("image", { imageUrl: "/email/film.jpg", linkUrl: "/#film", caption: "Tap to watch the concept film" }),
        b("quote", { quote: "Write a line about why this matters to you.", who: "You, the maker" }),
        b("cta", { headline: "Want one?", text: "Design yours in Build Yours and see the price as you go.", buttonLabel: "Build yours", buttonUrl: "/#build" }),
      ],
    }),
  },
  {
    id: "lastcall",
    label: "Spots almost gone",
    build: () => ({
      version: 2,
      subject: "The first batch is almost full",
      preheader: "Only a few waitlist spots left. Free to join, no obligation.",
      theme: "limepop",
      blocks: [
        b("banner", { kicker: "Last call", text: "Almost gone.", style: "surface" }),
        b("waitlist", { style: "surface" }),
        b("text", { heading: "Why join now?", body: "The first Hackulators are built by hand in a tiny batch. A waitlist spot reserves your place in the queue. It's **free**, and there's **no obligation to buy**.", align: "center", boxed: false }),
        b("image", { imageUrl: "/email/product.jpg", width: "inset" }),
        b("button", { label: "Reserve my spot", url: "/#waitlist" }),
      ],
    }),
  },
  {
    id: "weekly",
    label: "Weekly update",
    build: () => ({
      version: 2,
      subject: "This week on the bench",
      preheader: "What changed on the Hackulator this week, and how many spots are left.",
      theme: "paper",
      blocks: [
        b("hero", { eyebrow: "This week on the bench", headline: "Week in review.", accentLine: "", text: "Hi {name}! Here's what happened with the Hackulator this week.", buttonLabel: "", buttonUrl: "", imageUrl: "/email/product.jpg", align: "left" }),
        b("text", { heading: "What I built", body: "Write about the biggest thing you worked on. **Bold** bits and [links](https://example.com) work.", boxed: true }),
        b("text", { heading: "What's next", body: "- One thing you're doing next\n- Another thing\n- A sneak peek", boxed: true }),
        b("waitlist", { style: "surface" }),
        b("cta", { headline: "Want one?", text: "Design yours in Build Yours and see the price as you go.", buttonLabel: "Build your Hackulator", buttonUrl: "/#build" }),
      ],
    }),
  },
];

export const STARTER_NEWSLETTER: NewsletterContent = NEWSLETTER_PRESETS[0].build();

/* ------------------------------------------------------------------ limits */

export const NEWSLETTER_LIMITS = {
  subject: 120,
  preheader: 160,
  blocks: 30,
  short: 60,
  title: 120,
  body: 4000,
  url: 500,
  label: 40,
  stats: 4,
  grid: 6,
} as const;

/* ---------------------------------------------------------------- rendering */

export interface RenderContext {
  /** Absolute site URL without a trailing slash, e.g. https://hackulator.example. */
  siteUrl: string;
  unsubscribeUrl: string;
  issueNumber: number;
  date: Date;
  /** The reader's first name, if we have it. Replaces {name}. */
  name?: string;
  waitlist?: { spots: number; left: number; open: boolean };
  /** Live preview only: tag blocks so the editor can select them, and highlight one. */
  preview?: { selectedId?: string | null };
}

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

const personalise = (s: string, name?: string) => s.replace(/\{name\}/g, name?.trim() || "there");

/** **bold**, [text](url), "- " bullet lines and blank-line paragraphs. Everything else is escaped. */
export function renderRichText(src: string, siteUrl: string, opts: { color: string; strong: string; link: string; size?: number; align?: "left" | "center" }): string {
  const size = opts.size ?? 16;
  const align = opts.align ?? "left";
  const inline = (line: string) =>
    escapeHtml(line)
      .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${opts.strong}">$1</strong>`)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text: string, href: string) => {
        const url = safeUrl(href.replace(/&amp;/g, "&"), siteUrl);
        return url ? `<a href="${escapeHtml(url)}" style="color:${opts.link};text-decoration:underline">${text}</a>` : text;
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
        return `<ul style="margin:0 0 14px;padding-left:20px;font:${font};color:${opts.color};text-align:left">${items}</ul>`;
      }
      return `<p style="margin:0 0 14px;font:${font};color:${opts.color};text-align:${align}">${lines.map(inline).join("<br>")}</p>`;
    })
    .join("");
}

const plainText = (src: string) => src.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)");

interface R {
  t: Theme;
  site: string;
  name?: string;
  ctx: RenderContext;
}

/**
 * A single-line text field. In the editor preview it's tagged so it can be edited
 * in place (unless it contains {name}, which would otherwise get baked in).
 */
function ed(r: R, field: string, value: string) {
  if (r.ctx.preview && !value.includes("{name}")) return `<span data-f="${field}">${escapeHtml(value)}</span>`;
  return escapeHtml(personalise(value, r.name));
}

const p = (r: R, s: string) => personalise(s, r.name);
const rich = (r: R, s: string, o: { color?: string; size?: number; align?: "left" | "center" } = {}) =>
  renderRichText(p(r, s), r.site, { color: o.color ?? r.t.text, strong: r.t.heading, link: r.t.accent, size: o.size, align: o.align });

function button(r: R, label: string, href: string, opts: { invert?: boolean; outline?: boolean; align?: "center" | "left" } = {}) {
  const url = safeUrl(href, r.site);
  if (!label.trim() || !url) return "";
  const bg = opts.invert ? r.t.accentInk : r.t.accent;
  const fg = opts.invert ? r.t.accent : r.t.accentInk;
  const style = opts.outline
    ? `display:inline-block;padding:15px 30px;border-radius:999px;border:2px solid ${r.t.accent};color:${r.t.accent};font:800 16px/1 ${FONT};text-decoration:none`
    : `display:inline-block;padding:17px 32px;border-radius:999px;background:${bg};color:${fg};font:800 17px/1 ${FONT};text-decoration:none`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" ${opts.align === "left" ? "" : 'align="center" style="margin:0 auto"'}><tr><td ${opts.outline ? "" : `bgcolor="${bg}"`} style="border-radius:999px">
<a href="${escapeHtml(url)}" style="${style}">${escapeHtml(label)}&nbsp;→</a></td></tr></table>`;
}

function img(r: R, src: string, width: number, extra = "", field = "imageUrl") {
  const url = safeUrl(src, r.site);
  const tag = r.ctx.preview ? ` data-img="${field}" title="Drop a photo here to replace it"` : "";
  return url ? `<img src="${escapeHtml(url)}"${tag} width="${width}" alt="" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;${extra}">` : "";
}

const row = (inner: string, pad = "0 32px 28px") => `<tr><td class="px" style="padding:${pad}">${inner}</td></tr>`;

function renderBlock(r: R, block: EmailBlock): string {
  const t = r.t;
  switch (block.type) {
    case "hero": {
      const center = block.align !== "left";
      const a = center ? "center" : "left";
      const pill = block.eyebrow.trim()
        ? `<tr><td align="${a}" style="padding:10px 32px 18px"><span style="display:inline-block;padding:8px 16px;border:1px solid ${t.accent};border-radius:999px;font:800 11px/1 ${MONO};letter-spacing:2.5px;text-transform:uppercase;color:${t.accent}">${ed(r, "eyebrow", block.eyebrow)}</span></td></tr>`
        : "";
      const accent = block.accentLine.trim() ? `<br><span style="color:${t.accent}">${ed(r, "accentLine", block.accentLine)}</span>` : "";
      const picture = img(r, block.imageUrl, 600);
      return `${pill}
<tr><td align="${a}" class="px h1" style="padding:0 32px;font:900 58px/1 ${FONT};letter-spacing:-2px;color:${t.heading};text-align:${a}">${ed(r, "headline", block.headline)}${accent}</td></tr>
${block.text.trim() ? `<tr><td class="px" style="padding:22px ${center ? 52 : 32}px 4px">${rich(r, block.text, { color: t.muted, size: 18, align: a })}</td></tr>` : ""}
${button(r, block.buttonLabel, block.buttonUrl) ? `<tr><td class="px" style="padding:10px 32px 6px">${button(r, block.buttonLabel, block.buttonUrl, { align: a })}</td></tr>` : ""}
${picture ? `<tr><td style="padding:22px 0 26px">${picture}</td></tr>` : `<tr><td style="height:30px"></td></tr>`}`;
    }
    case "image": {
      const full = block.width === "full";
      let picture = img(r, block.imageUrl, full ? 600 : 536, full ? "" : `border-radius:20px;border:1px solid ${t.line}`);
      if (!picture) return "";
      const link = safeUrl(block.linkUrl, r.site);
      if (link) picture = `<a href="${escapeHtml(link)}">${picture}</a>`;
      const caption = block.caption.trim() ? `<div style="padding-top:10px;font:13px/1.5 ${FONT};color:${t.muted};text-align:center">${ed(r, "caption", block.caption)}</div>` : "";
      return full ? `<tr><td style="padding:0 0 28px">${picture}${caption ? `<div class="px" style="padding:0 32px">${caption}</div>` : ""}</td></tr>` : row(picture + caption);
    }
    case "text": {
      const a = block.align === "center" ? "center" : "left";
      const inner = `${block.heading.trim() ? `<div style="font:900 28px/1.15 ${FONT};letter-spacing:-0.7px;color:${t.heading};padding-bottom:12px;text-align:${a}">${ed(r, "heading", block.heading)}</div>` : ""}${rich(r, block.body, { align: a })}`;
      return block.boxed
        ? row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${t.surface}" style="background:${t.surface};border:1px solid ${t.line};border-radius:20px"><tr><td style="padding:26px 26px 12px">${inner}</td></tr></table>`, "0 32px 22px")
        : row(inner);
    }
    case "button":
      return button(r, block.label, block.url) ? row(button(r, block.label, block.url, { outline: block.style === "outline" })) : "";
    case "stats": {
      const list = block.items.filter((h) => h.value.trim() || h.label.trim()).slice(0, 4);
      if (!list.length) return "";
      const w = `${Math.floor(100 / list.length)}%`;
      const cells = list
        .map(
          (h) => `<div class="stat" style="display:inline-block;width:${w};vertical-align:top;text-align:center;padding:18px 0">
<div style="font:900 38px/1 ${FONT};color:${t.accent};letter-spacing:-1px">${escapeHtml(h.value)}</div>
<div style="padding-top:8px;font:700 11px/1.3 ${MONO};letter-spacing:1.5px;text-transform:uppercase;color:${t.muted}">${escapeHtml(h.label)}</div></div>`,
        )
        .join("");
      return row(`<div style="border-top:1px solid ${t.line};border-bottom:1px solid ${t.line};font-size:0;text-align:center">${cells}</div>`, "0 32px 30px");
    }
    case "waitlist": {
      const w = r.ctx.waitlist;
      if (!w) return "";
      const onAccent = block.style !== "surface";
      const bg = onAccent ? t.accent : t.surface;
      const fg = onAccent ? t.accentInk : t.heading;
      const sub = onAccent ? t.accentInk : t.muted;
      const shown = Math.min(w.spots, 20);
      const filled = Math.round(((w.spots - w.left) / Math.max(1, w.spots)) * shown);
      const squares = Array.from({ length: shown }, (_, i) => {
        const on = i < filled;
        const sq = onAccent ? (on ? t.accentInk : "rgba(0,0,0,0.14)") : on ? t.accent : t.line;
        const tx = onAccent ? (on ? t.accent : t.accentInk) : on ? t.accentInk : t.muted;
        return `<td width="${(100 / shown).toFixed(2)}%" style="padding:0 2px"><div style="height:20px;border-radius:5px;background:${sq};font:700 10px/20px ${MONO};color:${tx};text-align:center">${on ? "✓" : i + 1}</div></td>`;
      }).join("");
      const big = !w.open ? "Closed" : w.left === 0 ? "Full" : `${w.left}`;
      const line = !w.open ? "The waitlist is closed right now" : w.left === 0 ? `All ${w.spots} spots are taken` : `of ${w.spots} spots left in the first batch`;
      return `<tr><td class="px" style="padding:0 24px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${bg}" style="background:${bg};border-radius:24px;${onAccent ? "" : `border:1px solid ${t.line}`}">
<tr><td align="center" style="padding:28px 24px 6px;font:800 12px/1 ${MONO};letter-spacing:3px;color:${onAccent ? fg : t.accent};text-transform:uppercase">Waitlist</td></tr>
<tr><td align="center" style="padding:6px 24px 0;font:900 76px/1 ${FONT};letter-spacing:-3px;color:${fg}">${big}</td></tr>
<tr><td align="center" style="padding:6px 24px 18px;font:700 17px/1.3 ${FONT};color:${fg}">${line}</td></tr>
<tr><td style="padding:0 22px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${squares}</tr></table></td></tr>
${w.open && w.left > 0 ? `<tr><td align="center" style="padding:0 24px 8px">${button(r, "Reserve free", "/#waitlist", { invert: onAccent })}</td></tr>
<tr><td align="center" style="padding:6px 24px 26px;font:13px/1.4 ${FONT};color:${sub}">Free to join · no obligation to buy</td></tr>` : `<tr><td style="height:10px"></td></tr>`}
</table></td></tr>`;
    }
    case "feature": {
      const eyebrow = block.eyebrow.trim() ? `<div style="font:800 13px/1 ${MONO};letter-spacing:2px;color:${t.accent};padding-bottom:10px;text-transform:uppercase">${ed(r, "eyebrow", block.eyebrow)}</div>` : "";
      const title = block.title.trim() ? `<div style="font:900 26px/1.15 ${FONT};letter-spacing:-0.6px;color:${t.heading};padding-bottom:12px">${ed(r, "title", block.title)}</div>` : "";
      const btn = button(r, block.buttonLabel, block.buttonUrl, { outline: true, align: "left" });
      const text = `${eyebrow}${title}${rich(r, block.body)}${btn ? `<div style="padding-top:4px">${btn}</div>` : ""}`;
      const picture = img(r, block.imageUrl, 230, `border-radius:20px;border:1px solid ${t.line}`);
      if (!picture) return row(text);
      const imgCol = `<div class="col" dir="ltr" style="display:inline-block;width:100%;max-width:250px;vertical-align:middle"><div style="padding:10px">${picture}</div></div>`;
      const textCol = `<div class="col" dir="ltr" style="display:inline-block;width:100%;max-width:286px;vertical-align:middle;text-align:left"><div style="padding:10px 10px 10px 18px">${text}</div></div>`;
      return row(`<div dir="${block.imageSide === "right" ? "rtl" : "ltr"}" style="font-size:0;text-align:center">${imgCol}${textCol}</div>`, "0 22px 22px");
    }
    case "grid": {
      const items = block.items.filter((i) => i.title.trim() || i.body.trim() || i.imageUrl.trim()).slice(0, 6);
      if (!items.length) return "";
      const cols = block.columns === 2 ? 2 : 3;
      const colW = cols === 2 ? 268 : 178;
      const cards = items
        .map((it) => {
          const gi = block.items.indexOf(it);
          const link = safeUrl(it.linkUrl, r.site);
          let picture = img(r, it.imageUrl, colW - 20, "border-radius:14px", `items.${gi}.imageUrl`);
          if (picture && link) picture = `<a href="${escapeHtml(link)}">${picture}</a>`;
          return `<div class="col" style="display:inline-block;width:100%;max-width:${colW}px;vertical-align:top;text-align:left"><div style="margin:6px;padding:10px 10px 4px;border-radius:18px;background:${t.surface};border:1px solid ${t.line}">
${picture}${it.title.trim() ? `<div style="padding:12px 4px 4px;font:800 18px/1.2 ${FONT};color:${t.heading}">${ed(r, `items.${gi}.title`, it.title)}</div>` : ""}
${it.body.trim() ? `<div style="padding:0 4px 8px">${rich(r, it.body, { size: 14, color: t.muted })}</div>` : ""}</div></div>`;
        })
        .join("");
      return row(`<div style="font-size:0;text-align:center">${cards}</div>`, "0 26px 26px");
    }
    case "banner": {
      const bg = block.style === "accent" ? t.accent : block.style === "surface" ? t.surface : "transparent";
      const fg = block.style === "accent" ? t.accentInk : t.heading;
      const kick = block.style === "accent" ? t.accentInk : t.accent;
      const border = block.style === "outline" ? `border:2px solid ${t.accent};` : block.style === "surface" ? `border:1px solid ${t.line};` : "";
      return row(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ${bg !== "transparent" ? `bgcolor="${bg}"` : ""} style="background:${bg};${border}border-radius:24px">
${block.kicker.trim() ? `<tr><td align="center" style="padding:28px 20px 4px;font:800 12px/1 ${MONO};letter-spacing:3px;text-transform:uppercase;color:${kick}">${ed(r, "kicker", block.kicker)}</td></tr>` : `<tr><td style="height:24px"></td></tr>`}
<tr><td align="center" class="h1" style="padding:8px 20px 30px;font:900 56px/1.02 ${FONT};letter-spacing:-2px;color:${fg}">${ed(r, "text", block.text)}</td></tr></table>`,
        "0 24px 28px",
      );
    }
    case "quote":
      return row(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-left:4px solid ${t.accent};padding:4px 0 4px 22px">
<div style="font:800 24px/1.35 ${FONT};letter-spacing:-0.4px;color:${t.heading}">“${ed(r, "quote", block.quote)}”</div>
${block.who.trim() ? `<div style="padding-top:12px;font:700 12px/1 ${MONO};letter-spacing:2px;text-transform:uppercase;color:${t.accent}">— ${ed(r, "who", block.who)}</div>` : ""}</td></tr></table>`,
        "4px 40px 32px",
      );
    case "cta":
      return row(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${t.surface}" style="background:${t.surface};border:2px solid ${t.accent};border-radius:28px">
${block.headline.trim() ? `<tr><td align="center" style="padding:38px 28px 10px;font:900 38px/1.05 ${FONT};letter-spacing:-1.2px;color:${t.heading}">${ed(r, "headline", block.headline)}</td></tr>` : `<tr><td style="height:26px"></td></tr>`}
${block.text.trim() ? `<tr><td align="center" style="padding:4px 36px 10px">${rich(r, block.text, { color: t.muted, align: "center" })}</td></tr>` : ""}
${button(r, block.buttonLabel, block.buttonUrl) ? `<tr><td align="center" style="padding:8px 28px 38px">${button(r, block.buttonLabel, block.buttonUrl)}</td></tr>` : `<tr><td style="height:26px"></td></tr>`}</table>`,
        "6px 24px 34px",
      );
    case "divider":
      if (block.style === "space") return `<tr><td style="height:36px;line-height:36px;font-size:0">&nbsp;</td></tr>`;
      if (block.style === "dots")
        return `<tr><td align="center" style="padding:4px 32px 30px;font:900 20px/1 ${FONT};letter-spacing:14px;color:${t.accent}">• • •</td></tr>`;
      return row(`<div style="height:1px;background:${t.line};line-height:1px;font-size:0">&nbsp;</div>`);
  }
}

function blockText(r: R, block: EmailBlock): string {
  const pt = (s: string) => plainText(p(r, s));
  const link = (label: string, url: string) => {
    const u = safeUrl(url, r.site);
    return label.trim() && u ? `${label}: ${u}` : "";
  };
  switch (block.type) {
    case "hero":
      return [pt(block.eyebrow).toUpperCase(), [pt(block.headline), pt(block.accentLine)].filter(Boolean).join(" "), pt(block.text), link(block.buttonLabel, block.buttonUrl)].filter(Boolean).join("\n\n");
    case "image":
      return block.caption.trim() ? `[${pt(block.caption)}]` : "";
    case "text":
      return [pt(block.heading).toUpperCase(), pt(block.body)].filter(Boolean).join("\n");
    case "button":
      return link(block.label, block.url);
    case "stats":
      return block.items.filter((s) => s.value.trim()).map((s) => `${s.value} ${s.label}`).join(" · ");
    case "waitlist": {
      const w = r.ctx.waitlist;
      return w ? `WAITLIST: ${w.open ? `${w.left} of ${w.spots} spots left. Join free: ${r.site}/#waitlist` : "closed right now"}` : "";
    }
    case "feature":
      return [[pt(block.eyebrow), pt(block.title)].filter(Boolean).join(" "), pt(block.body), link(block.buttonLabel, block.buttonUrl)].filter(Boolean).join("\n");
    case "grid":
      return block.items.map((i) => `- ${pt(i.title)}${i.body.trim() ? `: ${pt(i.body)}` : ""}`).join("\n");
    case "banner":
      return `${pt(block.kicker).toUpperCase()}\n${pt(block.text).toUpperCase()}`.trim();
    case "quote":
      return `“${pt(block.quote)}”${block.who.trim() ? ` — ${pt(block.who)}` : ""}`;
    case "cta":
      return [pt(block.headline), pt(block.text), link(block.buttonLabel, block.buttonUrl)].filter(Boolean).join("\n");
    case "divider":
      return "";
  }
}

export function renderNewsletter(c: NewsletterContent, ctx: RenderContext): { subject: string; html: string; text: string } {
  const t = THEMES[c.theme] ?? THEMES.midnight;
  const site = ctx.siteUrl.replace(/\/$/, "");
  const r: R = { t, site, name: ctx.name, ctx };
  const subject = personalise(c.subject, ctx.name);
  const dateLabel = ctx.date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const sel = ctx.preview?.selectedId;
  const body = c.blocks
    .map((block) => {
      const html = renderBlock(r, block);
      if (!ctx.preview) return html;
      // Preview only: wrap each block so a click in the preview selects it in the editor.
      return `<tr><td data-bid="${escapeHtml(block.id)}" class="${block.id === sel ? "is-sel" : ""}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${html || `<tr><td style="padding:18px 32px;font:13px ${FONT};color:${t.muted};text-align:center">(empty ${block.type} block)</td></tr>`}</table></td></tr>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="${t.logo === "dark" ? "dark" : "light"}"><meta name="supported-color-schemes" content="${t.logo === "dark" ? "dark" : "light"}"><title>${escapeHtml(subject)}</title>
<style>
  body{margin:0;padding:0;background:${t.bg}}
  a{color:${t.accent}}
  @media (max-width:620px){
    .px{padding-left:18px!important;padding-right:18px!important}
    .h1{font-size:42px!important;letter-spacing:-1.5px!important}
    .col{max-width:100%!important}
    .stat{width:50%!important}
  }${ctx.preview ? `
  [data-bid]{cursor:pointer;outline-offset:-3px}
  [data-bid]:hover{outline:2px dashed ${t.accent}}
  [data-bid].is-sel{outline:3px solid ${t.accent}}
  [data-f]{border-radius:4px;outline:none}
  [data-f]:hover{background:rgba(127,127,127,.22);cursor:text}
  [data-f]:focus{background:rgba(127,127,127,.28);box-shadow:0 0 0 2px ${t.accent}}
  img[data-img]:hover{outline:3px dashed ${t.accent};outline-offset:-3px}
  img[data-img].is-drop{outline:4px solid ${t.accent};filter:brightness(1.2)}` : ""}
</style></head>
<body style="margin:0;padding:0;background:${t.bg}" bgcolor="${t.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${t.bg}">${escapeHtml(personalise(c.preheader, ctx.name))}${"&#8204;&nbsp;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${t.bg}" style="background:${t.bg}">
<tr><td align="center" style="padding:20px 10px 30px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
  <tr><td class="px" style="padding:4px 32px 22px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><a href="${escapeHtml(site)}/"><img src="${escapeHtml(site)}/brand/hackulator-logo-${t.logo}.png" width="120" alt="HACKULATOR" style="display:block;border:0;width:120px;height:auto;color:${t.heading};font:800 20px ${FONT}"></a></td>
      <td align="right" style="font:700 11px/1.5 ${MONO};letter-spacing:1.5px;color:${t.muted};text-transform:uppercase">The Weekly Drop <span style="color:${t.accent}">#${ctx.issueNumber}</span><br>${escapeHtml(dateLabel)}</td>
    </tr></table>
  </td></tr>
${body}
  <tr><td class="px" align="center" style="padding:14px 32px 0;font:13px/1.7 ${FONT};color:${t.muted}">
    <a href="${escapeHtml(site)}/" style="color:${t.text};text-decoration:none;font-weight:700">Website</a> &nbsp;·&nbsp;
    <a href="${escapeHtml(site)}/#build" style="color:${t.text};text-decoration:none;font-weight:700">Build yours</a> &nbsp;·&nbsp;
    <a href="${escapeHtml(site)}/my-spot" style="color:${t.text};text-decoration:none;font-weight:700">Check my spot</a>
  </td></tr>
  <tr><td class="px" align="center" style="padding:16px 40px 0;font:12px/1.7 ${FONT};color:${t.muted}">
    You're getting The Weekly Drop because you signed up at ${escapeHtml(site.replace(/^https?:\/\//, ""))}.
    <a href="${escapeHtml(ctx.unsubscribeUrl)}" style="color:${t.accent}">Unsubscribe</a> in one click.<br>
    Hackulator is an independent prototype project, still in development. Previews are mockups.
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    `HACKULATOR · THE WEEKLY DROP #${ctx.issueNumber} · ${dateLabel}`,
    ...c.blocks.map((block) => blockText(r, block)).filter(Boolean),
    "—",
    `Unsubscribe: ${ctx.unsubscribeUrl}`,
  ].join("\n\n");

  return { subject, html, text };
}

/* -------------------------------------------------------------- sanitising */

/** Clean and limit untrusted email content (used by the server before saving or sending). Older drafts are upgraded. */
export function sanitizeNewsletter(raw: unknown): NewsletterContent {
  const r = obj(raw);
  const L = NEWSLETTER_LIMITS;
  const theme = THEME_IDS.includes(r.theme as ThemeId) ? (r.theme as ThemeId) : "midnight";
  const rawBlocks = Array.isArray(r.blocks) ? r.blocks : upgradeV1(r);
  const seen = new Set<string>();
  const blocks = rawBlocks
    .slice(0, L.blocks)
    .map((x) => cleanBlock(obj(x)))
    .filter((x): x is EmailBlock => x !== null)
    .map((x) => {
      if (seen.has(x.id)) x.id = newBlockId();
      seen.add(x.id);
      return x;
    });
  return { version: 2, subject: str(r.subject, L.subject), preheader: str(r.preheader, L.preheader), theme, blocks };
}

function obj(v: unknown) {
  return (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
}
function str(v: unknown, max: number, multiline = false) {
  let s = String(v ?? "").replace(/\r\n/g, "\n");
  s = multiline ? s.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "") : s.replace(/[\u0000-\u001f\u007f]/g, " ");
  return s.trim().slice(0, max);
}
const pick = <T extends string>(v: unknown, options: readonly T[], fallback: T): T => (options.includes(v as T) ? (v as T) : fallback);

function cleanBlock(x: Record<string, unknown>): EmailBlock | null {
  const L = NEWSLETTER_LIMITS;
  const id = typeof x.id === "string" && /^[a-z0-9]{1,16}$/i.test(x.id) ? x.id : newBlockId();
  const s = (k: string, max: number = L.title) => str(x[k], max);
  const m = (k: string) => str(x[k], L.body, true);
  const url = (k: string) => str(x[k], L.url);
  switch (x.type) {
    case "hero":
      return { id, type: "hero", eyebrow: s("eyebrow", L.short), headline: s("headline"), accentLine: s("accentLine"), text: m("text"), buttonLabel: s("buttonLabel", L.label), buttonUrl: url("buttonUrl"), imageUrl: url("imageUrl"), align: pick(x.align, ["center", "left"] as const, "center") };
    case "image":
      return { id, type: "image", imageUrl: url("imageUrl"), linkUrl: url("linkUrl"), caption: s("caption"), width: pick(x.width, ["full", "inset"] as const, "inset") };
    case "text":
      return { id, type: "text", heading: s("heading"), body: m("body"), align: pick(x.align, ["left", "center"] as const, "left"), boxed: x.boxed === true };
    case "button":
      return { id, type: "button", label: s("label", L.label), url: url("url"), style: pick(x.style, ["solid", "outline"] as const, "solid") };
    case "stats":
      return { id, type: "stats", items: (Array.isArray(x.items) ? x.items : []).slice(0, L.stats).map((i) => ({ value: str(obj(i).value, 12), label: str(obj(i).label, 30) })) };
    case "waitlist":
      return { id, type: "waitlist", style: pick(x.style, ["accent", "surface"] as const, "accent") };
    case "feature":
      return { id, type: "feature", eyebrow: s("eyebrow", L.short), title: s("title"), body: m("body"), imageUrl: url("imageUrl"), imageSide: pick(x.imageSide, ["left", "right"] as const, "left"), buttonLabel: s("buttonLabel", L.label), buttonUrl: url("buttonUrl") };
    case "grid":
      return {
        id,
        type: "grid",
        columns: x.columns === 2 ? 2 : 3,
        items: (Array.isArray(x.items) ? x.items : []).slice(0, L.grid).map((i) => {
          const o = obj(i);
          return { imageUrl: str(o.imageUrl, L.url), title: str(o.title, L.title), body: str(o.body, 600, true), linkUrl: str(o.linkUrl, L.url) };
        }),
      };
    case "banner":
      return { id, type: "banner", kicker: s("kicker", L.short), text: s("text"), style: pick(x.style, ["accent", "surface", "outline"] as const, "accent") };
    case "quote":
      return { id, type: "quote", quote: str(x.quote, 600, true), who: s("who", L.short) };
    case "cta":
      return { id, type: "cta", headline: s("headline"), text: m("text"), buttonLabel: s("buttonLabel", L.label), buttonUrl: url("buttonUrl") };
    case "divider":
      return { id, type: "divider", style: pick(x.style, ["line", "dots", "space"] as const, "line") };
    default:
      return null;
  }
}

/** Drafts from the first version (fixed layout) become blocks. */
function upgradeV1(r: Record<string, unknown>): unknown[] {
  if (!("headline" in r) && !("sections" in r) && !("intro" in r)) return [];
  const out: unknown[] = [
    { type: "hero", eyebrow: r.eyebrow ?? "", headline: r.headline ?? r.subject ?? "", accentLine: r.headlineAccent ?? "", text: r.intro ?? "", buttonLabel: r.ctaLabel ?? "", buttonUrl: r.ctaUrl ?? "", imageUrl: r.imageUrl ?? "" },
  ];
  if (Array.isArray(r.highlights) && r.highlights.length) out.push({ type: "stats", items: r.highlights });
  if (r.showWaitlist !== false) out.push({ type: "waitlist" });
  (Array.isArray(r.sections) ? r.sections : []).forEach((s, i) => {
    const o = obj(s);
    out.push(o.imageUrl ? { type: "feature", eyebrow: String(i + 1).padStart(2, "0"), title: o.title, body: o.body, imageUrl: o.imageUrl, imageSide: i % 2 ? "right" : "left" } : { type: "text", heading: o.title, body: o.body, boxed: true });
  });
  if (r.closingHeadline || r.closingText) out.push({ type: "cta", headline: r.closingHeadline ?? "", text: r.closingText ?? "", buttonLabel: r.ctaLabel ?? "", buttonUrl: r.ctaUrl ?? "" });
  return out;
}

/* --------------------------------------------------------------- quick drop */

/** The fast way: a few answers become a fully designed email. */
export interface QuickDrop {
  theme: ThemeId;
  style: "hype" | "update" | "spotlight";
  headline: string;
  accentLine: string;
  intro: string;
  items: { title: string; text: string; imageUrl: string }[];
  showSpots: boolean;
  showNumbers: boolean;
  cta: "waitlist" | "build" | "demo" | "film" | "none";
}

export const QUICK_STYLES: { id: QuickDrop["style"]; label: string; hint: string }[] = [
  { id: "hype", label: "Hype", hint: "Big hero, features side by side" },
  { id: "update", label: "Update", hint: "Clean cards, easy to read" },
  { id: "spotlight", label: "Spotlight", hint: "Huge banner and picture cards" },
];

export const QUICK_CTAS: { id: QuickDrop["cta"]; label: string; url: string }[] = [
  { id: "waitlist", label: "Reserve my spot", url: "/#waitlist" },
  { id: "build", label: "Build yours", url: "/#build" },
  { id: "demo", label: "Play the demo", url: "/#games" },
  { id: "film", label: "Watch the film", url: "/#film" },
  { id: "none", label: "No button", url: "" },
];

export const QUICK_DEFAULT: QuickDrop = {
  theme: "midnight",
  style: "hype",
  headline: "This week on the bench.",
  accentLine: "",
  intro: "Hi {name}! Here's what's new with the Hackulator.",
  items: [
    { title: "", text: "", imageUrl: "" },
    { title: "", text: "", imageUrl: "" },
  ],
  showSpots: true,
  showNumbers: false,
  cta: "waitlist",
};

const DEFAULT_ART = ["/email/snake.png", "/email/2048.png", "/email/tetris.png", "/email/colours.png"];

export function buildQuickDrop(q: QuickDrop): NewsletterContent {
  const items = q.items.filter((i) => i.title.trim() || i.text.trim()).slice(0, 4);
  const cta = QUICK_CTAS.find((c) => c.id === q.cta) ?? QUICK_CTAS[0];
  const btn = cta.id === "none" ? { label: "", url: "" } : { label: cta.label, url: cta.url };
  const headline = q.headline.trim() || "This week on the bench.";
  const blocks: EmailBlock[] = [];
  const numbers = b("stats", { items: [{ value: "3", label: "games included" }, { value: "8", label: "cover colours" }, { value: "8", label: "cover icons" }, { value: "£5", label: "Custom UI" }] });

  if (q.style === "spotlight") {
    blocks.push(b("banner", { kicker: "The Weekly Drop", text: [headline, q.accentLine].filter((x) => x.trim()).join(" "), style: "accent" }));
    const lead = items.find((i) => i.imageUrl)?.imageUrl || "/email/hero.jpg";
    blocks.push(b("image", { imageUrl: lead, width: "inset", caption: "", linkUrl: btn.url }));
    if (q.intro.trim()) blocks.push(b("text", { heading: "", body: q.intro, align: "center" }));
    if (q.showNumbers) blocks.push(numbers);
    if (items.length) {
      blocks.push(
        b("grid", {
          columns: items.length === 2 || items.length === 4 ? 2 : 3,
          items: items.map((it, i) => ({ imageUrl: it.imageUrl || DEFAULT_ART[i % DEFAULT_ART.length], title: it.title, body: it.text, linkUrl: "" })),
        }),
      );
    }
    if (q.showSpots) blocks.push(b("waitlist", { style: "surface" }));
    if (btn.label) blocks.push(b("button", { label: btn.label, url: btn.url, style: "solid" }));
  } else if (q.style === "update") {
    blocks.push(b("hero", { eyebrow: "The Weekly Drop", headline, accentLine: q.accentLine, text: q.intro, buttonLabel: "", buttonUrl: "", imageUrl: "", align: "left" }));
    if (q.showNumbers) blocks.push(numbers);
    items.forEach((it, i) => {
      if (it.imageUrl) blocks.push(b("feature", { eyebrow: String(i + 1).padStart(2, "0"), title: it.title, body: it.text, imageUrl: it.imageUrl, imageSide: i % 2 ? "right" : "left" }));
      else blocks.push(b("text", { heading: it.title, body: it.text, boxed: true }));
    });
    if (q.showSpots) blocks.push(b("waitlist", { style: "surface" }));
    if (btn.label) blocks.push(b("cta", { headline: "Want one?", text: "Design yours and see the price as you go. No payment is taken on the site.", buttonLabel: btn.label, buttonUrl: btn.url }));
  } else {
    blocks.push(b("hero", { eyebrow: "The Weekly Drop", headline, accentLine: q.accentLine, text: q.intro, buttonLabel: btn.label, buttonUrl: btn.url, imageUrl: "/email/hero.jpg", align: "center" }));
    if (q.showNumbers) blocks.push(numbers);
    if (q.showSpots) blocks.push(b("waitlist", { style: "accent" }));
    items.forEach((it, i) =>
      blocks.push(
        b("feature", {
          eyebrow: String(i + 1).padStart(2, "0"),
          title: it.title,
          body: it.text,
          imageUrl: it.imageUrl || DEFAULT_ART[i % DEFAULT_ART.length],
          imageSide: i % 2 ? "right" : "left",
        }),
      ),
    );
    if (btn.label) blocks.push(b("cta", { headline: "Be one of the first.", text: "Joining the waitlist is free with no obligation to buy.", buttonLabel: btn.label, buttonUrl: btn.url }));
  }

  const first = items[0];
  return {
    version: 2,
    subject: `${[headline, q.accentLine].filter((x) => x.trim()).join(" ").replace(/[.!]+$/, "")}`,
    preheader: plainText(first ? [first.title, first.text].filter((x) => x.trim()).join(": ") : q.intro)
      .replace(/\{name\}/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 150),
    theme: q.theme,
    blocks,
  };
}

export function sanitizeQuickDrop(raw: unknown): QuickDrop {
  const r = obj(raw);
  const items = (Array.isArray(r.items) ? r.items : QUICK_DEFAULT.items).slice(0, 4).map((i) => {
    const o = obj(i);
    return { title: str(o.title, 100), text: str(o.text, 600, true), imageUrl: str(o.imageUrl, 500) };
  });
  return {
    theme: THEME_IDS.includes(r.theme as ThemeId) ? (r.theme as ThemeId) : QUICK_DEFAULT.theme,
    style: pick(r.style, ["hype", "update", "spotlight"] as const, QUICK_DEFAULT.style),
    headline: typeof r.headline === "string" ? str(r.headline, 80) : QUICK_DEFAULT.headline,
    accentLine: str(r.accentLine, 80),
    intro: typeof r.intro === "string" ? str(r.intro, 600, true) : QUICK_DEFAULT.intro,
    items,
    showSpots: r.showSpots !== false,
    showNumbers: r.showNumbers === true,
    cta: pick(r.cta, ["waitlist", "build", "demo", "film", "none"] as const, QUICK_DEFAULT.cta),
  };
}
