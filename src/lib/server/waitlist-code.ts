import { randomInt } from "node:crypto";

/** Unambiguous characters only (no 0/O, 1/I/L). 31^8 ≈ 850 billion combinations. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A random waitlist ID like HK-7Q4M-2XRP. Random, so one ID can't be guessed from another. */
export function newWaitlistCode(): string {
  const pick = () => ALPHABET[randomInt(ALPHABET.length)];
  const part = () => Array.from({ length: 4 }, pick).join("");
  return `HK-${part()}-${part()}`;
}

/** Accepts "hk7q4m2xrp", "HK-7Q4M-2XRP", "7q4m 2xrp" and so on. Returns null if it can't be a waitlist ID. */
export function normalizeWaitlistCode(input: unknown): string | null {
  let s = String(input ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.startsWith("HK") && s.length === 10) s = s.slice(2);
  if (s.length !== 8 || [...s].some((c) => !ALPHABET.includes(c))) return null;
  return `HK-${s.slice(0, 4)}-${s.slice(4)}`;
}
