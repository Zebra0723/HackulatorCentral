// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.HACKULATOR_DEMO_DIR = "memory://";

const { getDb, resetDbForTests } = await import("./db");
const auth = await import("./auth");
const cat = await import("./catalogue");
const orders = await import("./orders");
const devices = await import("./devices");
const settingsMod = await import("./settings");
const waitlist = await import("./waitlist");
const { EMPTY_BUILD } = await import("@/lib/pricing");
const { OWNER_CODE } = await import("@/lib/hackos/os");

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
let db: Db;
const ME = "owner@example.com";

beforeAll(async () => {
  resetDbForTests();
  db = (await getDb())!;
});

const classicsBuild = { ...EMPTY_BUILD, packIds: ["classics"] };

describe("owner code sign-in", () => {
  it("signs in with the owner code, rejects wrong codes and rate-limits guessing", async () => {
    const ok = await auth.loginWithCode(db, OWNER_CODE, "1.1.1.1");
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect((await auth.adminFromToken(db, ok.token))?.email).toBe("owner");
    expect(await auth.adminFromToken(db, "not-a-real-token")).toBeNull();
    expect((await auth.loginWithCode(db, "12345678", "2.2.2.2")).ok).toBe(false);
    for (let i = 0; i < 8; i++) await auth.loginWithCode(db, String(10000000 + i), "9.9.9.9");
    const limited = await auth.loginWithCode(db, OWNER_CODE, "9.9.9.9");
    expect(limited).toEqual({ ok: false, error: expect.stringMatching(/Too many attempts/) });
    // A second sign-in reuses the single owner record.
    const again = await auth.loginWithCode(db, OWNER_CODE, "3.3.3.3");
    expect(again.ok && again.admin.id).toBe(ok.admin.id);
    await auth.logout(db, ok.token);
    expect(await auth.adminFromToken(db, ok.token)).toBeNull();
  });
});

