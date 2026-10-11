import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Db } from "./db";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;

export const SESSION_COOKIE = "hk_admin";
export const SESSION_DAYS = 7;
const MAX_ATTEMPTS = 8;
const WINDOW_MINUTES = 15;

export interface Admin {
  id: number;
  email: string;
}

const N = 16384, R = 8, P = 1, KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64");
  const got = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  });
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export function validateNewPassword(pw: string): string | null {
  if (pw.length < 12) return "Use at least 12 characters.";
  if (pw.length > 200) return "That password is too long.";
  if (/^(.)\1+$/.test(pw)) return "Choose a less predictable password.";
  return null;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createAdmin(db: Db, email: string, password: string): Promise<Admin> {
  const err = validateNewPassword(password);
  if (err) throw new Error(err);
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error("Enter a valid email address.");
  const hash = await hashPassword(password);
  const rows = await db.query<Admin>(
    `insert into admin_users (email, password_hash) values ($1,$2)
     on conflict (email) do update set password_hash = excluded.password_hash
     returning id, email`,
    [clean, hash],
  );
  // Changing a password signs out existing sessions for that account.
  await db.query("delete from admin_sessions where user_id = $1", [rows[0].id]);
  return rows[0];
}

/** Returns false when this key has had too many recent failures. */
async function allowAttempt(db: Db, key: string): Promise<boolean> {
  const rows = await db.query<{ count: number; window_start: Date }>(
    "select count, window_start from login_attempts where key = $1",
    [key],
  );
  if (!rows.length) return true;
  const fresh = Date.now() - new Date(rows[0].window_start).getTime() < WINDOW_MINUTES * 60_000;
  return !fresh || rows[0].count < MAX_ATTEMPTS;
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

export async function login(db: Db, email: string, password: string, ip: string): Promise<LoginResult> {
  const clean = String(email ?? "").trim().toLowerCase().slice(0, 200);
  const keys = [`email:${clean}`, `ip:${ip}`];
  for (const k of keys) if (!(await allowAttempt(db, k))) return { ok: false, error: "Too many attempts. Wait 15 minutes and try again." };
  const rows = await db.query<{ id: number; email: string; password_hash: string }>(
    "select id, email, password_hash from admin_users where email = $1",
    [clean],
  );
  // Always run a hash so response time doesn't reveal whether the email exists.
  const ok = rows.length
    ? await verifyPassword(String(password ?? ""), rows[0].password_hash)
    : (await verifyPassword(String(password ?? ""), await hashPassword("timing-equaliser-not-a-password")), false);
  if (!ok) {
    for (const k of keys) await recordFailure(db, k);
    return { ok: false, error: "Email or password is incorrect." };
  }
  for (const k of keys) await db.query("delete from login_attempts where key = $1", [k]);
  const token = randomBytes(32).toString("base64url");
  await db.query(
    `insert into admin_sessions (token_hash, user_id, expires_at) values ($1, $2, now() + interval '${SESSION_DAYS} days')`,
    [sha256(token), rows[0].id],
  );
  await db.query("update admin_users set last_login_at = now() where id = $1", [rows[0].id]);
  await db.query("delete from admin_sessions where expires_at < now()");
  return { ok: true, token, admin: { id: rows[0].id, email: rows[0].email } };
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

export async function adminCount(db: Db): Promise<number> {
  const [{ n }] = await db.query<{ n: number }>("select count(*)::int as n from admin_users");
  return n;
}
