import { getDb } from "@/lib/server/db";
import { clientIp, errorResponse, json, rateLimit, readJson, sameOrigin } from "@/lib/server/http";
import { waitlistStatus } from "@/lib/server/waitlist";

/** Public: look up your own spot by waitlist ID. Rate-limited so IDs can't be guessed. */
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return json({ error: "Cross-site request blocked." }, 403);
    const db = await getDb();
    if (!db) return json({ error: "The waitlist isn't switched on yet." }, 503);
    if (!(await rateLimit(db, `wlstatus:${clientIp(req)}`, 20, 15))) {
      return json({ error: "Too many lookups from here. Please wait a few minutes and try again." }, 429);
    }
    const body = await readJson(req, 2 * 1024);
    const view = await waitlistStatus(db, body.id);
    if (!view) return json({ error: "That waitlist ID wasn't found. Check it and try again." }, 404);
    return json(view);
  } catch (e) {
    return errorResponse(e);
  }
}