describe("enquiries", () => {
  // Orders need a waitlist ID. Entries are removed afterwards so the waitlist tests start empty.
  let entryId = 0;
  let wl = "";
  beforeAll(async () => {
    entryId = await waitlist.addWaitlistEntry(db, ME, { name: "Sam", email: "sam@example.com" });
    wl = (await waitlist.listWaitlist(db)).find((r) => r.id === entryId)!.code;
  });
  afterAll(async () => {
    await db.query("delete from waitlist");
  });

  it("only accepts orders with a valid waitlist ID, but questions from anyone", async () => {
    const order = { kind: "order", name: "Sam", email: "sam@example.com", message: "", build: classicsBuild };
    await expect(orders.createEnquiry(db, order)).rejects.toThrow(/need your waitlist ID/);
    await expect(orders.createEnquiry(db, { ...order, waitlistId: "HK-AAAA-AAAA" })).rejects.toThrow(/wasn't found/);
    await expect(orders.createEnquiry(db, { ...order, waitlistId: "not an id" })).rejects.toThrow(/wasn't found/);

    // Lower case and missing dashes are fine.
    const loose = wl.toLowerCase().replace(/-/g, " ");
    const { reference } = await orders.createEnquiry(db, { ...order, waitlistId: loose });
    const [row] = (await orders.listEnquiries(db)).filter((e) => e.reference === reference);
    expect(row).toMatchObject({ waitlist_id: entryId, waitlist_code: wl, waitlist_name: "Sam" });

    const q = await orders.createEnquiry(db, { kind: "enquiry", name: "Q", email: "q@example.com", message: "Hi?", build: classicsBuild });
    expect(q.reference).toMatch(/^ENQ-/);

    // A withdrawn entry or a replaced ID can no longer order.
    await waitlist.regenerateWaitlistCode(db, ME, entryId);
    await expect(orders.createEnquiry(db, { ...order, waitlistId: wl })).rejects.toThrow(/wasn't found/);
    const fresh = (await waitlist.listWaitlist(db)).find((r) => r.id === entryId)!.code;
    expect(fresh).not.toBe(wl);
    wl = fresh;
    const other = await waitlist.addWaitlistEntry(db, ME, { name: "Wd", email: "wd@example.com" });
    const otherCode = (await waitlist.listWaitlist(db)).find((r) => r.id === other)!.code;
    await waitlist.updateWaitlistEntry(db, ME, other, { status: "withdrawn" });
    await expect(orders.createEnquiry(db, { ...order, waitlistId: otherCode })).rejects.toThrow(/wasn't found/);
  });

  it("prices on the server and ignores anything the browser claims", async () => {
    const { reference } = await orders.createEnquiry(db, {
      kind: "order",
      name: "Sam",
      email: "sam@example.com",
      message: "",
      build: { ...classicsBuild, extrasSubtotal: 1, quote: { extrasSubtotal: 1 } },
      waitlistId: wl,
    });
    expect(reference).toMatch(/^ENQ-\d{4}$/);
    const [row] = await db.query<{ quote: { extrasSubtotal: number } }>("select quote from enquiries where reference = $1", [reference]);
    expect(row.quote.extrasSubtotal).toBe(500);
  });

  it("refuses an order for the unfinished Arcade Pack (it is silently dropped) and incomplete builds", async () => {
    const { reference } = await orders.createEnquiry(db, { kind: "order", name: "A", email: "a@example.com", message: "", build: { packIds: ["arcade"] }, waitlistId: wl });
    const [row] = await db.query<{ quote: { extrasSubtotal: number } }>("select quote from enquiries where reference = $1", [reference]);
    expect(row.quote.extrasSubtotal).toBe(0);
    await expect(
      orders.createEnquiry(db, { kind: "order", name: "A", email: "a@example.com", message: "", build: { coverIcon: { enabled: true } }, waitlistId: wl }),
    ).rejects.toThrow(/isn't complete/);
  });
});

describe("orders and tracking", () => {
  it("runs the full tracking workflow", async () => {
    const order = await orders.createOrder(db, ME, { jobType: "new_build", customerName: "Sam", customerEmail: "sam@example.com", build: classicsBuild });
    expect(order.reference).toMatch(/^ORD-\d{4}$/);
    expect(order.status).toBe("waiting_deposit");
    expect(order.tracking_token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    const token = order.tracking_token!;

    // The order number alone never grants access.
    expect(await orders.trackingView(db, order.reference)).toBeNull();

    // Deposit rule: can't enter BUILDING with less than £5 received.
    await expect(orders.updateTracking(db, ME, order.id, { status: "building" })).rejects.toThrow(/at least £5.00/);
    await orders.updateTracking(db, ME, order.id, { paymentPence: 300 });
    await expect(orders.updateTracking(db, ME, order.id, { status: "building" })).rejects.toThrow(/Received so far: £3.00/);

    // A payment entered in the same save counts.
    await orders.updateTracking(db, ME, order.id, {
      paymentPence: 200,
      status: "building",
      donorReceived: true,
      customerNote: "Your board has been fitted.",
      internalNote: "PRIVATE: supplier cost £1.23, check solder joint",
      estimatedReady: "2026-11-01",
    });

    // The customer page reflects the saved data on the next load.
    const view = (await orders.trackingView(db, token))!;
    expect(view.status).toBe("building");
    expect(view.steps.find((s) => s.state === "current")?.id).toBe("building");
    expect(view.money).toMatchObject({ received: 500, depositRequired: null });
    expect(view.estimatedReady).toBe("2026-11-01");
    const text = JSON.stringify(view);
    expect(text).toContain("Your board has been fitted.");
    expect(text).toContain("Your calculator has arrived.");
    expect(text).not.toContain("PRIVATE");
    expect(text).not.toContain("sam@example.com");
    expect(view.configuration?.lines.some((l) => l.label === "Classics Pack" && l.value === "£5.00")).toBe(true);

    // Correcting a mistaken status keeps the history; hidden entries vanish for the customer.
    await orders.updateTracking(db, ME, order.id, { status: "ready" });
    await orders.updateTracking(db, ME, order.id, { status: "building" });
    const detail = (await orders.orderDetail(db, order.id))!;
    const mistaken = detail.events.find((e) => e.kind === "status" && e.status === "ready")!;
    await orders.setEventHidden(db, ME, order.id, mistaken.id, true);
    const afterHide = JSON.stringify(await orders.trackingView(db, token));
    expect(afterHide).not.toContain("Ready.");
    const audit = await db.query<{ action: string }>("select action from audit_log where entity = 'order' and entity_id = $1", [String(order.id)]);
    expect(audit.filter((a) => a.action === "order.tracking").length).toBeGreaterThanOrEqual(4);
    expect(audit.some((a) => a.action === "order.event.hide")).toBe(true);

    // Revoking the link stops access; regenerating issues a new one.
    await orders.regenerateTracking(db, ME, order.id, true);
    expect(await orders.trackingView(db, token)).toBeNull();
    const fresh = await orders.regenerateTracking(db, ME, order.id);
    expect(fresh).not.toBe(token);
    expect(await orders.trackingView(db, fresh!)).not.toBeNull();
  });

  it("does not apply the deposit rule to a covered software job", async () => {
    const job = await orders.createOrder(db, ME, { jobType: "software", customerName: "Lee", covered: true });
    await orders.updateTracking(db, ME, job.id, { status: "building" });
    expect((await orders.getOrder(db, job.id))!.status).toBe("building");
  });

  it("moves delivered orders out of the active queue but keeps them in history", async () => {
    const o = await orders.createOrder(db, ME, { jobType: "new_build", customerName: "Kim", build: EMPTY_BUILD });
    await orders.updateTracking(db, ME, o.id, { paymentPence: 500, status: "delivered" });
    const active = await orders.listOrders(db, "active");
    expect(active.some((x) => x.id === o.id)).toBe(false);
    await orders.setArchived(db, ME, o.id, true);
    expect((await orders.listOrders(db, "archived")).some((x) => x.id === o.id)).toBe(true);
    expect((await orders.listOrders(db, "all")).some((x) => x.id === o.id)).toBe(true);
  });

  it("keeps unpaid balances visible and refuses to delete paid orders", async () => {
    const o = await orders.createOrder(db, ME, { jobType: "new_build", customerName: "Ash", build: EMPTY_BUILD });
    await orders.updateTracking(db, ME, o.id, { paymentPence: 500, agreedTotalPence: 4000 });
    expect((await orders.listOrders(db, "unpaid")).some((x) => x.id === o.id)).toBe(true);
    await expect(orders.deleteOrder(db, ME, o.id, `DELETE ${o.reference}`)).rejects.toThrow(/recorded payments/);
    const test = await orders.createOrder(db, ME, { jobType: "repair", customerName: "Test", isTest: true });
    await expect(orders.deleteOrder(db, ME, test.id, "yes")).rejects.toThrow(/Type DELETE/);
    await orders.deleteOrder(db, ME, test.id, `DELETE ${test.reference}`);
    expect(await orders.getOrder(db, test.id)).toBeNull();
  });

  it("validates photo uploads by content, not file name", async () => {
    const o = await orders.createOrder(db, ME, { jobType: "repair", customerName: "Pat" });
    await expect(orders.addPhoto(db, ME, o.id, new TextEncoder().encode("<script>alert(1)</script>"), "x")).rejects.toThrow(/JPEG, PNG or WebP/);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const id = await orders.addPhoto(db, ME, o.id, png, "Board fitted");
    const view = await orders.buildTrackingView(db, (await orders.getOrder(db, o.id))!);
    expect(view.photos.map((p) => p.id)).toContain(id);
    await orders.removePhoto(db, ME, o.id, id);
    expect(await orders.readPhoto(db, o.id, id)).toBeNull();
    // A photo can't be read through a different order.
    const other = await orders.createOrder(db, ME, { jobType: "repair", customerName: "Other" });
    const id2 = await orders.addPhoto(db, ME, o.id, png, "");
    expect(await orders.readPhoto(db, other.id, id2)).toBeNull();
  });
});

describe("catalogue", () => {
  it("propagates edits but never rewrites accepted orders", async () => {
    const before = await orders.createOrder(db, ME, { jobType: "new_build", customerName: "Snap", build: { ...EMPTY_BUILD, gameIds: ["pong"] } });
    expect(before.extras_pence).toBe(250);
    const pong = (await cat.readCatalogue(db)).games.find((g) => g.id === "pong")!;
    await cat.saveGame(db, ME, { ...pong, pricePence: 400 }, false);
    expect((await cat.readCatalogue(db)).games.find((g) => g.id === "pong")!.pricePence).toBe(400);
    const after = await orders.createOrder(db, ME, { jobType: "new_build", customerName: "New", build: { ...EMPTY_BUILD, gameIds: ["pong"] } });
    expect(after.extras_pence).toBe(400);
    const snap = (await orders.getOrder(db, before.id))!;
    expect(snap.extras_pence).toBe(250);
    expect(snap.quote!.lines.find((l) => l.key === "game:pong")!.amount).toBe(250);
  });

  it("refuses to make a pack with a title still to be announced available", async () => {
    const arcade = (await cat.readCatalogue(db)).packs.find((p) => p.id === "arcade")!;
    await expect(cat.savePack(db, ME, { ...arcade, gameIds: [...arcade.gameIds], status: "available" }, false)).rejects.toThrow(/to be announced/);
  });
});

describe("devices and service records", () => {
  it("keeps device IDs separate from orders and never charges covered work", async () => {
    const d = await devices.createDevice(db, ME, { ownerName: "Sam", softwareVersion: "0.3.0", owned: "snake, 2048, tetris" });
    expect(d.reference).toMatch(/^HACK-\d{4}$/);
    await expect(devices.addService(db, ME, d.id, { category: "SOFTWARE", action: "Reinstall", pricePence: 500 })).rejects.toThrow(/Covered work/);
    await devices.addService(db, ME, d.id, { category: "SOFTWARE", action: "Reinstall" });
    await devices.addService(db, ME, d.id, { category: "REPAIR", action: "Replace part", pricePence: 1200 });
    await expect(devices.addService(db, ME, d.id, { category: "HARDWARE", action: "x" })).rejects.toThrow(/SOFTWARE, REPAIR or UI CHANGE/);
    const { services } = (await devices.getDevice(db, d.id))!;
    expect(services.map((s) => [s.action, s.covered, s.price_pence])).toEqual(
      expect.arrayContaining([["Reinstall", true, null], ["Replace part", false, 1200]]),
    );
  });

  it("exports data without secrets", async () => {
    const data = JSON.stringify(await devices.exportAll(db));
    expect(data).not.toContain("password_hash");
    expect(data).not.toContain("scrypt$");
    expect(data).toContain("ORD-");
  });
});

describe("waitlist and site settings", () => {
  it("fills the spots in order, refuses when full and frees a spot when someone withdraws", async () => {
    await settingsMod.saveSettings(db, ME, { waitlistSpots: 2 });
    const join = (n: string, extra: Record<string, unknown> = {}) =>
      waitlist.joinWaitlist(db, { name: n, email: `${n.toLowerCase()}@example.com`, consent: true, ...extra });

    await expect(waitlist.joinWaitlist(db, { name: "No", email: "no@example.com" })).rejects.toThrow(/tick the box/);
    const a = await join("Ada");
    expect(a).toMatchObject({ already: false, queueNumber: 1, summary: { spots: 2, taken: 1, left: 1 } });
    expect(a.waitlistId).toMatch(/^HK-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    // The same email again: friendly answer, no duplicate, no details (and never the ID) revealed.
    const again = await join("Someone", { email: "ADA@example.com" });
    expect(again).toMatchObject({ already: true, queueNumber: null, waitlistId: null });
    const b = await join("Bo");
    expect(b.queueNumber).toBe(2);
    await expect(join("Cy")).rejects.toThrow(/Every spot/);

    const rows = await waitlist.listWaitlist(db);
    expect(rows.map((r) => r.name)).toEqual(["Ada", "Bo"]);
    await waitlist.moveWaitlistEntry(db, ME, rows[1].id, "up");
    expect((await waitlist.listWaitlist(db)).map((r) => [r.name, r.queue_number])).toEqual([["Bo", 1], ["Ada", 2]]);

    await waitlist.updateWaitlistEntry(db, ME, rows[0].id, { status: "withdrawn", privateNote: "changed mind" });
    expect((await waitlist.waitlistSummary(db)).left).toBe(1);
    expect((await join("Cy")).queueNumber).toBe(2);

    // The owner can raise the number of spots, close the list and edit entries.
    await settingsMod.saveSettings(db, ME, { waitlistSpots: 10, waitlistOpen: false });
    await expect(join("Di")).rejects.toThrow(/closed/);
    await expect(waitlist.updateWaitlistEntry(db, ME, rows[1].id, { email: "cy@example.com" })).rejects.toThrow(/already on the waitlist/);
    const id = await waitlist.addWaitlistEntry(db, ME, { name: "Eve", email: "eve@example.com" });
    await waitlist.deleteWaitlistEntry(db, ME, id);
    expect((await waitlist.waitlistSummary(db))).toMatchObject({ spots: 10, taken: 2, left: 8, open: false });
  });

  it("validates settings and keeps defaults for anything unset", async () => {
    await expect(settingsMod.saveSettings(db, ME, { waitlistSpots: -1 })).rejects.toThrow(/whole number/);
    await expect(settingsMod.saveSettings(db, ME, { announcementOn: true, announcementText: "" })).rejects.toThrow(/announcement text/);
    const s = await settingsMod.saveSettings(db, ME, { announcementOn: true, announcementText: "  Prototype 2 is on the bench!\n ", basePricePence: 4999, ignored: "x" });
    expect(s).toMatchObject({ announcementOn: true, announcementText: "Prototype 2 is on the bench!", basePricePence: 4999, statusLabel: settingsMod.DEFAULT_SETTINGS.statusLabel });
    expect(s).not.toHaveProperty("ignored");
    expect((await settingsMod.saveSettings(db, ME, { basePricePence: null })).basePricePence).toBeNull();
    const exp = await devices.exportAll(db);
    expect(exp.waitlist.length).toBeGreaterThan(0);
    expect(exp.siteSettings.length).toBeGreaterThan(0);
  });
});
