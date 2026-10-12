import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { OWNER_CODE } from "@/lib/hackos/os";
import type { Db } from "./db";

/**
 * Owner sign-in: typing the owner code on the virtual calculator logs straight
 * into the control room. The owner chose this deliberately and accepts that the
 * code is not secret. The check still happens on the server, wrong guesses are
 * limited per address and across the whole site, and the session is an
 * httpOnly cookie.
 */

export const SESSION_COOKIE = "hk_admin";
export const SESSION_DAYS = 7;
const IP_MAX_FAILS = 8;
const SITE_MAX_FAILS = 100;
const WINDOW_MINUTES = 15;
const OWNER_EMAIL = "owner";

export interface Admin {
  id: number;
  email: string;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function sameCode(a: string, b: string) {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

async function failuresInWindow(db: Db, key: string): Promise<number> {
  const rows = await db.query<{ count: number; window_start: Date }>("select count, window_start from login_attempts where key = $1", [key]);
  if (!rows.length) return 0;
  const fresh = Date.now() - new Date(rows[0].window_start).getTime() < WINDOW_MINUTES * 60_000;
  return fresh ? rows[0].count : 0;
}

async function recordFailure(db: Db, key: string) {
  await db.query(
    `insert into login_attempts (key, count, window_start) values ($1, 1, now())
     on conflict (key) do update set
       count = case when login_attempts.window_start < now() - interval '${WINDOW_MINUTES} minutes' then 1 else login_attempts.count + 1 end,
       window_start = case when login_attempts.window_start < now() - interval '${WINDOW_MINUTES} minutes' then now() else login_attempts.window_start end`,
    [key],
  );
}

export type LoginResult = { ok: true; token: string; admin: Admin } | { ok: false; error: string };

export async function loginWithCode(db: Db, code: string, ip: string): Promise<LoginResult> {
  const ipKey = `code-ip:${ip}`;
  const siteKey = "code-site";
  if ((await failuresInWindow(db, ipKey)) >= IP_MAX_FAILS || (await failuresInWindow(db, siteKey)) >= SITE_MAX_FAILS) {
    return { ok: false, error: "Too many attempts. Wait 15 minutes and try again." };
  }
  const given = String(code ?? "").trim().slice(0, 32);
  if (!sameCode(given, OWNER_CODE)) {
    await recordFailure(db, ipKey);
    await recordFailure(db, siteKey);
    return { ok: false, error: "That code isn't right." };
  }
  await db.query("delete from login_attempts where key = $1", [ipKey]);
  await db.query("insert into admin_users (email, password_hash) values ($1, 'owner-code') on conflict (email) do nothing", [OWNER_EMAIL]);
  const [owner] = await db.query<Admin>("select id, email from admin_users where email = $1", [OWNER_EMAIL]);
  const token = randomBytes(32).toString("base64url");
  await db.query(`insert into admin_sessions (token_hash, user_id, expires_at) values ($1, $2, now() + interval '${SESSION_DAYS} days')`, [
    sha256(token),
    owner.id,
  ]);
  await db.query("update admin_users set last_login_at = now() where id = $1", [owner.id]);
  await db.query("delete from admin_sessions where expires_at < now()");
  return { ok: true, token, admin: owner };
}

export async function adminFromToken(db: Db, token: string | undefined): Promise<Admin | null> {
  if (!token || token.length > 200) return null;
  const rows = await db.query<Admin>(
    `select u.id, u.email from admin_sessions s join admin_users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now()`,
    [sha256(token)],
  );
  return rows[0] ?? null;
}

export async function logout(db: Db, token: string | undefined) {
  if (token) await db.query("delete from admin_sessions where token_hash = $1", [sha256(token)]);
}
