"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { SCREEN_H, SCREEN_W } from "@/lib/hackos/theme";

/**
 * Crisp canvas for the Hackulator display. `draw` receives a context already
 * scaled to the 320×120 logical screen. With `animate`, it redraws every frame
 * and calls `onFrame(dt)` first; otherwise it redraws when `draw` changes.
 */
export function ScreenCanvas({
  draw,
  animate = false,
  onFrame,
  className,
  label,
}: {
  draw: (ctx: CanvasRenderingContext2D) => void;
  animate?: boolean;
  onFrame?: (dtMs: number) => void;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  const frameRef = useRef(onFrame);
  useLayoutEffect(() => {
    drawRef.current = draw;
    frameRef.current = onFrame;
  });

  const paint = () => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.max(1, Math.round(c.clientWidth * dpr));
    const h = Math.max(1, Math.round(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    ctx.setTransform(w / SCREEN_W, 0, 0, h / SCREEN_H, 0, 0);
    ctx.textBaseline = "alphabetic";
    drawRef.current(ctx);
  };

  // Resize-aware static redraw.
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    paint();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => paint());
    ro.observe(c);
    return () => ro.disconnect();
  });

  // Animation loop only while requested.
  useEffect(() => {
    if (!animate) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      frameRef.current?.(dt);
      paint();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  return <canvas ref={ref} className={className} role="img" aria-label={label ?? "Hackulator display"} />;
}
