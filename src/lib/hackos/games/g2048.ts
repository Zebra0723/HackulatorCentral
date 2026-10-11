import { getBest } from "../bests";
import { fillRound } from "../draw";
import { Fx, easeBack, easeOut } from "../fx";
import type { HKey } from "../keys";
import { SCREEN_H, SCREEN_W, type ScreenTheme } from "../theme";
import type { GameSim, Rand } from "./types";

const N = 4;
const TILE: Record<number, string> = {
  2: "#eeeae0", 4: "#e3dccb", 8: "#f2b45a", 16: "#f0913f", 32: "#ec6b3c", 64: "#e04a2b",
  128: "#d7ec7a", 256: "#b4e23c", 512: "#8fd44f", 1024: "#5fc3e8", 2048: "#a98bff",
};
const DARK_TEXT = new Set([2, 4, 128, 256, 512]);
const SLIDE_MS = 110;
const POP_MS = 170;
const SPAWN_MS = 160;

type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";

/** Slide one row towards index 0. Returns the new row and points scored. */
export function slideRow(row: number[]): { row: number[]; gained: number } {
  const { row: out, gained } = slideRowTracked(row);
  return { row: out, gained };
}

/** Like slideRow, but also says where each output cell came from. */
export function slideRowTracked(row: number[]): { row: number[]; gained: number; sources: number[][] } {
  const vals = row.map((v, j) => ({ v, j })).filter((c) => c.v !== 0);
  const out: number[] = [];
  const sources: number[][] = [];
  let gained = 0;
  for (let i = 0; i < vals.length; i++) {
    if (vals[i + 1] && vals[i].v === vals[i + 1].v) {
      out.push(vals[i].v * 2);
      sources.push([vals[i].j, vals[i + 1].j]);
      gained += vals[i].v * 2;
      i++;
    } else {
      out.push(vals[i].v);
      sources.push([vals[i].j]);
    }
  }
  while (out.length < row.length) {
    out.push(0);
    sources.push([]);
  }
  return { row: out, gained, sources };
}

interface Slide { fx: number; fy: number; tx: number; ty: number; v: number }

export class Game2048 implements GameSim {
  readonly id = "2048";
  readonly title = "2048";
  readonly controls = "Arrows slide every tile · join matching numbers · OK pause · AC restart";
  score = 0;
  over = false;
  won = false;
  grid: number[][] = [];
  fx = new Fx();
  /** Animation state (cosmetic). */
  slides: Slide[] = [];
  pops: [number, number][] = [];
  spawned: [number, number] | null = null;
  animT = 1000;
  private scoreBump = 1000;
  private celebrated = false;

  constructor(private rand: Rand = Math.random) {
    this.reset();
  }

  reset() {
    this.grid = Array.from({ length: N }, () => Array(N).fill(0));
    this.score = 0;
    this.over = false;
    this.won = false;
    this.celebrated = false;
    this.slides = [];
    this.pops = [];
    this.fx.clear();
    this.spawn();
    this.spawn();
    this.animT = 0; // no slide yet: the opening tile grows in
  }

  spawn() {
    const empty: [number, number][] = [];
    this.grid.forEach((r, y) => r.forEach((v, x) => v === 0 && empty.push([x, y])));
    if (!empty.length) return;
    const [x, y] = empty[Math.floor(this.rand() * empty.length)];
    this.grid[y][x] = this.rand() < 0.9 ? 2 : 4;
    this.spawned = [x, y];
  }

  /** Apply a move. Returns true if anything changed. */
  move(dir: Dir): boolean {
    let changed = false;
    const slides: Slide[] = [];
    const pops: [number, number][] = [];
    let gainedTotal = 0;
    const get = (i: number, j: number): [number, number] => {
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
      const { row, gained, sources } = slideRowTracked(line);
      gainedTotal += gained;
      row.forEach((v, k) => {
        const [ty, tx] = get(i, k);
        for (const j of sources[k]) {
          const [fy, fx] = get(i, j);
          slides.push({ fx, fy, tx, ty, v: line[j] });
        }
        if (sources[k].length === 2) pops.push([tx, ty]);
        if (this.grid[ty][tx] !== v) changed = true;
        this.grid[ty][tx] = v;
        if (v >= 2048) this.won = true;
      });
    }
    this.score += gainedTotal;
    if (changed) {
      this.slides = slides;
      this.pops = pops;
      this.spawned = null;
      this.animT = 0;
      if (gainedTotal) {
        this.scoreBump = 0;
        const g = this.geom();
        this.fx.float(`+${gainedTotal}`, g.sx + 22, 46, "#ffffff", 9);
        for (const [x, y] of pops) {
          const c = this.cellCentre(x, y);
          this.fx.burst(c[0], c[1], TILE[this.grid[y][x]] ?? "#ffffff", 7, 45, 1.4);
        }
      }
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
      if (this.won && !this.celebrated) {
        this.celebrated = true;
        this.fx.flash("#a98bff", 400);
        const c = this.cellCentre(1.5, 1.5);
        this.fx.burst(c[0], c[1], "#a98bff", 40, 110, 2);
        this.fx.float("2048!", c[0], c[1], "#ffffff", 14);
      }
      if (!this.canMove()) {
        this.over = true;
        this.fx.shake(2, 260);
      }
    }
  }

  tick(dt: number) {
    this.animT += dt;
    this.scoreBump += dt;
    this.fx.update(dt);
  }

