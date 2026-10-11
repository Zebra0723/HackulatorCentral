import { getBest } from "../bests";
import { fillRound, mixHex } from "../draw";
import { Fx, easeBack } from "../fx";
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
/** Starting step time; it gets quicker as you eat, down to FASTEST_MS. */
export const START_MS = 140;
const FASTEST_MS = 78;
/** Every BONUS_EVERY apples a golden apple appears for BONUS_MS. */
export const BONUS_EVERY = 5;
export const BONUS_MS = 5000;
export const BONUS_POINTS = 3;
const APPLE = "#ff5d5d";
const GOLD = "#ffc83d";

export class Snake implements GameSim {
  readonly id = "snake";
  readonly title = "Snake";
  readonly controls = "Arrows steer · edges wrap round · golden apples are worth 3 · OK pause · AC restart";
  score = 0;
  over = false;
  body: P[] = [];
  prevBody: P[] = [];
  dir: Dir = "RIGHT";
  queue: Dir[] = [];
  food: P = { x: 0, y: 0 };
  bonus: (P & { left: number }) | null = null;
  eaten = 0;
  fx = new Fx();
  private acc = 0;
  private time = 0;
  private foodAge = 0;
  private gulps: number[] = [];
  private deadFor = 0;

  constructor(private rand: Rand = Math.random, public cols = SNAKE_COLS, public rows = SNAKE_ROWS) {
    this.reset();
  }

  reset() {
    const y = Math.floor(this.rows / 2);
    const x = Math.floor(this.cols / 3);
    this.body = [{ x, y }, { x: x - 1, y }, { x: x - 2, y }];
    this.prevBody = this.body.map((p) => ({ x: p.x - 1, y: p.y }));
    this.dir = "RIGHT";
    this.queue = [];
    this.score = 0;
    this.eaten = 0;
    this.over = false;
    this.acc = 0;
    this.bonus = null;
    this.gulps = [];
    this.deadFor = 0;
    this.fx.clear();
    this.placeFood();
  }

  /** Current time per step in ms. */
  get interval() {
    return Math.max(FASTEST_MS, START_MS - this.eaten * 2.5);
  }

