import type { HKey } from "../keys";
import type { ScreenTheme } from "../theme";

export interface GameSim {
  readonly id: string;
  readonly title: string;
  /** One-line control hint shown on the pause screen and below the calculator. */
  readonly controls: string;
  score: number;
  over: boolean;
  key(k: HKey): void;
  /** Advance the simulation. Never called while paused or offscreen. */
  tick(dtMs: number): void;
  draw(ctx: CanvasRenderingContext2D, theme: ScreenTheme): void;
  reset(): void;
}

export type Rand = () => number;
