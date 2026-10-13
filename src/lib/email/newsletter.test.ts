import { describe, expect, it } from "vitest";
import { STARTER_NEWSLETTER, renderNewsletter, renderRichText, sanitizeNewsletter } from "./newsletter";

const ctx = { siteUrl: "https://example.com", unsubscribeUrl: "https://example.com/unsubscribe?t=abc", issueNumber: 7, date: new Date("2026-10-13T12:00:00Z") };

describe("weekly email template", () => {
  it("escapes everything and only allows http(s) or site links", () => {
    const html = renderRichText('<script>alert(1)</script> **hi** [ok](https://a.com) [bad](javascript:alert(1)) [site](/#build)', "https://example.com");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<strong");
    expect(html).toContain('href="https://a.com"');
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="https://example.com/#build"');
  });

  it("turns dash lines into bullets and blank lines into paragraphs", () => {
    const html = renderRichText("Para one\n\n- a\n- b\n\nPara two", "https://example.com");
    expect(html.match(/<p /g)).toHaveLength(2);
    expect(html.match(/<li /g)).toHaveLength(2);
  });

  it("personalises, numbers the issue and always has an unsubscribe link", () => {
    const m = renderNewsletter({ ...STARTER_NEWSLETTER, subject: "Hey {name}" }, { ...ctx, name: "Ada", waitlist: { spots: 10, left: 3, open: true } });
    expect(m.subject).toBe("Hey Ada");
    expect(m.html).toContain("Issue #7");
    expect(m.html).toContain("3 of 10 spots left");
    expect(m.html).toContain("https://example.com/unsubscribe?t=abc");
    expect(m.text).toContain("Unsubscribe: https://example.com/unsubscribe?t=abc");
    expect(renderNewsletter({ ...STARTER_NEWSLETTER, subject: "Hey {name}" }, ctx).subject).toBe("Hey there");
  });

  it("hides the waitlist block when switched off and drops unsafe images and buttons", () => {
    const m = renderNewsletter({ ...STARTER_NEWSLETTER, showWaitlist: false, imageUrl: "javascript:x", ctaUrl: "javascript:y" }, { ...ctx, waitlist: { spots: 10, left: 3, open: true } });
    expect(m.html).not.toContain("spots left");
    expect(m.html).not.toContain("javascript:");
  });

  it("cleans untrusted content", () => {
    const c = sanitizeNewsletter({ subject: "x".repeat(500), sections: Array.from({ length: 20 }, () => ({ title: "t", body: "b" })), showWaitlist: "no" });
    expect(c.subject.length).toBe(120);
    expect(c.sections).toHaveLength(6);
    expect(c.showWaitlist).toBe(true);
    expect(sanitizeNewsletter(null).sections).toEqual([]);
  });
});
