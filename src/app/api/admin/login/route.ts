import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_DAYS, loginWithCode } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { clientIp, errorResponse, json, readJson, sameOrigin } from "@/lib/server/http";

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return json({ error: "Cross-site request blocked." }, 403);
    const db = await getDb();
    if (!db) return json({ error: "No database is configured yet." }, 503);
    const body = await readJson(req, 4096);
    const result = await loginWithCode(db, String(body.code ?? ""), clientIp(req));
    if (!result.ok) return json({ error: result.error }, 401);
    (await cookies()).set(SESSION_COOKIE, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
