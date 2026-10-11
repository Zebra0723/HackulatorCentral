export const fmtDateTime = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }) : "—";
export const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" }) : "—";
export const penceToInput = (p: number | null | undefined) => (p == null ? "" : (p / 100).toFixed(2));
/** "12.50" / "£12.50" → 1250. Empty → null. */
export const inputToPence = (s: string): number | null | "invalid" => {
  const t = s.replace(/[£,\s]/g, "");
  if (!t) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return "invalid";
  return Math.round(parseFloat(t) * 100);
};
