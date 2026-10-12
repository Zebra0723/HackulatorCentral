/** Where this browser remembers the visitor's own waitlist ID (convenience only; the server checks it). */
export const WAITLIST_ID_KEY = "hackulator.waitlistId";

export function readSavedWaitlistId(): string {
  try {
    return localStorage.getItem(WAITLIST_ID_KEY) ?? "";
  } catch {
    return "";
  }
}
