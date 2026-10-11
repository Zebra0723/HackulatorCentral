import { UI_ACCENTS, UI_FONTS } from "@/config/offer";
import type { UiSettings } from "@/lib/pricing";

/** Logical screen size. Matches the display opening's 2.67:1 ratio. */
export const SCREEN_W = 320;
export const SCREEN_H = 120;

export interface ScreenTheme {
  bg: string;
  panel: string;
  text: string;
  dim: string;
  accent: string;
  onAccent: string;
  font: string;
  welcome: string;
  layout: "tiles" | "list";
}

export function themeFromUi(ui: UiSettings): ScreenTheme {
  const accent = UI_ACCENTS.find((a) => a.id === ui.accent)?.hex ?? "#b4e23c";
  const font = UI_FONTS.find((f) => f.id === ui.font)?.stack ?? "sans-serif";
  const dark = ui.appearance !== "light";
  return {
    bg: dark ? "#0e1109" : "#eef0e8",
    panel: dark ? "#1b2015" : "#ffffff",
    text: dark ? "#f3f1ec" : "#141413",
    dim: dark ? "#8f958a" : "#5f625a",
    accent,
    onAccent: "#141413",
    font,
    welcome: ui.welcome || "HACKULATOR",
    layout: ui.layout,
  };
}

/** Standard calculator LCD look used in calculator mode. */
export const CALC_THEME = { bg: "#c9d1b8", text: "#1a1f14", dim: "#5b6450" };