  private freeCells(): P[] {
    const taken = new Set(this.body.map((p) => p.y * this.cols + p.x));
    if (this.bonus) taken.add(this.bonus.y * this.cols + this.bonus.x);
    taken.add(this.food.y * this.cols + this.food.x);
    const free: P[] = [];
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) if (!taken.has(y * this.cols + x)) free.push({ x, y });
    return free;
  }

  private placeFood() {
    this.food = { x: -1, y: -1 };
    const free = this.freeCells();
    this.food = free[Math.floor(this.rand() * free.length)] ?? { x: -1, y: -1 };
    this.foodAge = 0;
  }

  private placeBonus() {
    const free = this.freeCells();
    const c = free[Math.floor(this.rand() * free.length)];
    this.bonus = c ? { ...c, left: BONUS_MS } : null;
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
    const eatsFood = head.x === this.food.x && head.y === this.food.y;
    const eatsBonus = !!this.bonus && head.x === this.bonus.x && head.y === this.bonus.y;
    const grows = eatsFood || eatsBonus;
    const rest = grows ? this.body : this.body.slice(0, -1);
    if (rest.some((p) => p.x === head.x && p.y === head.y)) {
      this.over = true;
      this.deadFor = 0;
      this.fx.shake(2.6, 320);
      this.fx.flash(APPLE, 260);
      this.fx.burst(head.x * CELL + CELL / 2, head.y * CELL + CELL / 2, APPLE, 18, 70);
      return;
    }
    this.prevBody = this.body;
    this.body = [head, ...rest];
    this.gulps = this.gulps.map((g) => g + 1).filter((g) => g < this.body.length);
    const cx = head.x * CELL + CELL / 2;
    const cy = head.y * CELL + CELL / 2;
    if (eatsFood) {
      this.score += 1;
      this.eaten += 1;
      this.gulps.push(0);
      this.fx.burst(cx, cy, APPLE, 10, 55);
      this.fx.float("+1", cx, cy - 4, "#ffffff");
      if (this.eaten % BONUS_EVERY === 0 && !this.bonus) {
        this.placeFood();
        this.placeBonus();
      } else this.placeFood();
    }
    if (eatsBonus) {
      this.score += BONUS_POINTS;
      this.bonus = null;
      this.gulps.push(0);
      this.fx.burst(cx, cy, GOLD, 22, 80, 2);
      this.fx.float(`+${BONUS_POINTS}`, cx, cy - 4, GOLD, 11);
      this.fx.shake(1.2, 140);
    }
  }

  tick(dt: number) {
    this.time += dt;
    this.fx.update(dt);
    if (this.over) {
      this.deadFor += dt;
      return;
    }
    this.foodAge += dt;
    if (this.bonus) {
      this.bonus.left -= dt;
      if (this.bonus.left <= 0) this.bonus = null;
    }
    this.acc += dt;
    while (this.acc >= this.interval && !this.over) {
      this.acc -= this.interval;
      this.step();
    }
  }

  /** Nearest copy of d on a wrapping axis of length n. */
  private wrapD(d: number, n: number) {
    return d - n * Math.round(d / n);
  }

  /** Smoothly interpolated, unwrapped centre points of every segment (in cells). */
  private path(): P[] {
    const f = this.over ? 1 : Math.min(1, this.acc / this.interval);
    const pts: P[] = [];
    this.body.forEach((cur, i) => {
      const prev = this.prevBody[i] ?? cur;
      const dx = this.wrapD(cur.x - prev.x, this.cols);
      const dy = this.wrapD(cur.y - prev.y, this.rows);
      const p = { x: cur.x - dx * (1 - f) + 0.5, y: cur.y - dy * (1 - f) + 0.5 };
      if (i === 0) pts.push(p);
      else {
        const q = pts[i - 1];
        pts.push({ x: q.x + this.wrapD(p.x - q.x, this.cols), y: q.y + this.wrapD(p.y - q.y, this.rows) });
      }
    });
    return pts;
  }

  draw(ctx: CanvasRenderingContext2D, t: ScreenTheme) {
    const [sx, sy] = this.fx.offset();
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = t.bg;
    ctx.fillRect(-4, -4, SCREEN_W + 8, SCREEN_H + 8);
    // Soft checkerboard
    ctx.fillStyle = t.panel;
    ctx.globalAlpha = 0.5;
    for (let y = 0; y < this.rows; y++) for (let x = y % 2; x < this.cols; x += 2) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    ctx.globalAlpha = 1;
    // The edges wrap: a faint accent rim says so
    const rim = ctx.createLinearGradient(0, 0, 0, SCREEN_H);
    rim.addColorStop(0, t.accent);
    rim.addColorStop(1, mixHex(t.accent, t.bg, 0.6));
    ctx.strokeStyle = rim;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(0.5, 0.5, SCREEN_W - 1, SCREEN_H - 1);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Food
    if (this.food.x >= 0) this.drawApple(ctx, this.food, APPLE, easeBack(this.foodAge / 260), t);
    if (this.bonus && (this.bonus.left > 1500 || Math.floor(this.bonus.left / 120) % 2 === 0)) {
      this.drawApple(ctx, this.bonus, GOLD, 1.15, t);
      // countdown ring
      const cx = this.bonus.x * CELL + CELL / 2;
      const cy = this.bonus.y * CELL + CELL / 2 + 0.5;
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 6.5, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * this.bonus.left) / BONUS_MS);
      ctx.stroke();
    }

    // Body: a smooth tube through interpolated points, drawn on every wrapped copy
    const pts = this.path();
    const n = pts.length;
    const W = this.cols;
    const H = this.rows;
    const lw = CELL * 0.78;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const deadT = this.over ? Math.min(1, this.deadFor / 500) : 0;
    const colourAt = (i: number) => {
      const base = mixHex(t.accent, t.bg, (0.5 * i) / Math.max(1, n - 1));
      return deadT ? mixHex(base, "#6b6b66", deadT * 0.8) : base;
    };
    for (const ox of [-W, 0, W])
      for (const oy of [-H, 0, H]) {
        for (let i = n - 1; i >= 1; i--) {
          ctx.strokeStyle = colourAt(i);
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.moveTo((pts[i].x + ox) * CELL, (pts[i].y + oy) * CELL);
          ctx.lineTo((pts[i - 1].x + ox) * CELL, (pts[i - 1].y + oy) * CELL);
          ctx.stroke();
        }
        // gulps travelling down the body
        for (const g of this.gulps) {
          const p = pts[g];
          if (!p) continue;
          ctx.fillStyle = colourAt(g);
          ctx.beginPath();
          ctx.arc((p.x + ox) * CELL, (p.y + oy) * CELL, lw * 0.68, 0, Math.PI * 2);
          ctx.fill();
        }
        // head
        const h = pts[0];
        const hx = (h.x + ox) * CELL;
        const hy = (h.y + oy) * CELL;
        if (hx < -CELL || hx > SCREEN_W + CELL || hy < -CELL || hy > SCREEN_H + CELL) continue;
        ctx.fillStyle = this.over ? APPLE : t.accent;
        ctx.beginPath();
        ctx.arc(hx, hy, CELL * 0.5, 0, Math.PI * 2);
        ctx.fill();
        const v = VEC[this.dir];
        // tongue flicks now and then
        if (!this.over && Math.floor(this.time / 140) % 9 === 0) {
          ctx.strokeStyle = APPLE;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(hx + v.x * 4.5, hy + v.y * 4.5);
          ctx.lineTo(hx + v.x * 7.5, hy + v.y * 7.5);
          ctx.stroke();
        }
        for (const s of [-1, 1]) {
          const ex = hx + v.x * 1.6 + v.y * 2.3 * s;
          const ey = hy + v.y * 1.6 + v.x * 2.3 * s;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#141413";
          ctx.beginPath();
          if (this.over) {
            ctx.fillRect(ex - 1, ey - 0.25, 2, 0.5);
          } else {
            ctx.arc(ex + v.x * 0.5, ey + v.y * 0.5, 0.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

    this.fx.draw(ctx, t.font, SCREEN_W, SCREEN_H);
    ctx.restore();

    // HUD
    const best = Math.max(getBest(this.id), this.score);
    const label = `${this.score}`;
    const sub = best > 0 ? `BEST ${best}` : "";
    ctx.font = `800 9px ${t.font}`;
    const w1 = ctx.measureText(label).width;
    ctx.font = `600 6.5px ${t.font}`;
    const w2 = sub ? ctx.measureText(sub).width + 6 : 0;
    const w = w1 + w2 + 12;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    fillRound(ctx, SCREEN_W - w - 4, 3, w, 13, 6.5);
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 9px ${t.font}`;
    ctx.fillText(label, SCREEN_W - w + 2, 12.6);
    if (sub) {
      ctx.fillStyle = "#c9cdbf";
      ctx.font = `600 6.5px ${t.font}`;
      ctx.fillText(sub, SCREEN_W - w + 2 + w1 + 6, 12.2);
    }
  }

  private drawApple(ctx: CanvasRenderingContext2D, at: P, colour: string, scale: number, t: ScreenTheme) {
    const cx = at.x * CELL + CELL / 2;
    const cy = at.y * CELL + CELL / 2 + 0.5;
    const pulse = 1 + Math.sin(this.time / 160) * 0.12;
    ctx.fillStyle = colour;
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.arc(cx, cy, 5.4 * pulse * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.arc(cx - 1.2 * scale, cy - 1.2 * scale, 0.9 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = t.accent;
    ctx.fillRect(cx + 0.2, cy - 5 * scale, 1.6, 2.2 * scale);
  }
}
