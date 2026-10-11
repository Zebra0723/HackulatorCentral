import type { HKey } from "../keys";
import { SCREEN_H, SCREEN_W, type ScreenTheme } from "../theme";
import type { GameSim, Rand } from "./types";

export const WELL_W = 10;
export const WELL_H = 20;
const CELL = 6;

// Original piece definitions (the seven tetromino shapes).
const SHAPES: number[][][] = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 1, 0], [0, 1, 1]],
];
const COLOURS = ["#4fb3ff", "#e8c35a", "#a98bff", "#3f7fd8", "#ff8a3d", "#b4e23c", "#ff5f6d"];

export interface Piece { shape: number[][]; kind: number; x: number; y: number }

export function rotate(shape: number[][]): number[][] {
  const h = shape.length, w = shape[0].length;
  return Array.from({ length: w }, (_, x) => Array.from({ length: h }, (_, y) => shape[h - 1 - y][x]));
}

export class Tetris implements GameSim {
  readonly id = "tetris";
  readonly title = "Tetris";
  readonly controls = "←/→ move · ↑ rotate · ↓ drop · OK pause";
  score = 0;
  lines = 0;
  over = false;
  well: number[][] = [];
  piece!: Piece;
  next = 0;
  private acc = 0;

  constructor(private rand: Rand = Math.random) {
    this.reset();
  }

  get level() {
    return 1 + Math.floor(this.lines / 10);
  }

  private interval() {
    return Math.max(90, 650 - (this.level - 1) * 60);
  }

  reset() {
    this.well = Array.from({ length: WELL_H }, () => Array(WELL_W).fill(0));
    this.score = 0;
    this.lines = 0;
    this.over = false;
    this.acc = 0;
    this.next = this.pick();
    this.spawn();
  }

  private pick() {
    return Math.floor(this.rand() * SHAPES.length);
  }

  private spawn() {
    const kind = this.next;
    this.next = this.pick();
    const shape = SHAPES[kind];
    this.piece = { shape, kind, x: Math.floor((WELL_W - shape[0].length) / 2), y: 0 };
    if (this.collides(this.piece)) this.over = true;
  }

  collides(p: Piece): boolean {
    for (let y = 0; y < p.shape.length; y++)
      for (let x = 0; x < p.shape[y].length; x++) {
        if (!p.shape[y][x]) continue;
        const wx = p.x + x, wy = p.y + y;
        if (wx < 0 || wx >= WELL_W || wy >= WELL_H) return true;
        if (wy >= 0 && this.well[wy][wx]) return true;
      }
    return false;
  }

  private lock() {
    const p = this.piece;
    p.shape.forEach((row, y) => row.forEach((v, x) => v && p.y + y >= 0 && (this.well[p.y + y][p.x + x] = p.kind + 1)));
    const kept = this.well.filter((row) => row.some((v) => v === 0));
    const cleared = WELL_H - kept.length;
    while (kept.length < WELL_H) kept.unshift(Array(WELL_W).fill(0));
    this.well = kept;
    if (cleared) {
      this.lines += cleared;
      this.score += [0, 100, 300, 500, 800][cleared] * this.level;
    }
    this.spawn();
  }

  private tryMove(dx: number, dy: number): boolean {
    const moved = { ...this.piece, x: this.piece.x + dx, y: this.piece.y + dy };
    if (this.collides(moved)) return false;
    this.piece = moved;
    return true;
  }

  drop() {
    if (!this.tryMove(0, 1)) this.lock();
  }

  key(k: HKey) {
    if (this.over) return;
    if (k === "LEFT") this.tryMove(-1, 0);
    else if (k === "RIGHT") this.tryMove(1, 0);
    else if (k === "DOWN") {
      this.drop();
      this.acc = 0;
    } else if (k === "UP") {
      const r = { ...this.piece, shape: rotate(this.piece.shape) };
      for (const kick of [0, -1, 1, -2, 2]) {
        const c = { ...r, x: r.x + kick };
        if (!this.collides(c)) {
          this.piece = c;
          break;
        }
      }
    }
  }

  tick(dt: number) {
    if (this.over) return;
    this.acc += dt;
    while (this.acc >= this.interval() && !this.over) {
      this.acc -= this.interval();
      this.drop();
    }
  }

  draw(ctx: CanvasRenderingContext2D, t: ScreenTheme) {
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const ox = Math.round((SCREEN_W - WELL_W * CELL) / 2);
    ctx.fillStyle = t.panel;
    ctx.fillRect(ox, 0, WELL_W * CELL, WELL_H * CELL);
    const cell = (x: number, y: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(ox + x * CELL + 0.5, y * CELL + 0.5, CELL - 1, CELL - 1);
    };
    this.well.forEach((row, y) => row.forEach((v, x) => v && cell(x, y, COLOURS[v - 1])));
    const p = this.piece;
    p.shape.forEach((row, y) => row.forEach((v, x) => v && cell(p.x + x, p.y + y, COLOURS[p.kind])));
    ctx.fillStyle = t.dim;
    ctx.font = `600 8px ${t.font}`;
    ctx.fillText("SCORE", 14, 20);
    ctx.fillText("LINES", 14, 54);
    ctx.fillText("NEXT", ox + WELL_W * CELL + 16, 20);
    ctx.fillStyle = t.text;
    ctx.font = `700 13px ${t.font}`;
    ctx.fillText(String(this.score), 14, 35);
    ctx.fillText(String(this.lines), 14, 69);
    SHAPES[this.next].forEach((row, y) =>
      row.forEach((v, x) => {
        if (!v) return;
        ctx.fillStyle = COLOURS[this.next];
        ctx.fillRect(ox + WELL_W * CELL + 16 + x * 7, 28 + y * 7, 6, 6);
      }),
    );
  }
}
