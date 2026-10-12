import { getBest, submitScore } from "./bests";
import { CalcError, evaluate, formatResult } from "./calc";
import { fillRound, strokeRound } from "./draw";
import { Game2048 } from "./games/g2048";
import { Snake } from "./games/snake";
import { Tetris } from "./games/tetris";
import type { GameSim } from "./games/types";
import type { HKey } from "./keys";
import { CALC_THEME, SCREEN_H, SCREEN_W, type ScreenTheme } from "./theme";

/**
 * PUBLIC demonstration sequence that opens the launcher in the web demo.
 * It is printed on the website on purpose. It is not a password and must never
 * be reused for the admin area or a customer's device PIN.
 */
export const DEMO_UNLOCK_SEQUENCE: readonly HKey[] = ["HOME", "2", "0", "4", "8", "OK"];

export interface LauncherApp {
  id: string;
  name: string;
  /** Has a playable web demo. Others show as "not in web demo". */
  playable: boolean;
}

export const DEMO_GAMES: readonly LauncherApp[] = [
  { id: "snake", name: "Snake", playable: true },
  { id: "2048", name: "2048", playable: true },
  { id: "tetris", name: "Tetris", playable: true },
];

/**
 * Owner code: typing these digits on the calculator signs the owner straight into
 * the control room (the server checks it and rate-limits wrong guesses). The owner
 * chose this deliberately; it is visible in the site's code, so it is not a secret.
 */
export const ADMIN_SHORTCUT_SEQUENCE: readonly HKey[] = ["0", "7", "2", "3", "2", "0", "1", "5"];
export const OWNER_CODE = ADMIN_SHORTCUT_SEQUENCE.join("");

type Mode = "calc" | "launcher" | "game";
type Arrow = "UP" | "DOWN" | "LEFT" | "RIGHT";

/** "READY… GO!" before each game starts moving. */
export const INTRO_MS = 900;
const GAME_OVER_GRACE_MS = 600;

const KEY_TEXT: Partial<Record<HKey, string>> = {
  DOT: ".", ADD: "+", SUB: "-", MUL: "×", DIV: "÷", LPAREN: "(", RPAREN: ")",
  ANS: "Ans", SQUARE: "²", POWER: "^", SQRT: "√", EXP: "E",
};

export function createGame(id: string): GameSim | null {
  if (id === "snake") return new Snake();
  if (id === "2048") return new Game2048();
  if (id === "tetris") return new Tetris();
  return null;
}

export class HackOS {
  mode: Mode;
  apps: LauncherApp[];
  selected = 0;
  game: GameSim | null = null;
  paused = false;
  toast: { text: string; until: number } | null = null;
  /** Time left on the READY/GO intro; the game doesn't move during it. */
  intro = 0;
  /** Set when the last finished game beat the best score in this browser. */
  newBest = false;
  private recorded = false;
  private overAt = 0;
  // calculator
  expr = "";
  result = "";
  ans = 0;
  justEvaluated = false;
  private seq: HKey[] = [];
  private adminSeq: HKey[] = [];
  /** Set when the owner shortcut was typed; the page then navigates to /admin. */
  adminRequested = false;
  private clock = 0;
  private listeners = new Set<() => void>();

  constructor(opts: { apps?: LauncherApp[]; startIn?: Mode } = {}) {
    this.apps = opts.apps ? [...opts.apps] : [...DEMO_GAMES];
    this.mode = opts.startIn ?? "calc";
  }

  get unlocked() {
    return this.mode !== "calc";
  }

  /** Be told whenever something visible changes outside of draw (mode switch, pause…). */
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private changed() {
    this.listeners.forEach((fn) => fn());
  }

  private flash(text: string, ms = 1600) {
    this.toast = { text, until: this.clock + ms };
  }

  /** Show a short message on the screen (used by the page, e.g. after the owner code). */
  notify(text: string) {
    this.flash(text, 2400);
    this.changed();
  }

  unlock() {
    this.mode = "launcher";
    this.seq = [];
    this.expr = "";
    this.result = "";
    this.flash("Launcher unlocked");
    this.changed();
  }

  toCalculator() {
    this.mode = "calc";
    this.game = null;
    this.paused = false;
    this.changed();
  }

  toLauncher() {
    this.mode = "launcher";
    this.game = null;
    this.paused = false;
    this.changed();
  }

  openApp(index: number) {
    const app = this.apps[index];
    if (!app) return;
    if (!app.playable) {
      this.flash("Not in the web demo yet");
      return;
    }
    const g = createGame(app.id);
    if (!g) return;
    this.game = g;
    this.paused = false;
    this.mode = "game";
    this.toast = null;
    this.startRound();
    this.changed();
  }

