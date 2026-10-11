import { describe, expect, it } from "vitest";
import { DEFAULT_CATALOGUE, isPackBuyable } from "@/config/offer";
import { EMPTY_BUILD, buildReducer, buildSummaryText, decodeShare, encodeShare, quote, sanitizeBuild, type Build, type BuildAction } from "./pricing";

const apply = (...actions: BuildAction[]): Build => actions.reduce(buildReducer, EMPTY_BUILD);

const nameAndIcon: BuildAction[] = [
  { type: "setCoverNameEnabled", value: true },
  { type: "setCoverNameText", text: "Sam" },
  { type: "setCoverIconEnabled", value: true },
  { type: "setCoverIcon", iconId: "lightning" },
];

describe("pricing", () => {
  it("base only: £0 extras, base games included, no base price shown", () => {
    const q = quote(EMPTY_BUILD);
    expect(q.extrasSubtotal).toBe(0);
    expect(q.lines).toEqual([expect.objectContaining({ key: "base-games", amount: 0 })]);
    const text = buildSummaryText(EMPTY_BUILD, q);
    expect(text).toContain("Extras subtotal: £0.00");
    expect(text).toContain("Base price: to be confirmed");
  });

  it("Classics only: £5 extras", () => {
    expect(quote(apply({ type: "togglePack", id: "classics" })).extrasSubtotal).toBe(500);
  });

  it("name + icon: £7 extras with no bundle discount", () => {
    expect(quote(apply(...nameAndIcon)).extrasSubtotal).toBe(700);
  });

  it("Games Forever + Custom UI + name + icon: £22 extras", () => {
    const b = apply({ type: "setTier", tier: "all-games-forever" }, { type: "setCustomUi", value: true }, ...nameAndIcon);
    expect(quote(b).extrasSubtotal).toBe(2200);
  });

  it("Software Forever + name + icon: £27 extras, no duplicate game or UI charges", () => {
    const b = apply(
      { type: "togglePack", id: "classics" },
      { type: "toggleGame", id: "pong" },
      { type: "setCustomUi", value: true },
      { type: "setTier", tier: "all-software-forever" },
      ...nameAndIcon,
    );
    const q = quote(b);
    expect(q.extrasSubtotal).toBe(2700);
    expect(q.lines.find((l) => l.key === "custom-ui")).toMatchObject({ amount: 0 });
    expect(q.lines.some((l) => l.key.startsWith("pack:") || l.key.startsWith("game:"))).toBe(false);
  });

  it("does not double-charge a game already in a selected pack", () => {
    const b = apply({ type: "toggleGame", id: "pong" }, { type: "togglePack", id: "classics" });
    expect(quote(b).extrasSubtotal).toBe(500);
  });

  it("deduplicates game ids", () => {
    const b: Build = { ...EMPTY_BUILD, gameIds: ["pong", "pong", "flappy-style"] };
    expect(quote(b).extrasSubtotal).toBe(500);
  });

  it("charges single games at £2.50 each", () => {
    expect(quote(apply({ type: "toggleGame", id: "pong" })).extrasSubtotal).toBe(250);
  });

  it("switching tiers keeps physical extras and removes overlapping software costs", () => {
    let b = apply({ type: "togglePack", id: "classics" }, { type: "toggleGame", id: "space-invaders" }, ...nameAndIcon);
    expect(quote(b).extrasSubtotal).toBe(500 + 250 + 700);

    b = buildReducer(b, { type: "setTier", tier: "all-games-forever" });
    expect(b.coverName).toEqual({ enabled: true, text: "Sam", colour: "white" });
    expect(b.coverIcon).toEqual({ enabled: true, iconId: "lightning", colour: "white" });
    expect(quote(b).extrasSubtotal).toBe(1000 + 700);

    b = buildReducer(b, { type: "setTier", tier: "all-software-forever" });
    expect(quote(b).extrasSubtotal).toBe(2000 + 700);

    b = buildReducer(b, { type: "setTier", tier: "choose" });
    expect(quote(b).extrasSubtotal).toBe(500 + 250 + 700);
  });

  it("Software Forever ignores attempts to add Custom UI separately", () => {
    const b = apply({ type: "setTier", tier: "all-software-forever" }, { type: "setCustomUi", value: true });
    expect(quote(b).extrasSubtotal).toBe(2000);
  });

  it("Games Forever does not include Custom UI", () => {
    const b = apply({ type: "setTier", tier: "all-games-forever" }, { type: "setCustomUi", value: true });
    expect(quote(b).extrasSubtotal).toBe(1500);
  });

  it("never lets the unfinished Arcade Pack be bought", () => {
    const b = apply({ type: "togglePack", id: "arcade" });
    expect(b.packIds).toEqual([]);
    expect(quote({ ...EMPTY_BUILD, packIds: ["arcade"] }).extrasSubtotal).toBe(0);
  });

  it("base games cannot be added, removed or charged", () => {
    const b = apply({ type: "toggleGame", id: "snake" });
    expect(b).toEqual(EMPTY_BUILD);
    expect(quote({ ...EMPTY_BUILD, gameIds: ["snake", "2048", "blocks"] }).extrasSubtotal).toBe(0);
  });

  it("suggests The Gamer when separate games cost the same or more, without switching", () => {
    const b = apply(
      { type: "togglePack", id: "classics" },
      { type: "toggleGame", id: "block-blast" },
      { type: "toggleGame", id: "space-invaders" },
    );
    const q = quote(b);
    expect(q.extrasSubtotal).toBe(1000);
    expect(q.suggestion).toMatchObject({ tier: "all-games-forever", separateCost: 1000 });
    expect(b.tier).toBe("choose");
  });

  it("no suggestion below the pass price", () => {
    expect(quote(apply({ type: "togglePack", id: "classics" })).suggestion).toBeNull();
  });

  it("charges £0.50 extra for gold, per item", () => {
    const b = apply(...nameAndIcon, { type: "setCoverNameColour", colour: "gold" });
    expect(quote(b).extrasSubtotal).toBe(750);
    const both = buildReducer(b, { type: "setCoverIconColour", colour: "gold" });
    expect(quote(both).extrasSubtotal).toBe(800);
    expect(quote(buildReducer(both, { type: "setCoverIconColour", colour: "red" })).extrasSubtotal).toBe(750);
  });

  it("does not charge for gold when the name or icon is switched off", () => {
    const b = apply({ type: "setCoverNameColour", colour: "gold" }, { type: "setCoverIconColour", colour: "gold" });
    expect(quote(b).extrasSubtotal).toBe(0);
  });

  it("keeps colours and UI choices when switching tiers, and lists them in the summary", () => {
    const b = apply(
      ...nameAndIcon,
      { type: "setCoverIconColour", colour: "gold" },
      { type: "setUi", patch: { font: "mono", accent: "ocean", appearance: "light", layout: "list", welcome: "Hi Sam" } },
      { type: "setTier", tier: "all-software-forever" },
      { type: "setTier", tier: "all-games-forever" },
      { type: "setTier", tier: "all-software-forever" },
    );
    expect(b.coverIcon.colour).toBe("gold");
    expect(quote(b).extrasSubtotal).toBe(2000 + 700 + 50);
    const text = buildSummaryText(b);
    expect(text).toContain("Custom UI: Mono font, Ocean accent, Light appearance, List menu, welcome text “Hi Sam”");
    expect(text).toContain("Icon: Lightning, Gold");
    expect(text).toContain("Name colour: White");
  });

  it("uses the name Tetris for the third base game", () => {
    expect(quote(EMPTY_BUILD).lines[0].label).toBe("Snake, 2048 and Tetris");
  });

  it("keeps the Arcade Pack's third game as to be announced and unbuyable", () => {
    const arcade = DEFAULT_CATALOGUE.packs.find((p) => p.id === "arcade")!;
    expect(arcade.tbaTitles).toBe(1);
    expect(arcade.gameIds).not.toContain("pac-man-style");
    expect(isPackBuyable(arcade)).toBe(false);
  });

  it("All Software Forever replaces individual games, packs and Custom UI charges", () => {
    const b = apply(
      { type: "togglePack", id: "classics" },
      { type: "toggleGame", id: "block-blast" },
      { type: "setCustomUi", value: true },
      { type: "setTier", tier: "all-software-forever" },
    );
    expect(quote(b).lines.filter((l) => l.amount > 0).map((l) => l.key)).toEqual(["tier:all-software-forever"]);
  });

  it("validates the Custom UI welcome text", () => {
    const b = apply({ type: "setCustomUi", value: true }, { type: "setUi", patch: { welcome: "This welcome is far too long" } });
    expect(quote(b).issues[0]).toMatch(/welcome text/);
  });

  it("share codes contain option IDs only, never personal text", () => {
    const b = apply(...nameAndIcon, { type: "setCustomUi", value: true }, { type: "setUi", patch: { welcome: "Hi Sam" } });
    const code = encodeShare(b);
    const raw = Buffer.from(code.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    expect(raw).not.toContain("Sam");
    const back = decodeShare(code)!;
    expect(back.coverName).toEqual({ enabled: true, text: "", colour: "white" });
    expect(back.coverIcon.iconId).toBe("lightning");
    expect(back.ui.welcome).toBe("HACKULATOR");
    expect(quote(back).extrasSubtotal).toBe(quote(b).extrasSubtotal);
  });

  it("drops unknown or unavailable options from untrusted input", () => {
    const b = sanitizeBuild({ tier: "free-stuff", packIds: ["arcade", "nope"], gameIds: ["snake", "pong", "x"], ui: { accent: "<b>" } });
    expect(b).toMatchObject({ tier: "choose", packIds: [], gameIds: ["pong"], ui: { accent: "lime" } });
  });

  it("flags an invalid cover name", () => {
    const b = apply({ type: "setCoverNameEnabled", value: true }, { type: "setCoverNameText", text: "<script>" });
    expect(quote(b).issues).toHaveLength(1);
  });
});
