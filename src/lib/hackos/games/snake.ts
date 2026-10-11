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
  readonly controls = "Arrows steer · OK pause · AC restart";
  score = 0;
  over = false;
  body: P[] = [];
  dir: Dir = "RIGHT";
  queue: Dir[] = [];
  food: P = { x: 0, y: 0 };
  private acc = 0;

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
    const head = { x: this.body[0].x + VEC[this.dir].x, y: this.body[0].y + VEC[this.dir].y };
    const eats = head.x === this.food.x && head.y === this.food.y;
    const rest = eats ? this.body : this.body.slice(0, -1);
    if (head.x < 0 || head.y < 0 || head.x >= this.cols || head.y >= this.rows || rest.some((p) => p.x === head.x && p.y === head.y)) {
      this.over = true;
      return;
    }
    this.body = [head, ...rest];
    if (eats) {
      this.score++;
      this.placeFood();
    }
  }

  tick(dt: number) {
    this.acc += dt;
    while (this.acc >= STEP_MS) {
      this.acc -= STEP_MS;
      this.step();
    }
  }

  draw(ctx: CanvasRenderingContext2D, t: ScreenTheme) {
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.fillStyle = t.panel;
    for (let y = 0; y < this.rows; y++) for (let x = (y % 2); x < this.cols; x += 2) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    ctx.fillStyle = "#e8c35a";
    ctx.fillRect(this.food.x * CELL + 2, this.food.y * CELL + 2, CELL - 4, CELL - 4);
    this.body.forEach((p, i) => {
      ctx.fillStyle = t.accent;
      ctx.globalAlpha = i === 0 ? 1 : 0.85;
      ctx.fillRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2);
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = t.text;
    ctx.font = `600 9px ${t.font}`;
    ctx.textAlign = "right";
    ctx.fillText(String(this.score), SCREEN_W - 4, 10);
    ctx.textAlign = "left";
  }
}
