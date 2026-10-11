import { getBest } from "../bests";
import { fillRound, mixHex } from "../draw";
import { Fx } from "../fx";
import type { HKey } from "../keys";
import { SCREEN_H, SCREEN_W, type ScreenTheme } from "../theme";
import type { GameSim, Rand } from "./types";

export const WELL_W = 10;
export const WELL_H = 20;
const CELL = 6;
/** How long a piece may rest on the stack before it locks, and how many moves can extend that. */
export const LOCK_MS = 450;
const LOCK_RESETS = 12;
const CLEAR_NAMES = ["", "SINGLE", "DOUBLE", "TRIPLE", "TETRIS!"];
const CLEAR_POINTS = [0, 100, 300, 500, 800];

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
const COLOURS = ["#4fd1ff", "#ffd23f", "#b388ff", "#4f7dff", "#ff9a3d", "#8be04e", "#ff5f6d"];

export interface Piece { shape: number[][]; kind: number; x: number; y: number }

export function rotate(shape: number[][]): number[][] {
  const h = shape.length, w = shape[0].length;
  return Array.from({ length: w }, (_, x) => Array.from({ length: h }, (_, y) => shape[h - 1 - y][x]));
}

export class Tetris implements GameSim {
  readonly id = "tetris";
  readonly title = "Tetris";
  readonly controls = "←/→ move · ↑ rotate · ↓ soft drop · = / EXE hard drop · OK pause";
  readonly ownKeys = ["EXE"] as const;
  readonly swipe = { DOWN: "EXE" } as const;
  readonly tap = "UP" as const;
  readonly action = { label: "Hard drop", key: "EXE" } as const;
  readonly repeatKeys = ["LEFT", "RIGHT", "DOWN"] as const;
  score = 0;
  lines = 0;
  over = false;
  well: number[][] = [];
  piece!: Piece;
  queue: number[] = [];
  fx = new Fx();
  private bag: number[] = [];
  private acc = 0;
  private lockT = 0;
  private lockResets = 0;
  private clearFx: { rows: number[]; t: number } | null = null;
  private lockFlash: { cells: [number, number][]; t: number } | null = null;
  private overT = 0;

  constructor(private rand: Rand = Math.random) {
    this.reset();
  }

  get level() {
    return 1 + Math.floor(this.lines / 10);
  }

  /** Next piece kind (kept for compatibility). */
  get next() {
    return this.queue[0];
  }

  private interval() {
    return Math.max(70, 700 * Math.pow(0.82, this.level - 1));
  }

  reset() {
    this.well = Array.from({ length: WELL_H }, () => Array(WELL_W).fill(0));
    this.score = 0;
    this.lines = 0;
    this.over = false;
    this.acc = 0;
    this.lockT = 0;
    this.lockResets = 0;
    this.clearFx = null;
    this.lockFlash = null;
    this.overT = 0;
    this.bag = [];
    this.queue = [];
    this.fx.clear();
    this.fillQueue();
    this.spawn();
  }

