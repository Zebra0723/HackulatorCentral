import { getDb } from "@/lib/server/db";
import { clientIp, errorResponse, json, rateLimit, readJson, sameOrigin } from "@/lib/server/http";
import { joinWaitlist } from "@/lib/server/waitlist";

/** Public: join the waitlist. Free, no obligation. Nothing is emailed; the owner sees it in the control room. */
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return json({ error: "Cross-site request blocked." }, 403);
    const db = await getDb();
    if (!db) return json({ error: "The waitlist isn't switched on yet. Nothing was sent." }, 503);
    const body = await readJson(req, 8 * 1024);
    if (typeof body.website === "string" && body.website.trim()) return json({ ok: true, already: false, queueNumber: null }); // honeypot
    if (!(await rateLimit(db, `wait:${clientIp(req)}`, 5, 60))) {
      return json({ error: "Too many tries from here. Please try again later." }, 429);
    }
    const result = await joinWaitlist(db, body);
    return json(result, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
