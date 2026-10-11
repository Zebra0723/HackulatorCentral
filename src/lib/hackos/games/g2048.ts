import type { HKey } from "../keys";
import { SCREEN_H, SCREEN_W, type ScreenTheme } from "../theme";
import type { GameSim, Rand } from "./types";

const N = 4;
const TILE: Record<number, string> = {
  2: "#e9e6df", 4: "#d9d4c7", 8: "#e8c35a", 16: "#e3a24a", 32: "#d9793d", 64: "#c8572f",
  128: "#b4e23c", 256: "#9ccc2a", 512: "#7fb6e8", 1024: "#4f8fd6", 2048: "#a98bff",
};

/** Slide one row towards index 0. Returns the new row and points scored. */
export function slideRow(row: number[]): { row: number[]; gained: number } {
  const vals = row.filter((v) => v !== 0);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] === vals[i + 1]) {
      out.push(vals[i] * 2);
      gained += vals[i] * 2;
      i++;
    } else out.push(vals[i]);
  }
  while (out.length < row.length) out.push(0);
  return { row: out, gained };
}

export class Game2048 implements GameSim {
  readonly id = "2048";
  readonly title = "2048";
  readonly controls = "Arrows slide · OK pause · AC restart";
  score = 0;
  over = false;
  won = false;
  grid: number[][] = [];

  constructor(private rand: Rand = Math.random) {
    this.reset();
  }

  reset() {
    this.grid = Array.from({ length: N }, () => Array(N).fill(0));
    this.score = 0;
    this.over = false;
    this.won = false;
    this.spawn();
    this.spawn();
  }

  spawn() {
    const empty: [number, number][] = [];
    this.grid.forEach((r, y) => r.forEach((v, x) => v === 0 && empty.push([x, y])));
    if (!empty.length) return;
    const [x, y] = empty[Math.floor(this.rand() * empty.length)];
    this.grid[y][x] = this.rand() < 0.9 ? 2 : 4;
  }

  /** Apply a move. Returns true if anything changed. */
  move(dir: "UP" | "DOWN" | "LEFT" | "RIGHT"): boolean {
    let changed = false;
    const get = (i: number, j: number) => {
      switch (dir) {
        case "LEFT": return [i, j];
        case "RIGHT": return [i, N - 1 - j];
        case "UP": return [j, i];
        case "DOWN": return [N - 1 - j, i];
      }
    };
    for (let i = 0; i < N; i++) {
      const line = Array.from({ length: N }, (_, j) => {
        const [y, x] = get(i, j);
        return this.grid[y][x];
      });
      const { row, gained } = slideRow(line);
      this.score += gained;
      row.forEach((v, j) => {
        const [y, x] = get(i, j);
        if (this.grid[y][x] !== v) changed = true;
        this.grid[y][x] = v;
        if (v >= 2048) this.won = true;
      });
    }
    return changed;
  }

  canMove(): boolean {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const v = this.grid[y][x];
        if (v === 0 || this.grid[y][x + 1] === v || this.grid[y + 1]?.[x] === v) return true;
      }
    return false;
  }

  key(k: HKey) {
    if (this.over) return;
    if (k === "UP" || k === "DOWN" || k === "LEFT" || k === "RIGHT") {
      if (this.move(k)) this.spawn();
      if (!this.canMove()) this.over = true;
    }
  }

  tick() {}

  draw(ctx: CanvasRenderingContext2D, t: ScreenTheme) {
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const size = 26, gap = 3, board = N * size + (N + 1) * gap;
    const ox = Math.round((SCREEN_W - board) / 2), oy = Math.round((SCREEN_H - board) / 2);
    ctx.fillStyle = t.panel;
    ctx.fillRect(ox, oy, board, board);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const v = this.grid[y][x];
        const px = ox + gap + x * (size + gap), py = oy + gap + y * (size + gap);
        ctx.fillStyle = v ? TILE[v] ?? "#ffffff" : t.bg;
        ctx.globalAlpha = v ? 1 : 0.5;
        ctx.fillRect(px, py, size, size);
        ctx.globalAlpha = 1;
        if (v) {
          ctx.fillStyle = v >= 32 && v <= 64 ? "#ffffff" : "#141413";
          ctx.font = `700 ${v >= 1000 ? 8 : v >= 100 ? 9 : 11}px ${t.font}`;
          ctx.fillText(String(v), px + size / 2, py + size / 2 + 0.5);
        }
      }
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillStyle = t.dim;
    ctx.font = `600 8px ${t.font}`;
    ctx.fillText("SCORE", 12, 20);
    ctx.fillStyle = t.text;
    ctx.font = `700 14px ${t.font}`;
    ctx.fillText(String(this.score), 12, 36);
    if (this.won) {
      ctx.fillStyle = t.accent;
      ctx.font = `700 9px ${t.font}`;
      ctx.fillText("2048!", 12, 54);
    }
  }
}
