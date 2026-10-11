"use client";

import { useEffect } from "react";

/**
 * Page-wide scroll effects for the homepage. Everything is progressive: without
 * JavaScript, or with reduced motion, all content is simply visible.
 *
 * - `[data-reveal]` elements fade/slide in once when they reach the viewport.
 * - `[data-fill]` blocks light up their `.fill-word` children as they scroll past.
 * - `--scroll` (0–1) on <html> drives the progress bar; `--hero` (0–1) the hero parallax.
 */
export function ScrollFx() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce) return;

    // Anything at or above 88% of the viewport is revealed, so fast scrolls and jumps never skip one.
    let pending = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    root.classList.add("fx");

    const fills = Array.from(document.querySelectorAll<HTMLElement>("[data-fill]")).map((el) => ({
      el,
      words: Array.from(el.querySelectorAll<HTMLElement>(".fill-word")),
      lit: -1,
    }));
    const hero = document.getElementById("top");

    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight || 1;
      if (pending.length) {
        pending = pending.filter((el) => {
          if (el.getBoundingClientRect().top > vh * 0.88) return true;
          el.classList.add("is-in");
          return false;
        });
      }
      const max = root.scrollHeight - vh;
      root.style.setProperty("--scroll", String(max > 0 ? Math.min(1, window.scrollY / max) : 0));
      if (hero) {
        const h = hero.offsetHeight || 1;
        root.style.setProperty("--hero", String(Math.min(1, Math.max(0, window.scrollY / h))));
      }
      for (const f of fills) {
        const r = f.el.getBoundingClientRect();
        // 0 when the block's top reaches 85% of the viewport, 1 when its bottom reaches 40%.
        const start = vh * 0.85;
        const end = vh * 0.4;
        const p = Math.min(1, Math.max(0, (start - r.top) / (start - end + r.height)));
        const lit = Math.round(p * f.words.length);
        if (lit !== f.lit) {
          f.words.forEach((w, i) => w.classList.toggle("is-lit", i < lit));
          f.lit = lit;
        }
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      root.classList.remove("fx");
    };
  }, []);

  return (
    <div className="scroll-progress" aria-hidden="true">
      <span />
    </div>
  );
}

/** Splits a sentence into words that light up one by one as the block scrolls past. */
export function FillText({ text, className }: { text: string; className?: string }) {
  return (
    <p className={className} data-fill>
      {text.split(" ").map((w, i) => (
        <span className="fill-word" key={i}>
          {w}{" "}
        </span>
      ))}
    </p>
  );
}

/** Endless ticker band. Decorative: the same words appear in the page content. */
export function Marquee({ items }: { items: string[] }) {
  const row = (
    <div className="marquee__row">
      {items.map((t) => (
        <span className="marquee__item" key={t}>
          {t}
          <span className="marquee__star">✦</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {row}
        {row}
      </div>
    </div>
  );
}
