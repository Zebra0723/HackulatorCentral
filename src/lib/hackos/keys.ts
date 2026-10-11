/** Logical keys shared by the on-photo buttons, the computer keyboard and every screen mode. */
export type HKey =
  | "UP" | "DOWN" | "LEFT" | "RIGHT" | "OK" | "HOME" | "BACK"
  | "AC" | "DEL" | "EXE"
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "DOT" | "ADD" | "SUB" | "MUL" | "DIV" | "LPAREN" | "RPAREN"
  | "ANS" | "SQUARE" | "POWER" | "SQRT" | "EXP"
  | "ON" | "SETTINGS" | "PGUP" | "PGDN" | "SHIFT" | "VARIABLE" | "FUNCTION" | "CATALOG" | "TOOLS"
  | "X" | "FRAC" | "LOG" | "SIN" | "COS" | "TAN" | "FORMAT";

/** Map a KeyboardEvent.key to a calculator key. Returns null for keys we ignore. */
export function keyFromKeyboard(key: string): HKey | null {
  if (/^[0-9]$/.test(key)) return key as HKey;
  switch (key) {
    case "ArrowUp": return "UP";
    case "ArrowDown": return "DOWN";
    case "ArrowLeft": return "LEFT";
    case "ArrowRight": return "RIGHT";
    case "Enter": case "=": return "EXE";
    case " ": return "OK";
    case "Escape": return "BACK";
    case "Backspace": return "DEL";
    case "Delete": case "c": case "C": return "AC";
    case "h": case "H": case "Home": return "HOME";
    case ".": case ",": return "DOT";
    case "+": return "ADD";
    case "-": return "SUB";
    case "*": case "x": case "X": return "MUL";
    case "/": return "DIV";
    case "(": return "LPAREN";
    case ")": return "RPAREN";
    case "^": return "POWER";
    case "r": case "R": return "AC";
    case "p": case "P": return "OK";
    case "w": case "W": return "UP";
    case "s": case "S": return "DOWN";
    case "a": case "A": return "LEFT";
    case "d": case "D": return "RIGHT";
    default: return null;
  }
}
