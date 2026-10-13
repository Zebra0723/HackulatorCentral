import "server-only";
import { audit } from "./audit";
import { ValidationError, parsePence } from "./catalogue";
import type { Db } from "./db";

/* Device records are maintained by the owner. They are NOT live readings from
 * an offline calculator. Future import/export with the calculator's own Order
 * Manager would go through exportAll()/a matching import, never a live sync. */

export interface DeviceRow {
  id: number;
  reference: string;
  order_id: number | null;
  owner_name: string;
  hardware_revision: string;
  software_version: string;
  owned: string[];
  installed: string[];
  notes: string;
  created_at: Date;
  updated_at: Date;
}

export const SERVICE_CATEGORIES = ["SOFTWARE", "REPAIR", "UI CHANGE"] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

/** The agreed structured actions per category. */
export const SERVICE_ACTIONS: Record<ServiceCategory, string[]> = {
  SOFTWARE: ["Install", "Update", "Reinstall", "Remove"],
  REPAIR: ["Diagnose", "Repair", "Replace part"],
  "UI CHANGE": ["Apply Custom UI", "Change Custom UI", "Revert to standard UI"],
};

/** Installs, updates and reinstalls of owned software are always covered: no fee. */
const ALWAYS_COVERED = new Set(["SOFTWARE:Install", "SOFTWARE:Update", "SOFTWARE:Reinstall", "SOFTWARE:Remove"]);

export interface ServiceRow {
  id: number;
  device_id: number;
  category: ServiceCategory;
  action: string;
  description: string;
  covered: boolean;
  price_pence: number | null;
  created_by: string;
  created_at: Date;
}

const t = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown) =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split(/[\n,]/) : [])
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, 100);

export async function listDevices(db: Db) {
  return db.query<DeviceRow & { order_reference: string | null }>(
    `select d.*, o.reference as order_reference from devices d left join orders o on o.id = d.order_id order by d.reference desc`,
  );
}

export async function getDevice(db: Db, id: number) {
  const d = (await db.query<DeviceRow & { order_reference: string | null }>(
    "select d.*, o.reference as order_reference from devices d left join orders o on o.id = d.order_id where d.id = $1",
    [id],
  ))[0];
  if (!d) return null;
  const services = await db.query<ServiceRow>("select * from service_records where device_id = $1 order by created_at desc", [id]);
  return { device: d, services };
}

export interface DeviceInput {
  orderId?: unknown;
  ownerName?: unknown;
  hardwareRevision?: unknown;
  softwareVersion?: unknown;
  owned?: unknown;
  installed?: unknown;
  notes?: unknown;
}

async function resolveOrder(db: Db, orderId: unknown): Promise<number | null> {
  if (orderId === undefined || orderId === null || orderId === "") return null;
  const rows = await db.query<{ id: number }>("select id from orders where id = $1 or reference = $2", [Number(orderId) || 0, String(orderId)]);
  if (!rows.length) throw new ValidationError("That order doesn't exist.");
  return rows[0].id;
}

export async function createDevice(db: Db, actor: string, input: DeviceInput) {
  const orderId = await resolveOrder(db, input.orderId);
  return db.tx(async (tx) => {
    const [{ n }] = await tx.query<{ n: number }>("select nextval('device_ref_seq')::int as n");
    const reference = `HACK-${String(n).padStart(4, "0")}`;
    const rows = await tx.query<DeviceRow>(
      `insert into devices (reference, order_id, owner_name, hardware_revision, software_version, owned, installed, notes)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8) returning *`,
      [reference, orderId, t(input.ownerName, 80), t(input.hardwareRevision, 40), t(input.softwareVersion, 40),
        JSON.stringify(list(input.owned)), JSON.stringify(list(input.installed)), t(input.notes, 2000)],
    );
    await audit(tx, actor, "device.create", "device", rows[0].id, { reference, orderId });
    return rows[0];
  });
}

export async function updateDevice(db: Db, actor: string, id: number, input: DeviceInput) {
  const orderId = await resolveOrder(db, input.orderId);
  const rows = await db.query<DeviceRow>(
    `update devices set order_id=$2, owner_name=$3, hardware_revision=$4, software_version=$5, owned=$6::jsonb, installed=$7::jsonb,
       notes=$8, updated_at=now() where id=$1 returning *`,
    [id, orderId, t(input.ownerName, 80), t(input.hardwareRevision, 40), t(input.softwareVersion, 40),
      JSON.stringify(list(input.owned)), JSON.stringify(list(input.installed)), t(input.notes, 2000)],
  );
  if (!rows.length) throw new ValidationError("Device not found.");
  await audit(db, actor, "device.update", "device", id, { softwareVersion: rows[0].software_version, hardwareRevision: rows[0].hardware_revision });
  return rows[0];
}

