import type { HKey } from "@/lib/hackos/keys";

/** Source photo: public/media/hackulator-front.webp, cut from the supplied ad. */
export const PHOTO = { src: "/media/hackulator-front.webp", w: 590, h: 1190 };

/** Display opening inside the photo (pixels in the source image). */
export const SCREEN_RECT = { x: 66, y: 191, w: 446, h: 167 };

/** Key centres and radii measured on the photo. */
export const KEYS: { k: HKey; x: number; y: number; r: number; label: string }[] = [
  { k: "ON", x: 82, y: 465, r: 26, label: "On" },
  { k: "HOME", x: 165, y: 470, r: 30, label: "Home" },
  { k: "SETTINGS", x: 82, y: 545, r: 30, label: "Settings" },
  { k: "BACK", x: 165, y: 545, r: 30, label: "Back" },
  { k: "UP", x: 330, y: 470, r: 30, label: "Up" },
  { k: "LEFT", x: 247, y: 545, r: 30, label: "Left" },
  { k: "OK", x: 330, y: 545, r: 32, label: "OK" },
  { k: "RIGHT", x: 413, y: 545, r: 30, label: "Right" },
  { k: "DOWN", x: 330, y: 618, r: 30, label: "Down" },
  { k: "PGUP", x: 497, y: 478, r: 30, label: "Page up" },
  { k: "PGDN", x: 497, y: 545, r: 30, label: "Page down" },
  { k: "SHIFT", x: 82, y: 632, r: 30, label: "Shift" },
  { k: "VARIABLE", x: 164, y: 632, r: 30, label: "Variable" },
  { k: "FUNCTION", x: 248, y: 632, r: 30, label: "Function" },
  { k: "CATALOG", x: 414, y: 632, r: 30, label: "Catalog" },
  { k: "TOOLS", x: 497, y: 632, r: 30, label: "Tools" },
  { k: "X", x: 82, y: 705, r: 30, label: "x" },
  { k: "FRAC", x: 164, y: 705, r: 30, label: "Fraction" },
  { k: "SQRT", x: 248, y: 705, r: 30, label: "Square root" },
  { k: "POWER", x: 330, y: 705, r: 30, label: "Power" },
  { k: "SQUARE", x: 414, y: 705, r: 30, label: "Square" },
  { k: "LOG", x: 497, y: 705, r: 30, label: "Log" },
  { k: "ANS", x: 82, y: 778, r: 30, label: "Ans" },
  { k: "SIN", x: 164, y: 778, r: 30, label: "sin" },
  { k: "COS", x: 248, y: 778, r: 30, label: "cos" },
  { k: "TAN", x: 330, y: 778, r: 30, label: "tan" },
  { k: "LPAREN", x: 414, y: 778, r: 30, label: "Open bracket" },
  { k: "RPAREN", x: 497, y: 778, r: 30, label: "Close bracket" },
  { k: "7", x: 85, y: 858, r: 34, label: "7" },
  { k: "8", x: 187, y: 858, r: 34, label: "8" },
  { k: "9", x: 289, y: 858, r: 34, label: "9" },
  { k: "DEL", x: 391, y: 858, r: 34, label: "Delete" },
  { k: "AC", x: 494, y: 858, r: 34, label: "AC (clear)" },
  { k: "4", x: 85, y: 945, r: 34, label: "4" },
  { k: "5", x: 187, y: 945, r: 34, label: "5" },
  { k: "6", x: 289, y: 945, r: 34, label: "6" },
  { k: "MUL", x: 391, y: 945, r: 34, label: "Multiply" },
  { k: "DIV", x: 494, y: 945, r: 34, label: "Divide" },
  { k: "1", x: 85, y: 1030, r: 34, label: "1" },
  { k: "2", x: 187, y: 1030, r: 34, label: "2" },
  { k: "3", x: 289, y: 1030, r: 34, label: "3" },
  { k: "ADD", x: 391, y: 1030, r: 34, label: "Plus" },
  { k: "SUB", x: 494, y: 1030, r: 34, label: "Minus" },
  { k: "0", x: 85, y: 1115, r: 34, label: "0" },
  { k: "DOT", x: 187, y: 1115, r: 34, label: "Decimal point" },
  { k: "EXP", x: 289, y: 1115, r: 34, label: "Times ten to the power" },
  { k: "FORMAT", x: 391, y: 1115, r: 34, label: "Format" },
  { k: "EXE", x: 494, y: 1115, r: 34, label: "EXE (equals)" },
];

export const pct = (v: number, of: number) => `${(v / of) * 100}%`;
