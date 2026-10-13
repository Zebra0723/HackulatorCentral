import "server-only";
import { randomBytes } from "node:crypto";
import { formatPence } from "@/config/offer";
import { buildSummaryText, describeUi, ownedGames, quote, sanitizeBuild, uiIncluded, type Build, type Quote } from "@/lib/pricing";
import { audit } from "./audit";
import { findActiveWaitlistEntry } from "./waitlist";
import { ValidationError, parsePence, readCatalogue } from "./catalogue";
import type { Db } from "./db";

/* ------------------------------------------------------------------ statuses */

export const ORDER_STATUSES = [
  { id: "waiting_deposit", label: "Waiting for deposit", waiting: true },
  { id: "waiting_calculator", label: "Waiting for calculator", waiting: true },
  { id: "waiting_parts", label: "Waiting for parts", waiting: true },
  { id: "accepted", label: "Order accepted", waiting: false },
  { id: "building", label: "Building", waiting: false },
  { id: "testing", label: "Testing", waiting: false },
  { id: "ready", label: "Ready", waiting: false },
  { id: "delivered", label: "Delivered", waiting: false },
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number]["id"] | "cancelled";

/** The customer-facing progression. Waiting states sit alongside "Order accepted". */
export const PROGRESS_STEPS = ["accepted", "building", "testing", "ready", "delivered"] as const;

export const JOB_TYPES = [
  { id: "new_build", label: "New Hackulator build" },
  { id: "software", label: "Software job" },
  { id: "repair", label: "Repair" },
  { id: "ui_change", label: "UI change" },
] as const;
export type JobType = (typeof JOB_TYPES)[number]["id"];

/** At least this much must actually have been received before a new build can enter BUILDING. */
export const MIN_DEPOSIT_PENCE = 500;
const NEEDS_DEPOSIT: OrderStatus[] = ["building", "testing", "ready", "delivered"];

export const statusLabel = (s: string) =>
  s === "cancelled" ? "Cancelled" : (ORDER_STATUSES.find((x) => x.id === s)?.label ?? s);
export const jobTypeLabel = (j: string) => JOB_TYPES.find((x) => x.id === j)?.label ?? j;

/* --------------------------------------------------------------------- types */

