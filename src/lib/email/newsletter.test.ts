import { describe, expect, it } from "vitest";
import { BLOCK_LIBRARY, NEWSLETTER_PRESETS, QUICK_DEFAULT, THEMES, buildQuickDrop, createBlock, renderNewsletter, renderRichText, sanitizeNewsletter, sanitizeQuickDrop, type NewsletterContent } from "./newsletter";

const ctx = { siteUrl: "https://example.com", unsubscribeUrl: "https://example.com/unsubscribe?t=abc", issueNumber: 7, date: new Date("2026-10-13T12:00:00Z") };
const rt = (s: string) => renderRichText(s, "https://example.com", { color: "#fff", strong: "#fff", link: "#0f0" });

describe("weekly email builder", () => {
  it("escapes everything and only allows http(s) or site links", () => {
    const html = rt('<script>alert(1)</script> **hi** [ok](https://a.com) [bad](javascript:alert(1)) [site](/#build)');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<strong");
    expect(html).toContain('href="https://a.com"');
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="https://example.com/#build"');
  });

  it("turns dash lines into bullets and blank lines into paragraphs", () => {
    const html = rt("Para one\n\n- a\n- b\n\nPara two");
    expect(html.match(/<p /g)).toHaveLength(2);
    expect(html.match(/<li /g)).toHaveLength(2);
  });

  it("renders every template in every theme, personalised, with an unsubscribe link", () => {
    for (const preset of NEWSLETTER_PRESETS) {
      for (const theme of Object.keys(THEMES) as (keyof typeof THEMES)[]) {
        const doc = { ...preset.build(), theme };
        const m = renderNewsletter(doc, { ...ctx, name: "Ada", waitlist: { spots: 10, left: 3, open: true } });
        expect(m.html).toContain("https://example.com/unsubscribe?t=abc");
        expect(m.text).toContain("Unsubscribe: https://example.com/unsubscribe?t=abc");
        expect(m.html).toContain(THEMES[theme].bg);
        expect(m.html).toMatch(/#7</);
        expect(m.html).not.toContain("{name}");
      }
    }
    const launch = renderNewsletter(NEWSLETTER_PRESETS[0].build(), { ...ctx, name: "Ada", waitlist: { spots: 10, left: 3, open: true } });
    expect(launch.html).toContain("Hi Ada!");
    expect(launch.html).toContain("of 10 spots left in the first batch");
    expect(launch.text).toContain("3 of 10 spots left");
    expect(launch.html).toContain("https://example.com/email/hero.jpg");
  });

  it("renders every kind of block, and drops unsafe pictures and links", () => {
    const blocks = BLOCK_LIBRARY.map((b) => createBlock(b.type));
    const doc: NewsletterContent = { version: 2, subject: "s", preheader: "", theme: "arcade", blocks };
    const m = renderNewsletter(doc, { ...ctx, waitlist: { spots: 10, left: 3, open: true } });
    expect(m.html).toContain("Big news.");
    expect(m.html).toContain("Something big.");
    expect(m.html).toContain("coolest calculator");
    const bad = renderNewsletter(
      { ...doc, blocks: [{ ...createBlock("image"), imageUrl: "javascript:x" } as never, { ...createBlock("button"), url: "javascript:y" } as never] },
      ctx,
    );
    expect(bad.html).not.toContain("javascript:");
  });

  it("tags blocks, editable text and pictures only in the editor preview", () => {
    const doc = NEWSLETTER_PRESETS[0].build();
    const sent = renderNewsletter(doc, ctx).html;
    expect(sent).not.toMatch(/data-(bid|f|img)=/);
    const preview = renderNewsletter(doc, { ...ctx, preview: {} }).html;
    expect(preview).toContain(`data-bid="${doc.blocks[0].id}"`);
    expect(preview).toContain('<span data-f="headline">Meet the</span>');
    expect(preview).toContain('data-img="imageUrl"');
    expect(preview).toContain('data-img="items.1.imageUrl"');
    // Text with {name} isn't editable in place (it would bake the preview name in).
    expect(preview).toContain('<span data-f="text">Your calculator. Upgraded.</span>');
    expect(preview).toContain("Hi there!");
    expect(preview).not.toMatch(/data-f="[^"]*">Hi there/);
  });

  it("has an introduction template that stays honest about the prototype", () => {
    const intro = NEWSLETTER_PRESETS.find((p) => p.id === "intro")!.build();
    const m = renderNewsletter(intro, { ...ctx, name: "Ada", waitlist: { spots: 10, left: 9, open: true } });
    expect(m.subject).toBe("Meet the Hackulator");
    expect(m.text).toContain("prototype in development");
    expect(m.text).toContain("no obligation to buy");
    expect(m.html).toContain("https://example.com/#build");
    expect(m.html).toContain("https://example.com/email/film.jpg");
  });

  it("Quick Drop turns a few answers into a full email in every style", () => {
    const q = { ...QUICK_DEFAULT, headline: "New screen!", items: [{ title: "Colour display", text: "It **works**.", imageUrl: "" }, { title: "", text: "", imageUrl: "" }] };
    for (const style of ["hype", "update", "spotlight"] as const) {
      const doc = buildQuickDrop({ ...q, style });
      expect(doc.subject.startsWith("New screen")).toBe(true);
      expect(doc.preheader).toBe("Colour display: It works.");
      expect(doc.blocks.some((b) => b.type === "waitlist")).toBe(true);
      const m = renderNewsletter(doc, { ...ctx, waitlist: { spots: 10, left: 4, open: true } });
      expect(m.html).toContain("Colour display");
      expect(m.html).toContain("https://example.com/#waitlist");
    }
    const bare = buildQuickDrop({ ...q, showSpots: false, cta: "none", items: [] });
    expect(bare.blocks.map((b) => b.type)).toEqual(["hero"]);
    expect(sanitizeQuickDrop({ theme: "bad", style: "x", items: Array(9).fill({ title: "t" }) })).toMatchObject({ theme: "midnight", style: "hype" });
    expect(sanitizeQuickDrop({ items: Array(9).fill({ title: "t" }) }).items).toHaveLength(4);
  });

  it("cleans untrusted content and upgrades drafts from the first version", () => {
    const c = sanitizeNewsletter({ subject: "x".repeat(500), theme: "nope", blocks: [...Array(40)].map(() => ({ type: "text", body: "b" })).concat([{ type: "evil" } as never]) });
    expect(c.subject.length).toBe(120);
    expect(c.theme).toBe("midnight");
    expect(c.blocks).toHaveLength(30);
    expect(new Set(c.blocks.map((b) => b.id)).size).toBe(30);
    expect(sanitizeNewsletter(null).blocks).toEqual([]);

    const old = sanitizeNewsletter({ subject: "s", headline: "Hi", intro: "Hello", sections: [{ title: "t", body: "b", imageUrl: "/email/snake.png" }, { title: "u", body: "c" }], ctaLabel: "Go", ctaUrl: "/#build", closingHeadline: "Bye" });
    expect(old.blocks.map((b) => b.type)).toEqual(["hero", "waitlist", "feature", "text", "cta"]);
  });
});
