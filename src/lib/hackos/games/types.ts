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
  /** Keys this game uses that the system would otherwise treat as pause (e.g. EXE for a hard drop). */
  readonly ownKeys?: readonly HKey[];
  /** What a swipe on the screen sends (defaults to the matching arrow). */
  readonly swipe?: Partial<Record<"UP" | "DOWN" | "LEFT" | "RIGHT", HKey>>;
  /** What a tap on the screen sends, if anything. */
  readonly tap?: HKey;
  /** Extra on-screen button shown under the calculator. */
  readonly action?: { label: string; key: HKey };
  /** Holding these on-screen keys repeats them. */
  readonly repeatKeys?: readonly HKey[];
}

export type Rand = () => number;
