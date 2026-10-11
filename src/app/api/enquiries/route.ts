import { createEnquiry } from "@/lib/server/orders";
import { getDb } from "@/lib/server/db";
import { clientIp, errorResponse, json, rateLimit, readJson, sameOrigin } from "@/lib/server/http";

/** Public: store an order request or question. Nothing is emailed; it appears in the admin area. */
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return json({ error: "Cross-site request blocked." }, 403);
    const db = await getDb();
    if (!db) return json({ error: "Online requests aren't switched on yet. Nothing was sent." }, 503);
    const body = await readJson(req, 32 * 1024);
    if (typeof body.website === "string" && body.website.trim()) return json({ reference: "ENQ-0000" }); // honeypot: quietly ignore bots
    if (!(await rateLimit(db, `enq:${clientIp(req)}`, 6, 60))) {
      return json({ error: "Too many requests from here. Please try again later or email us." }, 429);
    }
    const { reference } = await createEnquiry(db, body as never);
    return json({ reference }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
