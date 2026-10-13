import "server-only";
import { audit } from "./audit";
import { ValidationError } from "./catalogue";
import type { Db } from "./db";
import { getSettings } from "./settings";
import { newWaitlistCode, normalizeWaitlistCode } from "./waitlist-code";

export const WAITLIST_STATUSES = ["waiting", "contacted", "converted", "withdrawn"] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];
export const WAITLIST_STATUS_LABEL: Record<WaitlistStatus, string> = {
  waiting: "Waiting",
  contacted: "Contacted",
  converted: "Became an order",
  withdrawn: "Withdrawn",
};

export interface WaitlistRow {
  id: number;
  position: number;
  name: string;
  email: string;
  note: string;
  private_note: string;
  status: WaitlistStatus;
  source: string;
  code: string;
  created_at: Date;
  updated_at: Date;
}

export interface WaitlistSummary {
  spots: number;
  taken: number;
  left: number;
  open: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(v: unknown, max: number) {
  return String(v ?? "")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, max);
}

/** Withdrawn entries don't hold a spot. */
async function takenCount(db: Db) {
  const [r] = await db.query<{ n: number }>("select count(*)::int as n from waitlist where status <> 'withdrawn'");
  return r.n;
}

export async function waitlistSummary(db: Db | null): Promise<WaitlistSummary> {
  const s = await getSettings(db);
  const taken = db ? await takenCount(db) : 0;
  return { spots: s.waitlistSpots, taken, left: Math.max(0, s.waitlistSpots - taken), open: s.waitlistOpen };
}

/** Queue number among people still holding a spot. */
async function queueNumber(db: Db, id: number) {
  const [r] = await db.query<{ n: number }>(
    `select count(*)::int as n from waitlist
      where status <> 'withdrawn' and position <= (select position from waitlist where id = $1)`,
    [id],
  );
  return r.n;
}

export type JoinResult = {
  ok: true;
  already: boolean;
  queueNumber: number | null;
  /** Shown once to the person who just joined; needed to place an order. Never returned for an existing email. */
  waitlistId: string | null;
  summary: WaitlistSummary;
};

/** Public join. Free, no obligation; it only records a place in the queue. */
export async function joinWaitlist(db: Db, input: Record<string, unknown>): Promise<JoinResult> {
  const name = clean(input.name, 80);
  const email = clean(input.email, 160).toLowerCase();
  const note = clean(input.note, 300);
  if (!name) throw new ValidationError("Please enter your name.");
  if (!EMAIL_RE.test(email)) throw new ValidationError("Please enter a valid email address.");
  if (input.consent !== true) throw new ValidationError("Please tick the box so we're allowed to contact you about your spot.");

  const result = await db.tx(async (t) => {
    await t.exec("lock table waitlist in share row exclusive mode");
    const existing = await t.query<{ id: number }>("select id from waitlist where lower(email) = $1", [email]);
    if (existing.length) return { already: true, id: null as number | null, code: null as string | null };
    const settings = await getSettings(t);
    if (!settings.waitlistOpen) throw new ValidationError("The waitlist is closed right now. Email us and we'll let you know when it reopens.");
    if ((await takenCount(t)) >= settings.waitlistSpots) {
      throw new ValidationError("Every spot has just been taken. Email us to hear if one opens up.");
    }
    const [{ next }] = await t.query<{ next: number }>("select coalesce(max(position), 0) + 1 as next from waitlist");
    const code = newWaitlistCode();
    const [row] = await t.query<{ id: number }>(
      "insert into waitlist (position, name, email, note, code) values ($1,$2,$3,$4,$5) returning id",
      [next, name, email, note, code],
    );
    return { already: false, id: row.id, code };
  });
  const summary = await waitlistSummary(db);
  // Someone already on the list gets the same friendly answer without any of their details.
  return {
    ok: true,
    already: result.already,
    queueNumber: result.id ? await queueNumber(db, result.id) : null,
    waitlistId: result.code,
    summary,
  };
}

export async function listWaitlist(db: Db) {
  return db.query<WaitlistRow & { queue_number: number | null }>(
    `select w.*, case when w.status = 'withdrawn' then null
       else (select count(*)::int from waitlist x where x.status <> 'withdrawn' and x.position <= w.position) end as queue_number
     from waitlist w order by w.position`,
  );
}

/** Owner adds someone by hand (e.g. asked in person). Allowed even when full; the owner decides. */
export async function addWaitlistEntry(db: Db, actor: string, input: Record<string, unknown>) {
  const name = clean(input.name, 80);
  const email = clean(input.email, 160).toLowerCase();
  if (!name) throw new ValidationError("Name is required.");
  if (!EMAIL_RE.test(email)) throw new ValidationError("Enter a valid email address.");
  const dup = await db.query("select 1 from waitlist where lower(email) = $1", [email]);
  if (dup.length) throw new ValidationError("That email is already on the waitlist.");
  const [{ next }] = await db.query<{ next: number }>("select coalesce(max(position), 0) + 1 as next from waitlist");
  const [row] = await db.query<{ id: number }>(
    "insert into waitlist (position, name, email, note, private_note, source, code) values ($1,$2,$3,$4,$5,'owner',$6) returning id",
    [next, name, email, clean(input.note, 300), clean(input.privateNote, 1000), newWaitlistCode()],
  );
  await audit(db, actor, "waitlist.add", "waitlist", row.id);
  return row.id;
}

