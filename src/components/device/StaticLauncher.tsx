"use client";

import { DEFAULT_UI } from "@/lib/pricing";
import { DEMO_GAMES, drawLauncher } from "@/lib/hackos/os";
import { themeFromUi } from "@/lib/hackos/theme";
import { ScreenCanvas } from "./ScreenCanvas";

const theme = themeFromUi(DEFAULT_UI);

/** The standard launcher, drawn by the same renderer as the interactive demo. */
export function StaticLauncher() {
  return <ScreenCanvas className="device__canvas" draw={(ctx) => drawLauncher(ctx, theme, DEMO_GAMES, 0)} label="Launcher showing Snake, 2048 and Tetris" />;
}
