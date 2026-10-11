import { fillRound, mixHex } from "../draw";
import type { HKey } from "../keys";
import { SCREEN_H, SCREEN_W, type ScreenTheme } from "../theme";
import type { GameSim, Rand } from "./types";

type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";
interface P { x: number; y: number }
const VEC: Record<Dir, P> = { UP: { x: 0, y: -1 }, DOWN: { x: 0, y: 1 }, LEFT: { x: -1, y: 0 }, RIGHT: { x: 1, y: 0 } };
const OPP: Record<Dir, Dir> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };

export const SNAKE_COLS = 32;
export const SNAKE_ROWS = 12;
const CELL = 10;
const STEP_MS = 140;

export class Snake implements GameSim {
  readonly id = "snake";
  readonly title = "Snake";
  readonly controls = "Arrows steer · edges wrap round · OK pause · AC restart";
  /** Best score this visit (not stored anywhere). */
  static best = 0;
  score = 0;
  over = false;
  body: P[] = [];
  dir: Dir = "RIGHT";
  queue: Dir[] = [];
  food: P = { x: 0, y: 0 };
  private acc = 0;
  private time = 0;

  constructor(private rand: Rand = Math.random, public cols = SNAKE_COLS, public rows = SNAKE_ROWS) {
    this.reset();
  }

  reset() {
    const y = Math.floor(this.rows / 2);
    const x = Math.floor(this.cols / 3);
    this.body = [{ x, y }, { x: x - 1, y }, { x: x - 2, y }];
    this.dir = "RIGHT";
    this.queue = [];
    this.score = 0;
    this.over = false;
    this.acc = 0;
    this.placeFood();
  }

  private placeFood() {
    const free: P[] = [];
    for (let y = 0; y < this.rows; y++)
      for (let x = 0; x < this.cols; x++) if (!this.body.some((p) => p.x === x && p.y === y)) free.push({ x, y });
    this.food = free[Math.floor(this.rand() * free.length)] ?? { x: -1, y: -1 };
  }

  key(k: HKey) {
    if (k === "UP" || k === "DOWN" || k === "LEFT" || k === "RIGHT") {
      const last = this.queue[this.queue.length - 1] ?? this.dir;
      if (k !== last && k !== OPP[last] && this.queue.length < 2) this.queue.push(k);
    }
  }

  step() {
    if (this.over) return;
    const next = this.queue.shift();
    if (next) this.dir = next;
    // Walls wrap round to the opposite side; only running into yourself ends the game.
    const head = {
      x: (this.body[0].x + VEC[this.dir].x + this.cols) % this.cols,
      y: (this.body[0].y + VEC[this.dir].y + this.rows) % this.rows,
    };
    const eats = head.x === this.food.x && head.y === this.food.y;
    const rest = eats ? this.body : this.body.slice(0, -1);
    if (rest.some((p) => p.x === head.x && p.y === head.y)) {
      this.over = true;
      return;
    }
    this.body = [head, ...rest];
    if (eats) {
      this.score++;
      Snake.best = Math.max(Snake.best, this.score);
      this.placeFood();
    }
  }

  tick(dt: number) {
    this.time += dt;
    this.acc += dt;
    while (this.acc >= STEP_MS) {
      this.acc -= STEP_MS;
      this.step();
    }
  }

  draw(ctx: CanvasRenderingContext2D, t: ScreenTheme) {
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    // Soft checkerboard
    ctx.fillStyle = t.panel;
    ctx.globalAlpha = 0.55;
    for (let y = 0; y < this.rows; y++) for (let x = y % 2; x < this.cols; x += 2) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    ctx.globalAlpha = 1;

    // Food: a pulsing apple
    if (this.food.x >= 0) {
      const cx = this.food.x * CELL + CELL / 2;
      const cy = this.food.y * CELL + CELL / 2 + 0.5;
      const pulse = 1 + Math.sin(this.time / 160) * 0.12;
      ctx.fillStyle = "#ff5d5d";
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(cx, cy, 5.2 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = t.accent;
      ctx.fillRect(cx + 0.3, cy - 5, 1.6, 2.2);
    }

    // Body: rounded segments joined to their neighbours (not across a wrap), fading towards the tail
    const n = this.body.length;
    for (let i = n - 1; i >= 0; i--) {
      const p = this.body[i];
      ctx.fillStyle = i === 0 && this.over ? "#ff5d5d" : mixHex(t.accent, t.bg, (0.45 * i) / Math.max(1, n - 1));
      fillRound(ctx, p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2, i === 0 ? 4 : 3);
      const q = this.body[i - 1];
      if (q && Math.abs(q.x - p.x) + Math.abs(q.y - p.y) === 1) {
        const x = Math.min(p.x, q.x) * CELL + (p.y === q.y ? CELL / 2 : 1);
        const y = Math.min(p.y, q.y) * CELL + (p.x === q.x ? CELL / 2 : 1);
        ctx.fillRect(x, y, p.y === q.y ? CELL : CELL - 2, p.x === q.x ? CELL : CELL - 2);
      }
    }

    // Eyes, looking where the snake is heading
    const h = this.body[0];
    if (h) {
      const v = VEC[this.dir];
      const cx = h.x * CELL + CELL / 2 + v.x * 1.5;
      const cy = h.y * CELL + CELL / 2 + v.y * 1.5;
      ctx.fillStyle = t.onAccent;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(cx + v.y * 2.2 * s, cy + v.x * 2.2 * s, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Score pill
    const label = `${this.score}${Snake.best > 0 ? `  ·  BEST ${Snake.best}` : ""}`;
    ctx.font = `700 8px ${t.font}`;
    const w = ctx.measureText(label).width + 12;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    fillRound(ctx, SCREEN_W - w - 4, 3, w, 12, 6);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "right";
    ctx.fillText(label, SCREEN_W - 10, 12);
    ctx.textAlign = "left";
  }
}