export async function updateWaitlistEntry(db: Db, actor: string, id: number, input: Record<string, unknown>) {
  const [cur] = await db.query<WaitlistRow>("select * from waitlist where id = $1", [id]);
  if (!cur) throw new ValidationError("That waitlist entry no longer exists.");
  const name = "name" in input ? clean(input.name, 80) : cur.name;
  const email = "email" in input ? clean(input.email, 160).toLowerCase() : cur.email;
  const status = "status" in input ? String(input.status) : cur.status;
  if (!name) throw new ValidationError("Name is required.");
  if (!EMAIL_RE.test(email)) throw new ValidationError("Enter a valid email address.");
  if (!(WAITLIST_STATUSES as readonly string[]).includes(status)) throw new ValidationError("Unknown status.");
  if (email !== cur.email) {
    const dup = await db.query("select 1 from waitlist where lower(email) = $1 and id <> $2", [email, id]);
    if (dup.length) throw new ValidationError("That email is already on the waitlist.");
  }
  await db.query(
    "update waitlist set name=$2, email=$3, note=$4, private_note=$5, status=$6, updated_at=now() where id=$1",
    [id, name, email, "note" in input ? clean(input.note, 300) : cur.note, "privateNote" in input ? clean(input.privateNote, 1000) : cur.private_note, status],
  );
  await audit(db, actor, "waitlist.update", "waitlist", id, { status });
}

/** Swap with the neighbour above or below. */
export async function moveWaitlistEntry(db: Db, actor: string, id: number, dir: "up" | "down") {
  await db.tx(async (t) => {
    const [cur] = await t.query<{ position: number }>("select position from waitlist where id = $1", [id]);
    if (!cur) throw new ValidationError("That waitlist entry no longer exists.");
    const [other] = await t.query<{ id: number; position: number }>(
      dir === "up"
        ? "select id, position from waitlist where position < $1 order by position desc limit 1"
        : "select id, position from waitlist where position > $1 order by position asc limit 1",
      [cur.position],
    );
    if (!other) return;
    await t.query("update waitlist set position = $2, updated_at = now() where id = $1", [id, other.position]);
    await t.query("update waitlist set position = $2, updated_at = now() where id = $1", [other.id, cur.position]);
  });
  await audit(db, actor, "waitlist.move", "waitlist", id, { dir });
}

export async function deleteWaitlistEntry(db: Db, actor: string, id: number) {
  await db.query("delete from waitlist where id = $1", [id]);
  await audit(db, actor, "waitlist.delete", "waitlist", id);
}

/** Give someone a fresh waitlist ID (e.g. if theirs was shared by mistake). The old one stops working. */
export async function regenerateWaitlistCode(db: Db, actor: string, id: number) {
  const rows = await db.query("update waitlist set code = $2, updated_at = now() where id = $1 returning id", [id, newWaitlistCode()]);
  if (!rows.length) throw new ValidationError("That waitlist entry no longer exists.");
  await audit(db, actor, "waitlist.newid", "waitlist", id);
}

/** Look up an active waitlist place from the ID someone typed. */
export async function findActiveWaitlistEntry(db: Db, input: unknown): Promise<WaitlistRow | null> {
  const code = normalizeWaitlistCode(input);
  if (!code) return null;
  const [row] = await db.query<WaitlistRow>("select * from waitlist where code = $1", [code]);
  return row && row.status !== "withdrawn" ? row : null;
}

export interface WaitlistStatusView {
  /** First name only, so a found ID shows it's the right spot without revealing more. */
  firstName: string;
  code: string;
  status: WaitlistStatus;
  queueNumber: number | null;
  spots: number;
  joined: string;
  requests: { reference: string; status: string; created: string }[];
}

/**
 * Public lookup by waitlist ID. Shows only what the ID holder needs: first name,
 * place in the queue, status and their own order requests. Never the email or notes.
 */
export async function waitlistStatus(db: Db, input: unknown): Promise<WaitlistStatusView | null> {
  const code = normalizeWaitlistCode(input);
  if (!code) return null;
  const [row] = await db.query<WaitlistRow>("select * from waitlist where code = $1", [code]);
  if (!row) return null;
  const requests = await db.query<{ reference: string; status: string; created_at: Date }>(
    "select reference, status, created_at from enquiries where waitlist_id = $1 and kind = 'order' order by created_at desc limit 20",
    [row.id],
  );
  const settings = await getSettings(db);
  return {
    firstName: row.name.split(/\s+/)[0] ?? "",
    code,
    status: row.status,
    queueNumber: row.status === "withdrawn" ? null : await queueNumber(db, row.id),
    spots: settings.waitlistSpots,
    joined: new Date(row.created_at).toISOString(),
    requests: requests.map((r) => ({ reference: r.reference, status: r.status, created: new Date(r.created_at).toISOString() })),
  };
}