export async function addService(
  db: Db,
  actor: string,
  deviceId: number,
  input: { category?: unknown; action?: unknown; description?: unknown; covered?: unknown; pricePence?: unknown },
) {
  const category = SERVICE_CATEGORIES.find((c) => c === input.category);
  if (!category) throw new ValidationError("Choose SOFTWARE, REPAIR or UI CHANGE.");
  const action = SERVICE_ACTIONS[category].find((a) => a === input.action);
  if (!action) throw new ValidationError("Choose an action.");
  const alwaysCovered = ALWAYS_COVERED.has(`${category}:${action}`);
  const covered = alwaysCovered || input.covered === true;
  const price = covered ? null : parsePence(input.pricePence, "Price");
  if (covered && input.pricePence != null && input.pricePence !== "" && Number(input.pricePence) > 0) {
    throw new ValidationError("Covered work can't be charged. Untick “covered” only for genuinely chargeable work.");
  }
  const dev = await db.query("select id from devices where id = $1", [deviceId]);
  if (!dev.length) throw new ValidationError("Device not found.");
  await db.query(
    "insert into service_records (device_id, category, action, description, covered, price_pence, created_by) values ($1,$2,$3,$4,$5,$6,$7)",
    [deviceId, category, action, t(input.description, 2000), covered, price, actor],
  );
  await db.query("update devices set updated_at = now() where id = $1", [deviceId]);
  await audit(db, actor, "device.service.add", "device", deviceId, { category, action, covered, pricePence: price });
}

/* --------------------------------------------------------------- releases */

export interface ReleaseRow {
  id: number;
  version: string;
  name: string;
  changes: string;
  compatibility: string;
  status: "draft" | "released";
  released_at: Date | null;
  updated_at: Date;
}

export async function listReleases(db: Db) {
  return db.query<ReleaseRow>("select * from software_releases order by created_at desc");
}

export async function saveRelease(
  db: Db,
  actor: string,
  id: number | null,
  input: { version?: unknown; name?: unknown; changes?: unknown; compatibility?: unknown; status?: unknown },
) {
  const version = t(input.version, 40);
  if (!version) throw new ValidationError("Enter a version, for example 1.2.0.");
  const status = input.status === "released" ? "released" : "draft";
  const values = [version, t(input.name, 80), t(input.changes, 5000), t(input.compatibility, 300), status];
  try {
    if (id) {
      const rows = await db.query(
        `update software_releases set version=$2, name=$3, changes=$4, compatibility=$5, status=$6,
           released_at = case when $6 = 'released' then coalesce(released_at, now()) else null end, updated_at=now()
         where id=$1 returning id`,
        [id, ...values],
      );
      if (!rows.length) throw new ValidationError("Release not found.");
    } else {
      await db.query(
        `insert into software_releases (version, name, changes, compatibility, status, released_at)
         values ($1,$2,$3,$4,$5, case when $5 = 'released' then now() else null end)`,
        values,
      );
    }
  } catch (e) {
    if (e instanceof ValidationError) throw e;
    if (String(e).includes("unique")) throw new ValidationError("That version already exists.");
    throw e;
  }
  await audit(db, actor, id ? "release.update" : "release.create", "release", id ?? version, { version, status });
}

/* ----------------------------------------------------------------- export */

/** Owner backup. Excludes passwords, sessions and photo bytes. */
export async function exportAll(db: Db) {
  const q = (s: string) => db.query(s);
  return {
    exportedAt: new Date().toISOString(),
    note: "Hackulator owner export. Admin passwords, sessions and photo files are not included.",
    catalogue: { games: await q("select * from catalogue_games"), packs: await q("select * from catalogue_packs"), packGames: await q("select * from pack_games") },
    enquiries: await q("select * from enquiries order by id"),
    orders: await q("select * from orders order by id"),
    payments: await q("select * from payments order by id"),
    orderEvents: await q("select * from order_events order by id"),
    photos: await q("select id, order_id, mime, size, caption, removed_at, created_by, created_at from order_photos order by id"),
    devices: await q("select * from devices order by id"),
    serviceRecords: await q("select * from service_records order by id"),
    releases: await q("select * from software_releases order by id"),
    waitlist: await q("select * from waitlist order by position"),
    siteSettings: await q("select * from site_settings order by key"),
    mailingList: await q("select id, email, name, source, consent_at, unsubscribed_at, created_at from mailing_list order by id"),
    mailingCampaigns: await q("select * from mailing_campaigns order by id"),
    auditLog: await q("select * from audit_log order by id"),
  };
}
