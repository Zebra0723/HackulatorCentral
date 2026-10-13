import { getDb } from "@/lib/server/db";
import { clientIp, errorResponse, json, rateLimit, readJson, sameOrigin } from "@/lib/server/http";
import { subscribe } from "@/lib/server/mailing";

/** Public: sign up for the weekly email (consent required). Nothing is sent on sign-up. */
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return json({ error: "Cross-site request blocked." }, 403);
    const db = await getDb();
    if (!db) return json({ error: "Sign-ups aren't switched on yet." }, 503);
    const body = await readJson(req, 4 * 1024);
    if (typeof body.website === "string" && body.website.trim()) return json({ ok: true }); // honeypot
    if (!(await rateLimit(db, `mail:${clientIp(req)}`, 6, 60))) {
      return json({ error: "Too many tries from here. Please try again later." }, 429);
    }
    return json(await subscribe(db, body), 201);
  } catch (e) {
    return errorResponse(e);
  }
}
