/**
 * Best scores for the web-demo games. Kept in this browser only (localStorage)
 * as a convenience; falls back to memory when storage is unavailable. Nothing
 * here is sent anywhere.
 */
const KEY = "hackulator.best.v1";
let memory: Record<string, number> = {};
let loaded = false;

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (parsed && typeof parsed === "object") {
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === "number" && Number.isFinite(v) && v >= 0) memory[k] = Math.floor(v);
      }
    }
  } catch {
    // storage blocked: memory only
  }
}

export function getBest(game: string): number {
  load();
  return memory[game] ?? 0;
}

/** Record a finished score. Returns true when it beats the previous best. */
export function submitScore(game: string, score: number): boolean {
  load();
  if (score <= (memory[game] ?? 0)) return false;
  memory[game] = score;
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    // ignore
  }
  return true;
}

/** For tests. */
export function resetBests() {
  memory = {};
  loaded = true;
}
