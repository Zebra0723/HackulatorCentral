import { cookies } from "next/headers";
import { SESSION_COOKIE, logout } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { errorResponse, json, sameOrigin } from "@/lib/server/http";

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return json({ error: "Cross-site request blocked." }, 403);
    const jar = await cookies();
    const db = await getDb();
    if (db) await logout(db, jar.get(SESSION_COOKIE)?.value);
    jar.delete(SESSION_COOKIE);
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
