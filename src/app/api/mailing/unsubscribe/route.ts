import { getDb } from "@/lib/server/db";
import { errorResponse, json } from "@/lib/server/http";
import { unsubscribe } from "@/lib/server/mailing";

/**
 * Unsubscribe by the private token in each email. Works from the /unsubscribe page
 * and from mail apps' one-click "Unsubscribe" button (RFC 8058), which posts from
 * outside the site, so there is no same-origin check. The token is the only key.
 */
export async function POST(req: Request) {
  try {
    const db = await getDb();
    if (!db) return json({ error: "Not available right now." }, 503);
    let token = new URL(req.url).searchParams.get("t");
    if (!token && (req.headers.get("content-type") ?? "").includes("application/json")) {
      const body = (await req.json().catch(() => ({}))) as { token?: unknown };
      token = typeof body.token === "string" ? body.token : null;
    }
    const r = await unsubscribe(db, token);
    return r.ok ? json({ ok: true }) : json({ error: "That unsubscribe link isn't valid." }, 404);
  } catch (e) {
    return errorResponse(e);
  }
}
