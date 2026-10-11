import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, adminFromToken, type Admin } from "./auth";
import { ValidationError } from "./catalogue";
import { NoDatabaseError, getDb, type Db } from "./db";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function errorResponse(e: unknown) {
  if (e instanceof ValidationError) return json({ error: e.message }, 400);
  if (e instanceof NoDatabaseError) return json({ error: e.message }, 503);
  console.error(e);
  return json({ error: "Something went wrong on the server. Nothing was changed." }, 500);
}

/** Reject cross-site requests for anything that changes data. */
export function sameOrigin(req: Request): boolean {
  if (req.method === "GET" || req.method === "HEAD") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readJson(req: Request, maxBytes = 64 * 1024): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > maxBytes) throw new ValidationError("Request too large.");
  try {
    const v = JSON.parse(text || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    throw new ValidationError("Invalid request.");
  }
}

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

/**
 * Wrap an admin Route Handler: database present, valid session, same-origin for
 * writes. Every admin action goes through this; there is no client-side-only check.
 */
export async function withAdmin(req: Request, fn: (ctx: { db: Db; admin: Admin }) => Promise<Response>) {
  try {
    if (!sameOrigin(req)) return json({ error: "Cross-site request blocked." }, 403);
    const db = await getDb();
    if (!db) return json({ error: new NoDatabaseError().message }, 503);
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const admin = await adminFromToken(db, token);
    if (!admin) return json({ error: "Please sign in." }, 401);
    return await fn({ db, admin });
  } catch (e) {
    return errorResponse(e);
  }
}

/** For admin Server Components: returns the signed-in owner or redirects to the login page. */
export async function requireAdminPage(): Promise<{ db: Db; admin: Admin }> {
  const db = await getDb();
  if (!db) redirect("/admin/login");
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const admin = await adminFromToken(db, token);
  if (!admin) redirect("/admin/login");
  return { db, admin };
}

export const idParam = (v: string) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new ValidationError("Invalid id.");
  return n;
};

/** Simple fixed-window limiter backed by the database (works across serverless instances). */
export async function rateLimit(db: Db, key: string, max: number, minutes: number): Promise<boolean> {
  const rows = await db.query<{ count: number }>(
    `insert into login_attempts (key, count, window_start) values ($1, 1, now())
     on conflict (key) do update set
       count = case when login_attempts.window_start < now() - make_interval(mins => $2) then 1 else login_attempts.count + 1 end,
       window_start = case when login_attempts.window_start < now() - make_interval(mins => $2) then now() else login_attempts.window_start end
     returning count`,
    [key, minutes],
  );
  return rows[0].count <= max;
}
