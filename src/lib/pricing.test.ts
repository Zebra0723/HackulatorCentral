import { describe, expect, it } from "vitest";
import { EMPTY_BUILD, buildReducer, buildSummaryText, quote, type Build, type BuildAction } from "./pricing";

const apply = (...actions: BuildAction[]): Build => actions.reduce(buildReducer, EMPTY_BUILD);

const nameAndIcon: BuildAction[] = [
  { type: "setCoverNameEnabled", value: true },
  { type: "setCoverNameText", text: "Sam" },
  { type: "setCoverIconEnabled", value: true },
  { type: "setCoverIcon", iconId: "bolt" },
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
    let b = apply({ type: "togglePack", id: "classics" }, { type: "toggleGame", id: "space-invaders-style" }, ...nameAndIcon);
    expect(quote(b).extrasSubtotal).toBe(500 + 250 + 700);

    b = buildReducer(b, { type: "setTier", tier: "all-games-forever" });
    expect(b.coverName).toEqual({ enabled: true, text: "Sam" });
    expect(b.coverIcon).toEqual({ enabled: true, iconId: "bolt" });
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

  it("suggests All Games Forever when separate games cost the same or more, without switching", () => {
    const b = apply(
      { type: "togglePack", id: "classics" },
      { type: "toggleGame", id: "block-blast-style" },
      { type: "toggleGame", id: "space-invaders-style" },
    );
    const q = quote(b);
    expect(q.extrasSubtotal).toBe(1000);
    expect(q.suggestion).toMatchObject({ tier: "all-games-forever", separateCost: 1000 });
    expect(b.tier).toBe("choose");
  });

  it("no suggestion below the pass price", () => {
    expect(quote(apply({ type: "togglePack", id: "classics" })).suggestion).toBeNull();
  });

  it("flags an invalid cover name", () => {
    const b = apply({ type: "setCoverNameEnabled", value: true }, { type: "setCoverNameText", text: "<script>" });
    expect(quote(b).issues).toHaveLength(1);
  });
});
