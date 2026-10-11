/**
 * Visual "juice" shared by the web-demo games: particles, floating score text,
 * screen shake and flashes. Purely cosmetic; advanced only from a game's tick(),
 * so nothing moves while a game is paused.
 */

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string }
interface Floater { text: string; x: number; y: number; life: number; max: number; color: string; size: number }

export class Fx {
  particles: Particle[] = [];
  floaters: Floater[] = [];
  shakeLeft = 0;
  shakeMag = 0;
  flashLeft = 0;
  flashMax = 1;
  flashColor = "#ffffff";

  clear() {
    this.particles = [];
    this.floaters = [];
    this.shakeLeft = 0;
    this.flashLeft = 0;
  }

  burst(x: number, y: number, color: string, count = 10, speed = 60, size = 1.6) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.65);
      const max = 380 + Math.random() * 260;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.25, life: max, max, size: size * (0.6 + Math.random() * 0.8), color });
    }
    if (this.particles.length > 220) this.particles.splice(0, this.particles.length - 220);
  }

  float(text: string, x: number, y: number, color: string, size = 9) {
    this.floaters.push({ text, x, y, life: 800, max: 800, color, size });
    if (this.floaters.length > 12) this.floaters.shift();
  }

  shake(mag: number, ms = 220) {
    this.shakeMag = Math.max(this.shakeMag * (this.shakeLeft > 0 ? 1 : 0), mag);
    this.shakeLeft = Math.max(this.shakeLeft, ms);
  }

  flash(color: string, ms = 160) {
    this.flashColor = color;
    this.flashLeft = ms;
    this.flashMax = ms;
  }

  update(dt: number) {
    const s = dt / 1000;
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * s;
      p.y += p.vy * s;
      p.vy += 140 * s;
      p.vx *= 1 - 1.8 * s;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) {
      f.life -= dt;
      f.y -= 22 * s;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    this.shakeLeft = Math.max(0, this.shakeLeft - dt);
    this.flashLeft = Math.max(0, this.flashLeft - dt);
  }

  /** Offset for the current frame. Deterministic per remaining time so draw() stays pure. */
  offset(): [number, number] {
    if (this.shakeLeft <= 0) return [0, 0];
    const k = this.shakeMag * Math.min(1, this.shakeLeft / 160);
    return [Math.sin(this.shakeLeft * 0.9) * k, Math.cos(this.shakeLeft * 1.3) * k * 0.6];
  }

  draw(ctx: CanvasRenderingContext2D, font: string, w: number, h: number) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    for (const f of this.floaters) {
      const t = f.life / f.max;
      ctx.globalAlpha = Math.min(1, t * 2.2);
      ctx.font = `800 ${f.size}px ${font}`;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillText(f.text, f.x + 0.6, f.y + 0.8);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
    if (this.flashLeft > 0) {
      ctx.globalAlpha = 0.35 * (this.flashLeft / this.flashMax);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }
}

/** Ease-out for short UI animations (0..1 → 0..1). */
export const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/** Small overshoot used for "pop" effects. */
export const easeBack = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};