  private startRound() {
    this.intro = INTRO_MS;
    this.newBest = false;
    this.recorded = false;
  }

  /** Save the score once when a game ends. */
  private checkOver() {
    if (this.game?.over && !this.recorded) {
      this.recorded = true;
      this.overAt = this.clock;
      this.newBest = submitScore(this.game.id, this.game.score);
      this.changed();
    }
  }

  /** A swipe on the screen. */
  swipe(dir: Arrow) {
    if (this.mode === "launcher") return this.press(dir);
    if (this.mode === "game" && this.game) return this.press(this.game.swipe?.[dir] ?? dir);
  }

  /** A tap on the screen. */
  tap() {
    if (this.mode === "launcher") return this.press("OK");
    if (this.mode === "game" && this.game) {
      if (this.game.over || this.paused) return this.press("OK");
      if (this.game.tap) return this.press(this.game.tap);
    }
  }

  togglePause() {
    if (this.mode !== "game" || !this.game || this.game.over) return;
    this.paused = !this.paused;
    this.changed();
  }

  /** Pause without toggling, e.g. when the demo scrolls offscreen. */
  pause() {
    if (this.mode === "game" && this.game && !this.game.over && !this.paused) {
      this.paused = true;
      this.changed();
    }
  }

  restart() {
    if (this.mode !== "game" || !this.game) return;
    this.game.reset();
    this.paused = false;
    this.startRound();
    this.changed();
  }

  press(k: HKey) {
    // Universal: HOME returns to the calculator from anywhere except while entering the unlock sequence.
    if (this.mode === "calc") return this.calcKey(k);
    if (k === "HOME") return this.toCalculator();
    if (this.mode === "launcher") return this.launcherKey(k);
    return this.gameKey(k);
  }

  private trackSequence(k: HKey) {
    this.seq.push(k);
    if (this.seq.length > DEMO_UNLOCK_SEQUENCE.length) this.seq.shift();
    if (this.seq.length === DEMO_UNLOCK_SEQUENCE.length && this.seq.every((s, i) => s === DEMO_UNLOCK_SEQUENCE[i])) {
      this.unlock();
      return true;
    }
    return false;
  }

  private trackAdminShortcut(k: HKey) {
    this.adminSeq.push(k);
    if (this.adminSeq.length > ADMIN_SHORTCUT_SEQUENCE.length) this.adminSeq.shift();
    if (this.adminSeq.length === ADMIN_SHORTCUT_SEQUENCE.length && this.adminSeq.every((s, i) => s === ADMIN_SHORTCUT_SEQUENCE[i])) {
      this.adminSeq = [];
      this.expr = "";
      this.result = "";
      this.justEvaluated = false;
      this.adminRequested = true;
      this.flash("Opening control room…", 3000);
      this.changed();
      return true;
    }
    return false;
  }

  private calcKey(k: HKey) {
    if (this.trackAdminShortcut(k)) return;
    if (this.trackSequence(k)) return;
    if (k === "HOME" || k === "OK") return; // part of the demo sequence; no calculator meaning here
    if (k === "AC") {
      this.expr = "";
      this.result = "";
      this.justEvaluated = false;
      return this.changed();
    }
    if (k === "DEL") {
      if (this.justEvaluated) {
        this.justEvaluated = false;
        this.result = "";
      } else this.expr = this.expr.endsWith("Ans") ? this.expr.slice(0, -3) : this.expr.slice(0, -1);
      return this.changed();
    }
    if (k === "EXE") {
      if (!this.expr) return;
      try {
        const v = evaluate(this.expr, this.ans);
        this.ans = v;
        this.result = formatResult(v);
      } catch (e) {
        this.result = e instanceof CalcError ? e.message : "Syntax ERROR";
      }
      this.justEvaluated = true;
      return this.changed();
    }
    const text = /^[0-9]$/.test(k) ? k : KEY_TEXT[k];
    if (!text) return;
    if (this.justEvaluated) {
      // Operators continue from the last answer; anything else starts fresh.
      this.expr = ["+", "-", "×", "÷", "^", "²"].includes(text) && !this.result.includes("ERROR") ? "Ans" : "";
      this.result = "";
      this.justEvaluated = false;
    }
    if (this.expr.length < 40) this.expr += text;
    this.changed();
  }