  private geom() {
    const size = 26;
    const gap = 3;
    const board = N * size + (N + 1) * gap;
    const ox = Math.round((SCREEN_W - board) / 2);
    const oy = Math.round((SCREEN_H - board) / 2);
    return { size, gap, board, ox, oy, sx: 14 };
  }

  private cellCentre(x: number, y: number): [number, number] {
    const g = this.geom();
    return [g.ox + g.gap + x * (g.size + g.gap) + g.size / 2, g.oy + g.gap + y * (g.size + g.gap) + g.size / 2];
  }

  private drawTile(ctx: CanvasRenderingContext2D, t: ScreenTheme, v: number, cx: number, cy: number, scale: number) {
    const s = this.geom().size * scale;
    const x = cx - s / 2;
    const y = cy - s / 2;
    const colour = TILE[v] ?? "#ffffff";
    if (v >= 128) {
      ctx.fillStyle = colour;
      ctx.globalAlpha = 0.28;
      fillRound(ctx, x - 1.5, y - 1.5, s + 3, s + 3, 6);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    fillRound(ctx, x, y + 1.2, s, s, 4.5);
    ctx.fillStyle = colour;
    fillRound(ctx, x, y, s, s, 4.5);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    fillRound(ctx, x + 1.5, y + 1.2, s - 3, s * 0.38, 3);
    ctx.fillStyle = DARK_TEXT.has(v) ? "#2b2a26" : "#ffffff";
    const digits = String(v).length;
    ctx.font = `800 ${(digits >= 4 ? 8.5 : digits === 3 ? 10 : 12.5) * scale}px ${t.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(v), cx, cy + 0.6);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
  }

  draw(ctx: CanvasRenderingContext2D, t: ScreenTheme) {
    const g = this.geom();
    const [sx, sy] = this.fx.offset();
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = t.panel;
    fillRound(ctx, g.ox, g.oy, g.board, g.board, 7);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const [cx, cy] = this.cellCentre(x, y);
        ctx.fillStyle = t.bg;
        ctx.globalAlpha = 0.55;
        fillRound(ctx, cx - g.size / 2, cy - g.size / 2, g.size, g.size, 4.5);
        ctx.globalAlpha = 1;
      }

    const sliding = this.animT < SLIDE_MS && this.slides.length > 0;
    if (sliding) {
      const k = easeOut(this.animT / SLIDE_MS);
      for (const s of this.slides) {
        const a = this.cellCentre(s.fx, s.fy);
        const b = this.cellCentre(s.tx, s.ty);
        this.drawTile(ctx, t, s.v, a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, 1);
      }
    } else {
      const since = this.animT - (this.slides.length ? SLIDE_MS : 0);
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          const v = this.grid[y][x];
          if (!v) continue;
          const [cx, cy] = this.cellCentre(x, y);
          let scale = 1;
          if (this.pops.some(([px, py]) => px === x && py === y) && since < POP_MS) {
            scale = 1 + 0.18 * Math.sin(Math.PI * (since / POP_MS));
          } else if (this.spawned && this.spawned[0] === x && this.spawned[1] === y && since < SPAWN_MS) {
            scale = Math.max(0.05, easeBack(since / SPAWN_MS));
          }
          this.drawTile(ctx, t, v, cx, cy, scale);
        }
    }
    this.fx.draw(ctx, t.font, SCREEN_W, SCREEN_H);
    ctx.restore();

    // Left: score and best
    const best = Math.max(getBest(this.id), this.score);
    const panel = (y: number, label: string, value: string, bump: number) => {
      ctx.fillStyle = t.panel;
      fillRound(ctx, 8, y, 74, 30, 6);
      ctx.fillStyle = t.dim;
      ctx.font = `700 6.5px ${t.font}`;
      ctx.fillText(label, 14, y + 10);
      ctx.fillStyle = t.text;
      const sc = 1 + 0.25 * Math.max(0, 1 - bump / 180);
      ctx.font = `800 ${12 * sc}px ${t.font}`;
      ctx.fillText(value, 14, y + 24);
    };
    panel(14, "SCORE", String(this.score), this.scoreBump);
    panel(50, "BEST", String(best), 1000);
    if (this.won) {
      ctx.fillStyle = "#a98bff";
      ctx.font = `800 8px ${t.font}`;
      ctx.fillText("2048 reached!", 10, 98);
    }

    // Right: how to play
    const rx = g.ox + g.board + 14;
    ctx.fillStyle = t.dim;
    ctx.font = `700 6.5px ${t.font}`;
    ctx.fillText("HOW TO PLAY", rx, 22);
    ctx.fillStyle = t.text;
    ctx.font = `600 7.5px ${t.font}`;
    ["Slide with arrows.", "Equal numbers join.", "Reach 2048!"].forEach((line, i) => ctx.fillText(line, rx, 36 + i * 12));
    // mini arrow keys
    const ax = rx + 22;
    const ay = 82;
    ctx.fillStyle = t.panel;
    for (const [dx, dy] of [[0, -1], [-1, 0], [0, 0], [1, 0]]) fillRound(ctx, ax + dx * 12, ay + (dy + 1) * 12 - 12, 11, 11, 2.5);
    ctx.fillStyle = t.accent;
    ctx.font = `800 7px ${t.font}`;
    ctx.textAlign = "center";
    [["↑", 0, -1], ["←", -1, 0], ["↓", 0, 0], ["→", 1, 0]].forEach(([a, dx, dy]) =>
      ctx.fillText(String(a), ax + (dx as number) * 12 + 5.5, ay + ((dy as number) + 1) * 12 - 12 + 8),
    );
    ctx.textAlign = "left";
  }
}