export interface OrderRow {
  id: number;
  reference: string;
  enquiry_id: number | null;
  job_type: JobType;
  status: OrderStatus;
  customer_name: string;
  customer_email: string;
  build: Build | null;
  quote: Quote | null;
  extras_pence: number;
  base_price_pence: number | null;
  agreed_total_pence: number | null;
  covered: boolean;
  estimated_ready: string | Date | null;
  donor_received_at: Date | null;
  tracking_token: string | null;
  tracking_created_at: Date | null;
  archived: boolean;
  cancelled_at: Date | null;
  cancel_reason: string | null;
  is_test: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OrderEvent {
  id: number;
  order_id: number;
  kind: string;
  status: string | null;
  message: string;
  customer_visible: boolean;
  hidden: boolean;
  created_by: string;
  created_at: Date;
}

export interface Payment {
  id: number;
  amount_pence: number;
  method: string;
  note: string;
  received_at: Date;
  created_by: string;
}

/* ------------------------------------------------------------------ helpers */

export const newTrackingToken = () => randomBytes(24).toString("base64url");

async function nextRef(db: Db, seq: string, prefix: string) {
  const [{ n }] = await db.query<{ n: number }>(`select nextval('${seq}')::int as n`);
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

export async function paidTotal(db: Db, orderId: number): Promise<number> {
  const [{ total }] = await db.query<{ total: number }>(
    "select coalesce(sum(amount_pence), 0)::int as total from payments where order_id = $1",
    [orderId],
  );
  return total;
}

function cleanText(v: unknown, max: number) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

async function addEvent(
  db: Db,
  orderId: number,
  actor: string,
  kind: string,
  message: string,
  opts: { status?: string | null; customerVisible?: boolean } = {},
) {
  await db.query(
    "insert into order_events (order_id, kind, status, message, customer_visible, created_by) values ($1,$2,$3,$4,$5,$6)",
    [orderId, kind, opts.status ?? null, message, opts.customerVisible ?? true, actor],
  );
}

async function touch(db: Db, orderId: number) {
  await db.query("update orders set updated_at = now() where id = $1", [orderId]);
}

export async function getOrder(db: Db, id: number): Promise<OrderRow | null> {
  const rows = await db.query<OrderRow>("select * from orders where id = $1", [id]);
  return rows[0] ?? null;
}

/* ---------------------------------------------------------------- enquiries */

export interface EnquiryRow {
  id: number;
  reference: string;
  kind: "order" | "enquiry";
  status: "new" | "reviewed" | "converted" | "closed";
  name: string;
  email: string;
  message: string;
  build: Build | null;
  quote: Quote | null;
  created_at: Date;
  waitlist_id: number | null;
  waitlist_code?: string | null;
  waitlist_name?: string | null;
}

/** Public submission. Pricing is recalculated here from the live catalogue; the browser's numbers are ignored. */
export async function createEnquiry(
  db: Db,
  input: { kind: unknown; name: unknown; email: unknown; message: unknown; build: unknown; waitlistId?: unknown },
): Promise<{ reference: string; kind: "order" | "enquiry" }> {
  const kind = input.kind === "enquiry" ? "enquiry" : "order";
  const name = cleanText(input.name, 80);
  const email = cleanText(input.email, 160).toLowerCase();
  const message = cleanText(input.message, 2000);
  if (!name) throw new ValidationError("Please enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("Please enter a valid email address.");
  if (kind === "enquiry" && !message) throw new ValidationError("Please enter your question.");
  const catalogue = await readCatalogue(db);
  const build = sanitizeBuild(input.build, catalogue);
  const q = quote(build, catalogue);
  if (kind === "order" && q.issues.length) throw new ValidationError(`Your build isn't complete yet: ${q.issues[0]}`);
  // Orders are for waitlist members only; questions are open to everyone.
  let waitlistId: number | null = null;
  if (kind === "order") {
    if (!String(input.waitlistId ?? "").trim()) {
      throw new ValidationError("Orders need your waitlist ID. Join the waitlist (it's free) to get one.");
    }
    const entry = await findActiveWaitlistEntry(db, input.waitlistId);
    if (!entry) throw new ValidationError("That waitlist ID wasn't found. Check it and try again, or email us.");
    waitlistId = entry.id;
  }
  const reference = await nextRef(db, "enquiry_ref_seq", "ENQ");
  await db.query(
    "insert into enquiries (reference, kind, name, email, message, build, quote, waitlist_id) values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8)",
    [reference, kind, name, email, message, JSON.stringify(build), JSON.stringify(q), waitlistId],
  );
  return { reference, kind };
}

export async function listEnquiries(db: Db, status?: string) {
  const base = `select e.*, w.code as waitlist_code, w.name as waitlist_name
    from enquiries e left join waitlist w on w.id = e.waitlist_id`;
  if (status) return db.query<EnquiryRow>(`${base} where e.status = $1 order by e.created_at desc`, [status]);
  return db.query<EnquiryRow>(`${base} order by e.created_at desc limit 200`);
}

export async function setEnquiryStatus(db: Db, actor: string, id: number, status: string) {
  if (!["new", "reviewed", "closed"].includes(status)) throw new ValidationError("Unknown status.");
  await db.query("update enquiries set status = $2, updated_at = now() where id = $1", [id, status]);
  await audit(db, actor, "enquiry.status", "enquiry", id, { status });
}

/* ------------------------------------------------------------------- orders */

export interface CreateOrderInput {
  jobType?: unknown;
  customerName?: unknown;
  customerEmail?: unknown;
  build?: unknown;
  covered?: unknown;
  isTest?: unknown;
  enquiryId?: unknown;
  initialStatus?: unknown;
}

/**
 * Accept an order. The configuration and its prices are SNAPSHOTTED here, so
 * later catalogue changes never rewrite an accepted order.
 */
export async function createOrder(db: Db, actor: string, input: CreateOrderInput): Promise<OrderRow> {
  const jobType = (JOB_TYPES.find((j) => j.id === input.jobType)?.id ?? null) as JobType | null;
  if (!jobType) throw new ValidationError("Choose a job type.");
  let name = cleanText(input.customerName, 80);
  let email = cleanText(input.customerEmail, 160).toLowerCase();
  let rawBuild = input.build;
  let enquiryId: number | null = null;
  if (input.enquiryId != null && input.enquiryId !== "") {
    const enq = (await db.query<EnquiryRow>("select * from enquiries where id = $1", [Number(input.enquiryId)]))[0];
    if (!enq) throw new ValidationError("That enquiry no longer exists.");
    if (enq.status === "converted") throw new ValidationError("That enquiry has already been turned into an order.");
    enquiryId = enq.id;
    name = name || enq.name;
    email = email || enq.email;
    rawBuild = rawBuild ?? enq.build;
  }
  if (!name) throw new ValidationError("Enter the customer's name.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("That email address doesn't look right.");

  const catalogue = await readCatalogue(db);
  const hasBuild = jobType === "new_build" || (rawBuild != null && rawBuild !== "");
  const build = hasBuild ? sanitizeBuild(rawBuild, catalogue) : null;
  const q = build ? quote(build, catalogue) : null;
  if (build && q && q.issues.length) throw new ValidationError(`The configuration isn't complete: ${q.issues[0]}`);
  const covered = jobType !== "new_build" && input.covered === true;
  const allowedStart: OrderStatus[] = ["accepted", "waiting_deposit", "waiting_calculator", "waiting_parts"];
  const status = (allowedStart.includes(input.initialStatus as OrderStatus) ? input.initialStatus : jobType === "new_build" ? "waiting_deposit" : "accepted") as OrderStatus;

  return db.tx(async (t) => {
    const reference = await nextRef(t, "order_ref_seq", "ORD");
    const rows = await t.query<OrderRow>(
      `insert into orders (reference, enquiry_id, job_type, status, customer_name, customer_email, build, quote, extras_pence,
         covered, tracking_token, tracking_created_at, is_test)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11, now(), $12) returning *`,
      [reference, enquiryId, jobType, status, name, email, build ? JSON.stringify(build) : null, q ? JSON.stringify(q) : null,
        q?.extrasSubtotal ?? 0, covered, newTrackingToken(), input.isTest === true],
    );
    const order = rows[0];
    await addEvent(t, order.id, actor, "status", `${statusLabel(status)}.`, { status });
    if (enquiryId) await t.query("update enquiries set status = 'converted', updated_at = now() where id = $1", [enquiryId]);
    await audit(t, actor, "order.create", "order", order.id, { reference, jobType, status, extrasPence: order.extras_pence, enquiryId });
    return order;
  });
}

export interface TrackingUpdate {
  status?: unknown;
  paymentPence?: unknown;
  paymentMethod?: unknown;
  paymentNote?: unknown;
  donorReceived?: unknown;
  customerNote?: unknown;
  internalNote?: unknown;
  estimatedReady?: unknown; // "YYYY-MM-DD" or "" to clear
  basePricePence?: unknown;
  agreedTotalPence?: unknown;
}

/**
 * The owner's "Update tracking" save. Everything happens in one transaction:
 * payments are recorded before the status check so a deposit entered in the
 * same save counts towards the £5 rule.
 */
export async function updateTracking(db: Db, actor: string, orderId: number, u: TrackingUpdate): Promise<OrderRow> {
  return db.tx(async (t) => {
    const order = (await t.query<OrderRow>("select * from orders where id = $1 for update", [orderId]))[0];
    if (!order) throw new ValidationError("Order not found.");
    if (order.status === "cancelled") throw new ValidationError("This order is cancelled. Reopen isn't supported; create a new order instead.");
    const changes: Record<string, unknown> = {};

    // 1. Money received
    if (u.paymentPence !== undefined && u.paymentPence !== null && u.paymentPence !== "") {
      const amount = parsePence(u.paymentPence, "Amount received", false)!;
      if (amount === 0) throw new ValidationError("Enter an amount above £0.00, or leave it blank.");
      await t.query("insert into payments (order_id, amount_pence, method, note, created_by) values ($1,$2,$3,$4,$5)", [
        orderId, amount, cleanText(u.paymentMethod, 40), cleanText(u.paymentNote, 200), actor,
      ]);
      await addEvent(t, orderId, actor, "payment", `Payment received: ${formatPence(amount)}.`);
      changes.payment = amount;
    }

    // 2. Donor calculator received (a recorded milestone, never automatic)
    if (u.donorReceived === true && !order.donor_received_at) {
      await t.query("update orders set donor_received_at = now() where id = $1", [orderId]);
      await addEvent(t, orderId, actor, "donor", "Your calculator has arrived.");
      changes.donorReceived = true;
    }

    // 3. Prices once known
    if (u.basePricePence !== undefined) {
      const v = parsePence(u.basePricePence, "Base price");
      if (v !== order.base_price_pence) {
        await t.query("update orders set base_price_pence = $2 where id = $1", [orderId, v]);
        changes.basePricePence = v;
      }
    }
    if (u.agreedTotalPence !== undefined) {
      const v = parsePence(u.agreedTotalPence, "Agreed total");
      if (v !== order.agreed_total_pence) {
        await t.query("update orders set agreed_total_pence = $2 where id = $1", [orderId, v]);
        changes.agreedTotalPence = v;
      }
    }

    // 4. Estimated ready date (only ever what the owner typed)
    if (u.estimatedReady !== undefined) {
      const raw = typeof u.estimatedReady === "string" ? u.estimatedReady.trim() : "";
      if (raw && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new ValidationError("Use a valid date for the estimate.");
      const current = order.estimated_ready ? new Date(order.estimated_ready).toISOString().slice(0, 10) : "";
      if (raw !== current) {
        await t.query("update orders set estimated_ready = $2 where id = $1", [orderId, raw || null]);
        await addEvent(t, orderId, actor, "estimate", raw ? `Estimated ready date set to ${raw} (estimate).` : "Estimated ready date removed.");
        changes.estimatedReady = raw || null;
      }
    }

    // 5. Status (with the deposit rule enforced here, on the server)
    if (typeof u.status === "string" && u.status && u.status !== order.status) {
      const next = ORDER_STATUSES.find((s) => s.id === u.status)?.id;
      if (!next) throw new ValidationError("Choose a valid status.");
      if (order.job_type === "new_build" && NEEDS_DEPOSIT.includes(next)) {
        const paid = await paidTotal(t, orderId);
        if (paid < MIN_DEPOSIT_PENCE) {
          throw new ValidationError(
            `A new build needs at least ${formatPence(MIN_DEPOSIT_PENCE)} received before it can move to ${statusLabel(next)}. Received so far: ${formatPence(paid)}.`,
          );
        }
      }
      await t.query("update orders set status = $2 where id = $1", [orderId, next]);
      await addEvent(t, orderId, actor, "status", `${statusLabel(next)}.`, { status: next });
      changes.status = { from: order.status, to: next };
    }

    // 6. Notes
    const customerNote = cleanText(u.customerNote, 2000);
    if (customerNote) {
      await addEvent(t, orderId, actor, "note", customerNote, { customerVisible: true });
      changes.customerNote = true;
    }
    const internalNote = cleanText(u.internalNote, 4000);
    if (internalNote) {
      await addEvent(t, orderId, actor, "internal", internalNote, { customerVisible: false });
      changes.internalNote = true;
    }

    if (!Object.keys(changes).length) throw new ValidationError("Nothing to save. Change at least one field.");
    await touch(t, orderId);
    await audit(t, actor, "order.tracking", "order", orderId, changes);
    return (await t.query<OrderRow>("select * from orders where id = $1", [orderId]))[0];
  });
}

/** Hide a mistaken entry from the customer. It stays in the admin history and audit log. */
export async function setEventHidden(db: Db, actor: string, orderId: number, eventId: number, hidden: boolean) {
  const rows = await db.query("update order_events set hidden = $3 where id = $2 and order_id = $1 returning id", [orderId, eventId, hidden]);
  if (!rows.length) throw new ValidationError("Entry not found.");
  await touch(db, orderId);
  await audit(db, actor, hidden ? "order.event.hide" : "order.event.unhide", "order", orderId, { eventId });
}

export async function regenerateTracking(db: Db, actor: string, orderId: number, revokeOnly = false) {
  const token = revokeOnly ? null : newTrackingToken();
  const rows = await db.query("update orders set tracking_token = $2, tracking_created_at = now() where id = $1 returning id", [orderId, token]);
  if (!rows.length) throw new ValidationError("Order not found.");
  await audit(db, actor, revokeOnly ? "order.tracking.revoke" : "order.tracking.regenerate", "order", orderId);
  return token;
}

export async function cancelOrder(db: Db, actor: string, orderId: number, reason: string) {
  const order = await getOrder(db, orderId);
  if (!order) throw new ValidationError("Order not found.");
  if (order.status === "delivered") throw new ValidationError("Delivered orders can't be cancelled. Archive it instead.");
  await db.tx(async (t) => {
    await t.query("update orders set status = 'cancelled', cancelled_at = now(), cancel_reason = $2, updated_at = now() where id = $1", [orderId, cleanText(reason, 300)]);
    await addEvent(t, orderId, actor, "status", "Order cancelled.", { status: "cancelled" });
    await audit(t, actor, "order.cancel", "order", orderId, { reason });
  });
}

export async function setArchived(db: Db, actor: string, orderId: number, archived: boolean) {
  const order = await getOrder(db, orderId);
  if (!order) throw new ValidationError("Order not found.");
  if (archived && !["delivered", "cancelled"].includes(order.status)) throw new ValidationError("Only delivered or cancelled orders can be archived.");
  await db.query("update orders set archived = $2, updated_at = now() where id = $1", [orderId, archived]);
  await audit(db, actor, archived ? "order.archive" : "order.unarchive", "order", orderId);
}

/**
 * Permanently delete a genuine test or mistaken record. Refused when any
 * payment exists: financial history is never silently removed.
 */
export async function deleteOrder(db: Db, actor: string, orderId: number, confirmation: string) {
  const order = await getOrder(db, orderId);
  if (!order) throw new ValidationError("Order not found.");
  if (confirmation !== `DELETE ${order.reference}`) throw new ValidationError(`Type DELETE ${order.reference} to confirm.`);
  const [{ n }] = await db.query<{ n: number }>("select count(*)::int as n from payments where order_id = $1", [orderId]);
  if (n > 0) throw new ValidationError("This order has recorded payments, so it can't be deleted. Cancel or archive it instead.");
  await db.tx(async (t) => {
    await t.query("update devices set order_id = null where order_id = $1", [orderId]);
    await t.query("delete from orders where id = $1", [orderId]);
    await audit(t, actor, "order.delete", "order", orderId, { reference: order.reference, isTest: order.is_test });
  });
}

/* ------------------------------------------------------------------- photos */

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export function sniffImage(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length > 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export async function addPhoto(db: Db, actor: string, orderId: number, bytes: Uint8Array, caption: string) {
  if (bytes.length === 0) throw new ValidationError("Choose a photo.");
  if (bytes.length > MAX_PHOTO_BYTES) throw new ValidationError("Photos must be 4 MB or smaller.");
  const mime = sniffImage(bytes);
  if (!mime) throw new ValidationError("Use a JPEG, PNG or WebP photo.");
  const order = await getOrder(db, orderId);
  if (!order) throw new ValidationError("Order not found.");
  const rows = await db.query<{ id: number }>(
    "insert into order_photos (order_id, mime, bytes, size, caption, created_by) values ($1,$2,$3,$4,$5,$6) returning id",
    [orderId, mime, Buffer.from(bytes), bytes.length, cleanText(caption, 200), actor],
  );
  await addEvent(db, orderId, actor, "photo", cleanText(caption, 200) || "New photo of your Hackulator.");
  await touch(db, orderId);
  await audit(db, actor, "order.photo.add", "order", orderId, { photoId: rows[0].id, size: bytes.length, mime });
  return rows[0].id;
}

export async function removePhoto(db: Db, actor: string, orderId: number, photoId: number) {
  const rows = await db.query("update order_photos set removed_at = now() where id = $1 and order_id = $2 and removed_at is null returning id", [photoId, orderId]);
  if (!rows.length) throw new ValidationError("Photo not found.");
  await touch(db, orderId);
  await audit(db, actor, "order.photo.remove", "order", orderId, { photoId });
}

export async function readPhoto(db: Db, orderId: number, photoId: number) {
  const rows = await db.query<{ mime: string; bytes: Uint8Array }>(
    "select mime, bytes from order_photos where id = $1 and order_id = $2 and removed_at is null",
    [photoId, orderId],
  );
  return rows[0] ?? null;
}

/* ------------------------------------------------------- customer tracking */

export interface TrackingView {
  reference: string;
  jobType: string;
  status: string;
  statusLabel: string;
  waiting: string | null;
  cancelled: boolean;
  steps: { id: string; label: string; state: "done" | "current" | "todo" }[];
  lastUpdated: string;
  configuration: { lines: { label: string; value: string }[]; details: string[] } | null;
  estimatedReady: string | null;
  money: { received: number; agreedTotal: number | null; balance: number | null; depositRequired: number | null } | null;
  milestones: { at: string; text: string }[];
  photos: { id: number; caption: string; at: string }[];
}

/** Look up an order by its private tracking token. Returns null for unknown or revoked tokens. */
export async function trackingView(db: Db, token: string): Promise<TrackingView | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const order = (await db.query<OrderRow>("select * from orders where tracking_token = $1", [token]))[0];
  if (!order) return null;
  return buildTrackingView(db, order);
}

/** Exactly what the customer sees. Used for the admin preview too, so the two can't drift apart. */
export async function buildTrackingView(db: Db, order: OrderRow): Promise<TrackingView> {
  const events = await db.query<OrderEvent>(
    "select * from order_events where order_id = $1 and customer_visible = true and hidden = false order by created_at asc, id asc",
    [order.id],
  );
  const photos = await db.query<{ id: number; caption: string; created_at: Date }>(
    "select id, caption, created_at from order_photos where order_id = $1 and removed_at is null order by created_at asc",
    [order.id],
  );
  const received = await paidTotal(db, order.id);
  const cancelled = order.status === "cancelled";
  const statusDef = ORDER_STATUSES.find((s) => s.id === order.status);
  const currentStep = statusDef?.waiting ? "accepted" : order.status;
  const idx = PROGRESS_STEPS.indexOf(currentStep as (typeof PROGRESS_STEPS)[number]);
  const steps = PROGRESS_STEPS.map((id, i) => ({
    id,
    label: statusLabel(id),
    state: (cancelled ? "todo" : i < idx ? "done" : i === idx ? (id === "delivered" ? "done" : "current") : "todo") as "done" | "current" | "todo",
  }));

  let configuration: TrackingView["configuration"] = null;
  if (order.build && order.quote) {
    const catalogue = await readCatalogue(db);
    const details = [
      `Games: ${ownedGames(order.build, catalogue).map((g) => g.name).join(", ")}`,
      ...(uiIncluded(order.build) ? [`Custom UI: ${describeUi(order.build.ui)}`] : []),
    ];
    configuration = {
      lines: order.quote.lines.map((l) => ({ label: l.label, value: l.amount === 0 ? (l.note ?? "Included") : formatPence(l.amount) })),
      details,
    };
  }
  const agreed = order.agreed_total_pence;
  const money =
    order.job_type === "new_build" || received > 0 || agreed != null
      ? {
          received,
          agreedTotal: agreed,
          balance: agreed != null ? Math.max(0, agreed - received) : null,
          depositRequired: order.job_type === "new_build" && received < MIN_DEPOSIT_PENCE ? MIN_DEPOSIT_PENCE - received : null,
        }
      : null;

  return {
    reference: order.reference,
    jobType: jobTypeLabel(order.job_type),
    status: order.status,
    statusLabel: statusLabel(order.status),
    waiting: statusDef?.waiting ? statusDef.label : null,
    cancelled,
    steps,
    lastUpdated: new Date(order.updated_at).toISOString(),
    configuration,
    estimatedReady: order.estimated_ready ? new Date(order.estimated_ready).toISOString().slice(0, 10) : null,
    money,
    milestones: events.map((e) => ({ at: new Date(e.created_at).toISOString(), text: e.message })),
    photos: photos.map((p) => ({ id: p.id, caption: p.caption, at: new Date(p.created_at).toISOString() })),
  };
}

/* ------------------------------------------------------------------ queries */

export async function listOrders(db: Db, filter: "active" | "archived" | "all" | "unpaid" = "active") {
  const base = `select o.*, coalesce((select sum(amount_pence) from payments p where p.order_id = o.id), 0)::int as paid
                from orders o`;
  if (filter === "archived") return db.query<OrderRow & { paid: number }>(`${base} where o.archived order by o.updated_at desc`);
  if (filter === "all") return db.query<OrderRow & { paid: number }>(`${base} order by o.created_at desc`);
  if (filter === "unpaid")
    return db.query<OrderRow & { paid: number }>(
      `${base} where o.status <> 'cancelled' and o.agreed_total_pence is not null
       and o.agreed_total_pence > coalesce((select sum(amount_pence) from payments p where p.order_id = o.id), 0)
       order by o.updated_at desc`,
    );
  // Active build queue: not delivered, not cancelled, not archived.
  return db.query<OrderRow & { paid: number }>(
    `${base} where not o.archived and o.status not in ('delivered','cancelled') order by o.updated_at desc`,
  );
}

export async function orderDetail(db: Db, id: number) {
  const order = await getOrder(db, id);
  if (!order) return null;
  const events = await db.query<OrderEvent>("select * from order_events where order_id = $1 order by created_at desc, id desc", [id]);
  const payments = await db.query<Payment>("select id, amount_pence, method, note, received_at, created_by from payments where order_id = $1 order by received_at desc", [id]);
  const photos = await db.query<{ id: number; caption: string; size: number; created_at: Date }>(
    "select id, caption, size, created_at from order_photos where order_id = $1 and removed_at is null order by created_at desc",
    [id],
  );
  const devices = await db.query<{ id: number; reference: string }>("select id, reference from devices where order_id = $1", [id]);
  return { order, events, payments, photos, devices, paid: payments.reduce((s, p) => s + p.amount_pence, 0) };
}

export async function dashboard(db: Db) {
  const [counts] = await db.query<Record<string, number>>(
    `select
      (select count(*)::int from enquiries where status = 'new') as new_enquiries,
      (select count(*)::int from orders where not archived and status in ('accepted','building','waiting_calculator','waiting_parts')) as active_builds,
      (select count(*)::int from orders where not archived and status = 'waiting_deposit') as waiting_deposit,
      (select count(*)::int from orders where not archived and status = 'testing') as testing,
      (select count(*)::int from orders where not archived and status = 'ready') as ready,
      (select count(*)::int from waitlist where status <> 'withdrawn') as waitlist_taken`,
  );
  return counts;
}

export function buildSheetText(order: OrderRow, deviceRefs: string[]): string {
  return order.build ? buildSummaryText(order.build, order.quote ?? undefined) + (deviceRefs.length ? `\nDevices: ${deviceRefs.join(", ")}` : "") : "";
}