  private launcherKey(k: HKey) {
    const n = this.apps.length;
    if (!n) return;
    const cols = 3;
    if (k === "LEFT") this.selected = (this.selected + n - 1) % n;
    else if (k === "RIGHT") this.selected = (this.selected + 1) % n;
    else if (k === "UP") this.selected = Math.max(0, this.selected - cols);
    else if (k === "DOWN") this.selected = Math.min(n - 1, this.selected + cols);
    else if (k === "OK" || k === "EXE") return this.openApp(this.selected);
    else if (k === "BACK" || k === "AC") return this.toCalculator();
    else return;
    this.changed();
  }

  private gameKey(k: HKey) {
    if (!this.game) return;
    if (k === "BACK") return this.toLauncher();
    if (k === "AC") return this.restart();
    const ownsKey = this.game.ownKeys?.includes(k) ?? false;
    // Let the result sink in: a key mashed at the moment of game over doesn't restart straight away.
    if (this.game.over && this.clock - this.overAt < GAME_OVER_GRACE_MS && (k === "OK" || k === "EXE")) return;
    if (k === "OK" || (k === "EXE" && (!ownsKey || this.game.over))) {
      if (this.game.over) return this.restart();
      return this.togglePause();
    }
    if (this.paused) return;
    if (this.intro > 0 && ownsKey) return; // no hard drops before GO
    this.game.key(k);
    this.checkOver();
  }

  /** Advance time. Callers stop calling this when the demo is hidden or offscreen. */
  tick(dt: number) {
    this.clock += dt;
    if (this.toast && this.clock > this.toast.until) this.toast = null;
    if (this.mode !== "game" || !this.game || this.paused) return;
    if (this.intro > 0) {
      this.intro = Math.max(0, this.intro - dt);
      return;
    }
    // Finished games keep ticking so their end-of-game effects can play out.
    this.game.tick(Math.min(dt, 100));
    this.checkOver();
  }

  get controlsHint(): string {
    if (this.mode === "calc") return "Type a calculation · = or EXE to calculate · DEL / AC to clear";
    if (this.mode === "launcher") return "Arrows choose · OK opens · HOME back to calculator";
    return `${this.game?.controls ?? ""} · BACK menu · HOME calculator`;
  }

  draw(ctx: CanvasRenderingContext2D, theme: ScreenTheme) {
    if (this.mode === "calc") drawCalculator(ctx, this);
    else if (this.mode === "launcher") drawLauncher(ctx, theme, this.apps, this.selected);
    else if (this.game) {
      this.game.draw(ctx, theme);
      if (this.game.over && this.recorded) {
        const best = getBest(this.game.id);
        drawOverlay(
          ctx,
          theme,
          this.newBest ? "New best!" : "Game over",
          this.newBest ? `Score ${this.game.score}` : `Score ${this.game.score}  ·  Best ${best}`,
          "OK play again  ·  BACK menu",
        );
      } else if (this.paused) drawOverlay(ctx, theme, "Paused", this.game.title, "OK resume  ·  AC restart  ·  BACK menu");
      else if (this.intro > 0) drawIntro(ctx, theme, this.intro);
    }
    if (this.toast) {
      ctx.font = `600 9px ${theme.font}`;
      const w = ctx.measureText(this.toast.text).width + 20;
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      fillRound(ctx, (SCREEN_W - w) / 2, SCREEN_H - 24, w, 17, 8.5);
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc((SCREEN_W - w) / 2 + 8, SCREEN_H - 15.5, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(this.toast.text, SCREEN_W / 2 + 3, SCREEN_H - 12.5);
      ctx.textAlign = "left";
    }
  }
}

function drawCalculator(ctx: CanvasRenderingContext2D, os: HackOS) {
  const font = 'ui-monospace, "Cascadia Mono", "Roboto Mono", Menlo, Consolas, monospace';
  ctx.fillStyle = CALC_THEME.bg;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.fillStyle = CALC_THEME.dim;
  ctx.font = `600 8px ${font}`;
  ctx.fillText("MATH", 8, 11);
  ctx.textAlign = "right";
  ctx.fillText("D", SCREEN_W - 8, 11);
  ctx.textAlign = "left";
  ctx.fillStyle = CALC_THEME.text;
  ctx.font = `500 15px ${font}`;
  let expr = os.expr || (os.justEvaluated ? "" : "");
  while (ctx.measureText(expr).width > SCREEN_W - 20 && expr.length > 1) expr = expr.slice(1);
  ctx.fillText(expr, 10, 40);
  if (!os.justEvaluated && os.expr.length < 40) {
    const w = ctx.measureText(expr).width;
    if (Math.floor(Date.now() / 500) % 2 === 0) ctx.fillRect(11 + w, 28, 1.5, 15);
  }
  if (os.result) {
    ctx.textAlign = "right";
    ctx.font = `600 ${os.result.length > 12 ? 18 : 24}px ${font}`;
    ctx.fillText(os.result, SCREEN_W - 10, SCREEN_H - 16);
    ctx.textAlign = "left";
  }
}

const TILE_ICON: Record<string, (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, accent: string) => void> = {
  snake: (ctx, x, y, s, a) => {
    ctx.fillStyle = a;
    const u = s / 6;
    [[0, 4], [1, 4], [2, 4], [2, 3], [2, 2], [3, 2], [4, 2]].forEach(([cx, cy]) => ctx.fillRect(x + cx * u, y + cy * u, u - 0.5, u - 0.5));
    ctx.fillStyle = "#e8c35a";
    ctx.fillRect(x + 4.5 * u, y + 0.5 * u, u - 0.5, u - 0.5);
  },
  "2048": (ctx, x, y, s, a) => {
    const u = s / 2 - 1;
    [a, "#e8c35a", "#e3a24a", a].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(x + (i % 2) * (u + 2), y + Math.floor(i / 2) * (u + 2), u, u);
    });
  },
  tetris: (ctx, x, y, s, a) => {
    const u = s / 5;
    ctx.fillStyle = "#a98bff";
    [[1, 0], [2, 0], [3, 0], [2, 1]].forEach(([cx, cy]) => ctx.fillRect(x + cx * u, y + cy * u, u - 0.5, u - 0.5));
    ctx.fillStyle = a;
    [[0, 4], [1, 4], [1, 3], [2, 4]].forEach(([cx, cy]) => ctx.fillRect(x + cx * u, y + cy * u, u - 0.5, u - 0.5));
    ctx.fillStyle = "#4fb3ff";
    [[3, 4], [4, 4], [4, 3], [4, 2]].forEach(([cx, cy]) => ctx.fillRect(x + cx * u, y + cy * u, u - 0.5, u - 0.5));
  },
};

function genericIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, accent: string, name: string) {
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 2, y + 2, s - 4, s - 4);
  ctx.fillStyle = accent;
  ctx.font = `700 ${s * 0.45}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(name.charAt(0).toUpperCase(), x + s / 2, y + s * 0.68);
  ctx.textAlign = "left";
}

export function drawLauncher(ctx: CanvasRenderingContext2D, t: ScreenTheme, apps: readonly LauncherApp[], selected: number) {
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  // Soft glow in the corner, in the accent colour
  const glow = ctx.createRadialGradient(SCREEN_W - 30, 0, 4, SCREEN_W - 30, 0, 150);
  glow.addColorStop(0, t.accent);
  glow.addColorStop(1, "transparent");
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.globalAlpha = 1;
  ctx.fillStyle = t.accent;
  fillRound(ctx, 8, 5, 3, 9, 1.5);
  ctx.fillStyle = t.text;
  ctx.font = `700 9px ${t.font}`;
  ctx.fillText(t.welcome.toUpperCase(), 15, 12.5);
  ctx.font = `700 7px ${t.font}`;
  const pw = ctx.measureText("PLAY").width + 12;
  ctx.fillStyle = t.accent;
  fillRound(ctx, SCREEN_W - 8 - pw, 4, pw, 11, 5.5);
  ctx.fillStyle = t.onAccent;
  ctx.textAlign = "center";
  ctx.fillText("PLAY", SCREEN_W - 8 - pw / 2, 12);
  ctx.textAlign = "left";

  if (!apps.length) return;
  if (t.layout === "list") {
    const rowH = 18;
    const visible = 5;
    const start = Math.max(0, Math.min(selected - 2, apps.length - visible));
    apps.slice(start, start + visible).forEach((app, i) => {
      const idx = start + i;
      const y = 22 + i * rowH;
      ctx.fillStyle = t.panel;
      ctx.globalAlpha = idx === selected ? 1 : 0.55;
      fillRound(ctx, 6, y, SCREEN_W - 12, rowH - 2, 5);
      ctx.globalAlpha = 1;
      if (idx === selected) {
        ctx.fillStyle = t.accent;
        ctx.globalAlpha = 0.2;
        fillRound(ctx, 6, y, SCREEN_W - 12, rowH - 2, 5);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = t.accent;
        ctx.lineWidth = 1;
        strokeRound(ctx, 6.5, y + 0.5, SCREEN_W - 13, rowH - 3, 4.5);
      }
      (TILE_ICON[app.id] ?? ((c, x, yy, s, a) => genericIcon(c, x, yy, s, a, app.name)))(ctx, 14, y + 2, 12, t.accent);
      ctx.fillStyle = t.text;
      ctx.font = `600 9px ${t.font}`;
      ctx.fillText(app.name, 34, y + 11);
      if (!app.playable) {
        ctx.fillStyle = t.dim;
        ctx.textAlign = "right";
        ctx.font = `500 7px ${t.font}`;
        ctx.fillText("not in web demo", SCREEN_W - 12, y + 11);
        ctx.textAlign = "left";
      }
    });
    return;
  }

  const cols = 3;
  const gap = 6;
  const tileW = (SCREEN_W - 16 - gap * (cols - 1)) / cols;
  const tileH = 44;
  const rowsVisible = 2;
  const row = Math.floor(selected / cols);
  const firstRow = Math.max(0, row - rowsVisible + 1);
  apps.forEach((app, i) => {
    const r = Math.floor(i / cols) - firstRow;
    if (r < 0 || r >= rowsVisible) return;
    const x = 8 + (i % cols) * (tileW + gap);
    const y = 22 + r * (tileH + 4);
    const sel = i === selected;
    ctx.fillStyle = t.panel;
    fillRound(ctx, x, y, tileW, tileH, 7);
    if (sel) {
      ctx.fillStyle = t.accent;
      ctx.globalAlpha = 0.16;
      fillRound(ctx, x, y, tileW, tileH, 7);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = t.accent;
      ctx.lineWidth = 1.5;
      strokeRound(ctx, x + 0.75, y + 0.75, tileW - 1.5, tileH - 1.5, 6.25);
    }
    const s = 20;
    (TILE_ICON[app.id] ?? ((c, xx, yy, ss, a) => genericIcon(c, xx, yy, ss, a, app.name)))(ctx, x + (tileW - s) / 2, y + 5, s, t.accent);
    ctx.fillStyle = sel ? t.accent : app.playable ? t.text : t.dim;
    ctx.font = `${sel ? 700 : 600} 7.5px ${t.font}`;
    ctx.textAlign = "center";
    let label = app.name.toUpperCase();
    while (ctx.measureText(label).width > tileW - 6 && label.length > 3) label = label.slice(0, -2) + "…";
    ctx.fillText(label, x + tileW / 2, y + tileH - 7);
    ctx.textAlign = "left";
  });
  const totalRows = Math.ceil(apps.length / cols);
  if (totalRows > rowsVisible) {
    ctx.fillStyle = t.dim;
    ctx.font = `600 7px ${t.font}`;
    ctx.textAlign = "right";
    ctx.fillText(`${row + 1}/${totalRows}`, SCREEN_W - 8, SCREEN_H - 2);
    ctx.textAlign = "left";
  }
}

function drawOverlay(ctx: CanvasRenderingContext2D, t: ScreenTheme, title: string, detail: string, hint: string) {
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  const w = 196;
  const h = 70;
  const x = (SCREEN_W - w) / 2;
  const y = (SCREEN_H - h) / 2;
  ctx.fillStyle = "#151812";
  fillRound(ctx, x, y, w, h, 10);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  strokeRound(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 9.5);
  ctx.fillStyle = t.accent;
  fillRound(ctx, x + w / 2 - 14, y + 7, 28, 3, 1.5);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 15px ${t.font}`;
  ctx.fillText(title, SCREEN_W / 2, y + 28);
  ctx.fillStyle = t.accent;
  ctx.font = `700 10px ${t.font}`;
  ctx.fillText(detail, SCREEN_W / 2, y + 43);
  ctx.fillStyle = "#b9bdb2";
  ctx.font = `500 7.5px ${t.font}`;
  ctx.fillText(hint, SCREEN_W / 2, y + 60);
  ctx.textAlign = "left";
}

function drawIntro(ctx: CanvasRenderingContext2D, t: ScreenTheme, left: number) {
  const go = left < INTRO_MS * 0.35;
  const phase = go ? left / (INTRO_MS * 0.35) : (left - INTRO_MS * 0.35) / (INTRO_MS * 0.65);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  const scale = go ? 1 + (1 - phase) * 0.6 : 1 + phase * 0.15;
  ctx.globalAlpha = go ? Math.min(1, phase * 2) : 1;
  ctx.textAlign = "center";
  ctx.font = `900 ${Math.round(22 * scale)}px ${t.font}`;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillText(go ? "GO!" : "READY", SCREEN_W / 2 + 1, SCREEN_H / 2 + 9);
  ctx.fillStyle = go ? t.accent : "#ffffff";
  ctx.fillText(go ? "GO!" : "READY", SCREEN_W / 2, SCREEN_H / 2 + 8);
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}
