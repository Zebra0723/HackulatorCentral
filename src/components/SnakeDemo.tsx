"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { newGame, step, turn, type Dir, type SnakeState } from "@/lib/snake";
import { ArrowIcon } from "./icons";

const SIZE = 15;
const CELL = 20;
const TICK_MS = 140;

type Mode = "ready" | "running" | "paused" | "over";

const KEYS: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

function draw(ctx: CanvasRenderingContext2D, g: SnakeState) {
  const px = SIZE * CELL;
  ctx.fillStyle = "#10140a";
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = "#161b0f";
  for (let y = 0; y < SIZE; y++) for (let x = (y % 2); x < SIZE; x += 2) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
  ctx.fillStyle = "#e8c35a";
  ctx.fillRect(g.food.x * CELL + 5, g.food.y * CELL + 5, CELL - 10, CELL - 10);
  g.snake.forEach((p, i) => {
    ctx.fillStyle = i === 0 ? "#d4f57a" : "#b4e23c";
    ctx.fillRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2);
  });
}

/** Small playable web demo. Runs in the browser; says nothing about hardware performance. */
export function SnakeDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const game = useRef<SnakeState>(newGame(SIZE));
  const [mode, setMode] = useState<Mode>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const render = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) draw(ctx, game.current);
  }, []);

  useEffect(render, [render]);

  // Game loop only while running.
  useEffect(() => {
    if (mode !== "running") return;
    const id = window.setInterval(() => {
      game.current = step(game.current);
      setScore(game.current.score);
      render();
      if (game.current.over) {
        setBest((b) => Math.max(b, game.current.score));
        setMode("over");
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [mode, render]);

  // Pause when scrolled away or the tab is hidden.
  useEffect(() => {
    if (mode !== "running") return;
    const pause = () => setMode((m) => (m === "running" ? "paused" : m));
    const onVis = () => document.hidden && pause();
    document.addEventListener("visibilitychange", onVis);
    let io: IntersectionObserver | undefined;
    if (wrapRef.current && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(([e]) => !e.isIntersecting && pause(), { threshold: 0 });
      io.observe(wrapRef.current);
    }
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      io?.disconnect();
    };
  }, [mode]);

  const start = () => {
    if (mode === "over" || mode === "ready") {
      game.current = newGame(SIZE);
      setScore(0);
      render();
    }
    setMode("running");
    wrapRef.current?.focus({ preventScroll: true });
  };

  const steer = (d: Dir) => {
    if (mode !== "running") return;
    game.current = turn(game.current, d);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const d = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
    if (d && mode === "running") {
      e.preventDefault();
      steer(d);
    } else if (e.key === " " || e.key === "Enter") {
      if (e.target !== wrapRef.current) return;
      e.preventDefault();
      if (mode === "running") setMode("paused");
      else start();
    }
  };

  const label =
    mode === "ready" ? "Play Snake" : mode === "paused" ? "Resume" : mode === "over" ? "Play again" : null;

  return (
    <div className="snake">
      <div
        ref={wrapRef}
        className="snake__canvas-wrap"
        tabIndex={0}
        role="application"
        aria-roledescription="game"
        aria-label="Snake web demo. Press Enter or Space to start or pause; arrow keys or W A S D to steer."
        onKeyDown={onKeyDown}
        onTouchStart={(e) => {
          const t = e.touches[0];
          touchStart.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          const s = touchStart.current;
          const t = e.changedTouches[0];
          if (!s) return;
          const dx = t.clientX - s.x;
          const dy = t.clientY - s.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
          steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
        }}
      >
        <canvas ref={canvasRef} width={SIZE * CELL} height={SIZE * CELL} aria-hidden="true" />
        {label && (
          <div className="snake__overlay">
            {mode === "over" && <p style={{ margin: 0 }}>Game over · score {score}</p>}
            <button type="button" className="btn btn-sm btn-primary" onClick={start}>
              {label}
            </button>
            <p className="small" style={{ margin: 0, color: "var(--night-muted)" }}>
              Arrow keys, WASD, swipe or the pad below
            </p>
          </div>
        )}
      </div>
      <p className="visually-hidden" aria-live="polite">
        {mode === "over" ? `Game over. Score ${score}.` : ""}
      </p>
      <div className="snake__hud">
        <span>Score {score}</span>
        <span>Best {best}</span>
      </div>
      <div className="snake__pad" aria-label="Direction controls" role="group">
        {(["up", "left", "down", "right"] as const).map((d) => (
          <button key={d} type="button" className={d} onClick={() => steer(d)} aria-label={d} disabled={mode !== "running"}>
            <ArrowIcon dir={d} width={18} height={18} />
          </button>
        ))}
      </div>
    </div>
  );
}