  /** "7-bag": every run of seven pieces contains each shape once. */
  private fillQueue() {
    while (this.queue.length < 4) {
      if (!this.bag.length) {
        this.bag = [0, 1, 2, 3, 4, 5, 6];
        for (let i = this.bag.length - 1; i > 0; i--) {
          const j = Math.floor(this.rand() * (i + 1));
          [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
        }
      }
      this.queue.push(this.bag.shift()!);
    }
  }

  /** Replace the falling piece (used by tests). */
  setPiece(kind: number) {
    const shape = SHAPES[kind];
    this.piece = { shape, kind, x: Math.floor((WELL_W - shape[0].length) / 2), y: 0 };
  }

  private spawn() {
    this.fillQueue();
    const kind = this.queue.shift()!;
    this.fillQueue();
    this.setPiece(kind);
    this.lockT = 0;
    this.lockResets = 0;
    this.acc = 0;
    if (this.collides(this.piece)) {
      this.over = true;
      this.overT = 0;
      this.fx.shake(2.4, 300);
    }
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

  private grounded() {
    return this.collides({ ...this.piece, y: this.piece.y + 1 });
  }

  ghostY(): number {
    let y = this.piece.y;
    while (!this.collides({ ...this.piece, y: y + 1 })) y++;
    return y;
  }

  private lock() {
    const p = this.piece;
    const cells: [number, number][] = [];
    p.shape.forEach((row, y) =>
      row.forEach((v, x) => {
        if (v && p.y + y >= 0) {
          this.well[p.y + y][p.x + x] = p.kind + 1;
          cells.push([p.x + x, p.y + y]);
        }
      }),
    );
    this.lockFlash = { cells, t: 0 };
    const full: number[] = [];
    this.well.forEach((row, y) => row.every((v) => v !== 0) && full.push(y));
    if (full.length) {
      const before = this.level;
      const kept = this.well.filter((row) => row.some((v) => v === 0));
      while (kept.length < WELL_H) kept.unshift(Array(WELL_W).fill(0));
      this.well = kept;
      this.lines += full.length;
      const pts = CLEAR_POINTS[full.length] * before;
      this.score += pts;
      this.clearFx = { rows: full, t: 0 };
      const ox = this.wellX();
      for (const r of full)
        for (let x = 0; x < WELL_W; x += 2) this.fx.burst(ox + x * CELL + CELL, r * CELL + CELL / 2, "#ffffff", 2, 50, 1.3);
      const midY = full.reduce((a, b) => a + b, 0) / full.length;
      this.fx.float(`${CLEAR_NAMES[full.length]} +${pts}`, ox + (WELL_W * CELL) / 2, midY * CELL, full.length === 4 ? "#ffd23f" : "#ffffff", full.length === 4 ? 10 : 8);
      if (full.length === 4) {
        this.fx.shake(2.2, 260);
        this.fx.flash("#ffd23f", 260);
      }
      if (this.level > before) this.fx.float(`LEVEL ${this.level}`, ox + (WELL_W * CELL) / 2, 40, "#8be04e", 11);
    }
    this.spawn();
  }

  private tryMove(dx: number, dy: number): boolean {
    const moved = { ...this.piece, x: this.piece.x + dx, y: this.piece.y + dy };
    if (this.collides(moved)) return false;
    this.piece = moved;
    return true;
  }

  /** A successful move or turn while resting gives a little more time before locking. */
  private nudged() {
    if (this.grounded() && this.lockResets < LOCK_RESETS) {
      this.lockT = 0;
      this.lockResets++;
    }
  }

  /** Soft drop by one row; locks immediately if it can't go further. */
  drop() {
    if (this.over) return;
    if (this.tryMove(0, 1)) this.score += 1;
    else this.lock();
  }

  hardDrop() {
    if (this.over) return;
    const from = this.piece.y;
    const to = this.ghostY();
    this.piece = { ...this.piece, y: to };
    this.score += 2 * (to - from);
    const ox = this.wellX();
    const cx = ox + (this.piece.x + this.piece.shape[0].length / 2) * CELL;
    this.fx.burst(cx, (to + this.piece.shape.length) * CELL, COLOURS[this.piece.kind], 8, 40, 1.4);
    this.fx.shake(1, 110);
    this.lock();
  }

  private rotatePiece() {
    if (this.piece.kind === 1) return; // the square looks the same every way round
    const r = { ...this.piece, shape: rotate(this.piece.shape) };
    // Simple wall/floor kicks: in place, sideways, then one up.
    for (const [kx, ky] of [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [-1, -1], [1, -1]]) {
      const c = { ...r, x: r.x + kx, y: r.y + ky };
      if (!this.collides(c)) {
        this.piece = c;
        this.nudged();
        return;
      }
    }
  }

  key(k: HKey) {
    if (this.over) return;
    if (k === "LEFT" || k === "RIGHT") {
      if (this.tryMove(k === "LEFT" ? -1 : 1, 0)) this.nudged();
    } else if (k === "DOWN") {
      this.drop();
      this.acc = 0;
    } else if (k === "UP") this.rotatePiece();
    else if (k === "EXE") this.hardDrop();
  }

  tick(dt: number) {
    this.fx.update(dt);
    if (this.clearFx) {
      this.clearFx.t += dt;
      if (this.clearFx.t > 320) this.clearFx = null;
    }
    if (this.lockFlash) {
      this.lockFlash.t += dt;
      if (this.lockFlash.t > 160) this.lockFlash = null;
    }
    if (this.over) {
      this.overT += dt;
      return;
    }
    if (this.grounded()) {
      this.lockT += dt;
      if (this.lockT >= LOCK_MS) this.lock();
      return;
    }
    this.acc += dt;
    while (this.acc >= this.interval() && !this.over) {
      this.acc -= this.interval();
      if (!this.tryMove(0, 1)) break;
    }
  }

  private wellX() {
    return Math.round((SCREEN_W - WELL_W * CELL) / 2);
  }

  private block(ctx: CanvasRenderingContext2D, x: number, y: number, colour: string, size = CELL) {
    ctx.fillStyle = colour;
    ctx.fillRect(x, y, size - 0.5, size - 0.5);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(x, y, size - 0.5, 1);
    ctx.fillRect(x, y, 1, size - 0.5);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(x, y + size - 1.5, size - 0.5, 1);
    ctx.fillRect(x + size - 1.5, y, 1, size - 0.5);
  }

  draw(ctx: CanvasRenderingContext2D, t: ScreenTheme) {
    const ox = this.wellX();
    const [sx, sy] = this.fx.offset();
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.save();
    ctx.translate(sx, sy);
    // Well with faint grid
    ctx.fillStyle = t.panel;
    ctx.fillRect(ox, 0, WELL_W * CELL, WELL_H * CELL);
    ctx.fillStyle = mixHex(t.panel, t.text, 0.06);
    for (let x = 1; x < WELL_W; x++) ctx.fillRect(ox + x * CELL - 0.25, 0, 0.5, WELL_H * CELL);
    for (let y = 1; y < WELL_H; y++) ctx.fillRect(ox, y * CELL - 0.25, WELL_W * CELL, 0.5);
    ctx.fillStyle = t.accent;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(ox - 1, 0, 1, WELL_H * CELL);
    ctx.fillRect(ox + WELL_W * CELL, 0, 1, WELL_H * CELL);
    ctx.globalAlpha = 1;

    // Settled blocks (greyed from the bottom up after a top-out)
    const greyRows = this.over ? Math.floor((this.overT / 700) * WELL_H) : 0;
    this.well.forEach((row, y) =>
      row.forEach((v, x) => {
        if (!v) return;
        const c = WELL_H - 1 - y < greyRows ? "#5c5c58" : COLOURS[v - 1];
        this.block(ctx, ox + x * CELL, y * CELL, c);
      }),
    );
    if (this.lockFlash) {
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.6 * (1 - this.lockFlash.t / 160);
      for (const [x, y] of this.lockFlash.cells) ctx.fillRect(ox + x * CELL, y * CELL, CELL - 0.5, CELL - 0.5);
      ctx.globalAlpha = 1;
    }
    if (this.clearFx) {
      const k = 1 - this.clearFx.t / 320;
      ctx.fillStyle = "#ffffff";
      for (const r of this.clearFx.rows) {
        ctx.globalAlpha = 0.85 * k;
        const grow = (1 - k) * 6;
        ctx.fillRect(ox - grow, r * CELL - grow * 0.15, WELL_W * CELL + grow * 2, CELL + grow * 0.3);
      }
      ctx.globalAlpha = 1;
    }

    if (!this.over) {
      const p = this.piece;
      // Ghost: where it will land
      const gy = this.ghostY();
      ctx.strokeStyle = COLOURS[p.kind];
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 0.8;
      p.shape.forEach((row, y) =>
        row.forEach((v, x) => v && ctx.strokeRect(ox + (p.x + x) * CELL + 0.6, (gy + y) * CELL + 0.6, CELL - 1.7, CELL - 1.7)),
      );
      ctx.globalAlpha = 1;
      // Falling piece; fades slightly as the lock timer runs out
      const resting = this.grounded() ? this.lockT / LOCK_MS : 0;
      p.shape.forEach((row, y) =>
        row.forEach((v, x) => v && p.y + y >= 0 && this.block(ctx, ox + (p.x + x) * CELL, (p.y + y) * CELL, mixHex(COLOURS[p.kind], "#ffffff", resting * 0.35))),
      );
    }
    this.fx.draw(ctx, t.font, SCREEN_W, SCREEN_H);
    ctx.restore();

    // Left panel: score, lines, level, best
    const stat = (x: number, y: number, label: string, value: string, w = 84) => {
      ctx.fillStyle = t.panel;
      fillRound(ctx, x, y, w, 24, 5);
      ctx.fillStyle = t.dim;
      ctx.font = `700 6px ${t.font}`;
      ctx.fillText(label, x + 6, y + 9);
      ctx.fillStyle = t.text;
      ctx.font = `800 10px ${t.font}`;
      ctx.fillText(value, x + 6, y + 20);
    };
    stat(10, 6, "SCORE", String(this.score));
    stat(10, 34, "LINES", String(this.lines), 40);
    stat(54, 34, "LEVEL", String(this.level), 40);
    stat(10, 62, "BEST", String(Math.max(getBest(this.id), this.score)));
    // Level progress bar
    ctx.fillStyle = t.panel;
    fillRound(ctx, 10, 92, 84, 5, 2.5);
    ctx.fillStyle = t.accent;
    fillRound(ctx, 10, 92, Math.max(5, 84 * ((this.lines % 10) / 10)), 5, 2.5);
    ctx.fillStyle = t.dim;
    ctx.font = `600 6px ${t.font}`;
    ctx.fillText(`${10 - (this.lines % 10)} lines to next level`, 10, 106);

    // Right panel: next three pieces
    const rx = ox + WELL_W * CELL + 14;
    ctx.fillStyle = t.panel;
    fillRound(ctx, rx, 6, 64, 106, 6);
    ctx.fillStyle = t.dim;
    ctx.font = `700 6px ${t.font}`;
    ctx.fillText("NEXT", rx + 6, 15);
    this.queue.slice(0, 3).forEach((kind, i) => {
      const shape = SHAPES[kind];
      const size = i === 0 ? 7 : 5.5;
      const w = shape[0].length * size;
      const h = shape.length * size;
      const cy = i === 0 ? 34 : 66 + (i - 1) * 26;
      ctx.globalAlpha = i === 0 ? 1 : 0.7;
      shape.forEach((row, y) =>
        row.forEach((v, x) => v && this.block(ctx, rx + 32 - w / 2 + x * size, cy - h / 2 + y * size, COLOURS[kind], size)),
      );
      ctx.globalAlpha = 1;
    });
  }
}
