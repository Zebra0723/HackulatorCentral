import {
  BASE_GAME_IDS,
  COVER_NAME_MAX_LENGTH,
  COVER_NAME_PATTERN,
  PRICES,
  formatPence,
  getGame,
  getPack,
  getTier,
  type CoverIconId,
  type GameId,
  type PackId,
  type Pence,
  type SoftwareTier,
} from "@/config/offer";

export interface Build {
  tier: SoftwareTier;
  /** Individually chosen extra games. Kept while a pass is active so switching back restores them. */
  gameIds: GameId[];
  packIds: PackId[];
  customUi: boolean;
  coverName: { enabled: boolean; text: string };
  coverIcon: { enabled: boolean; iconId: CoverIconId | null };
}

export const EMPTY_BUILD: Build = {
  tier: "choose",
  gameIds: [],
  packIds: [],
  customUi: false,
  coverName: { enabled: false, text: "" },
  coverIcon: { enabled: false, iconId: null },
};

export interface LineItem {
  key: string;
  label: string;
  amount: Pence;
  /** Shown instead of a price when amount is 0, e.g. "Included". */
  note?: string;
}

export interface Suggestion {
  tier: Exclude<SoftwareTier, "choose">;
  /** What the user's separate software choices currently cost. */
  separateCost: Pence;
  tierPrice: Pence;
}

export interface Quote {
  lines: LineItem[];
  extrasSubtotal: Pence;
  suggestion: Suggestion | null;
  issues: string[];
}

export type GameCoverage =
  | { kind: "base" }
  | { kind: "tier"; tier: SoftwareTier }
  | { kind: "pack"; packId: PackId }
  | { kind: "chosen" }
  | { kind: "none" };

/** Why (if at all) a game is part of this build. Ownership only, not installation. */
export function gameCoverage(build: Build, id: GameId): GameCoverage {
  if (BASE_GAME_IDS.includes(id)) return { kind: "base" };
  if (getTier(build.tier).includesAllGames) return { kind: "tier", tier: build.tier };
  const pack = activePackIds(build).find((p) => getPack(p).gameIds.includes(id));
  if (pack) return { kind: "pack", packId: pack };
  if (build.gameIds.includes(id)) return { kind: "chosen" };
  return { kind: "none" };
}

function unique<T>(xs: readonly T[]): T[] {
  return Array.from(new Set(xs));
}

function activePackIds(build: Build): PackId[] {
  if (build.tier !== "choose") return [];
  return unique(build.packIds).filter((id) => getPack(id).available);
}

/** Individually chosen games that are actually charged (deduplicated by id). */
export function chargedGameIds(build: Build): GameId[] {
  if (build.tier !== "choose") return [];
  const covered = new Set(activePackIds(build).flatMap((p) => getPack(p).gameIds));
  return unique(build.gameIds).filter(
    (id) => !BASE_GAME_IDS.includes(id) && getGame(id).availableIndividually && !covered.has(id),
  );
}

export function validateCoverName(text: string): string | null {
  const t = text.trim();
  if (t.length === 0) return "Enter the name you would like on the cover.";
  if (t.length > COVER_NAME_MAX_LENGTH) return `Use ${COVER_NAME_MAX_LENGTH} characters or fewer.`;
  if (!COVER_NAME_PATTERN.test(t)) return "Use letters, numbers, spaces, full stops, hyphens or apostrophes only.";
  return null;
}

export function quote(build: Build): Quote {
  const lines: LineItem[] = [];
  const issues: string[] = [];
  const tier = getTier(build.tier);

  lines.push({ key: "base-games", label: "Snake, 2048 and Blocks", amount: 0, note: "Included" });

  let separateSoftware = 0;
  if (build.tier === "choose") {
    for (const id of activePackIds(build)) {
      const pack = getPack(id);
      lines.push({ key: `pack:${id}`, label: pack.name, amount: pack.price });
      separateSoftware += pack.price;
    }
    for (const id of chargedGameIds(build)) {
      lines.push({ key: `game:${id}`, label: getGame(id).name, amount: PRICES.singleGame });
      separateSoftware += PRICES.singleGame;
    }
  } else {
    lines.push({ key: `tier:${tier.id}`, label: tier.name, amount: tier.price });
  }

  if (tier.includesCustomUi) {
    lines.push({ key: "custom-ui", label: "Custom UI", amount: 0, note: "Included in pass" });
  } else if (build.customUi) {
    lines.push({ key: "custom-ui", label: "Custom UI", amount: PRICES.customUi });
  }

  if (build.coverName.enabled) {
    const err = validateCoverName(build.coverName.text);
    const label = err ? "Name on cover" : `Name on cover: “${build.coverName.text.trim()}”`;
    lines.push({ key: "cover-name", label, amount: PRICES.coverName });
    if (err) issues.push(`Name on cover: ${err}`);
  }

  if (build.coverIcon.enabled) {
    lines.push({ key: "cover-icon", label: "Icon on cover", amount: PRICES.coverIcon });
    if (!build.coverIcon.iconId) issues.push("Icon on cover: choose an icon.");
  }

  const extrasSubtotal = lines.reduce((sum, l) => sum + l.amount, 0);

  let suggestion: Suggestion | null = null;
  if (build.tier === "choose") {
    const withUi = separateSoftware + (build.customUi ? PRICES.customUi : 0);
    if (build.customUi && withUi >= PRICES.allSoftwareForever) {
      suggestion = { tier: "all-software-forever", separateCost: withUi, tierPrice: PRICES.allSoftwareForever };
    } else if (separateSoftware >= PRICES.allGamesForever) {
      suggestion = { tier: "all-games-forever", separateCost: separateSoftware, tierPrice: PRICES.allGamesForever };
    }
  }

  return { lines, extrasSubtotal, suggestion, issues };
}

export type BuildAction =
  | { type: "setTier"; tier: SoftwareTier }
  | { type: "toggleGame"; id: GameId }
  | { type: "togglePack"; id: PackId }
  | { type: "setCustomUi"; value: boolean }
  | { type: "setCoverNameEnabled"; value: boolean }
  | { type: "setCoverNameText"; text: string }
  | { type: "setCoverIconEnabled"; value: boolean }
  | { type: "setCoverIcon"; iconId: CoverIconId }
  | { type: "reset" };

function toggle<T>(xs: readonly T[], x: T): T[] {
  return xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x];
}

export function buildReducer(build: Build, action: BuildAction): Build {
  switch (action.type) {
    case "setTier":
      // Physical extras and earlier software picks are kept; pricing ignores
      // whatever the chosen pass already covers.
      return { ...build, tier: action.tier };
    case "toggleGame": {
      const game = getGame(action.id);
      if (game.base || !game.availableIndividually || build.tier !== "choose") return build;
      return { ...build, gameIds: toggle(build.gameIds, action.id) };
    }
    case "togglePack": {
      if (!getPack(action.id).available || build.tier !== "choose") return build;
      return { ...build, packIds: toggle(build.packIds, action.id) };
    }
    case "setCustomUi":
      if (getTier(build.tier).includesCustomUi) return build;
      return { ...build, customUi: action.value };
    case "setCoverNameEnabled":
      return { ...build, coverName: { ...build.coverName, enabled: action.value } };
    case "setCoverNameText":
      return { ...build, coverName: { ...build.coverName, text: action.text } };
    case "setCoverIconEnabled":
      return { ...build, coverIcon: { ...build.coverIcon, enabled: action.value } };
    case "setCoverIcon":
      return { ...build, coverIcon: { ...build.coverIcon, iconId: action.iconId } };
    case "reset":
      return EMPTY_BUILD;
  }
}

export function buildSummaryText(build: Build, q: Quote = quote(build)): string {
  const out: string[] = ["Hackulator build summary", "========================", ""];
  for (const l of q.lines) {
    out.push(`- ${l.label}: ${l.amount === 0 ? (l.note ?? "Included") : formatPence(l.amount)}`);
  }
  if (build.coverIcon.enabled && build.coverIcon.iconId) out.push(`  Icon chosen: ${build.coverIcon.iconId}`);
  out.push("", `Extras subtotal: ${formatPence(q.extrasSubtotal)}`, "Base price: to be confirmed");
  if (q.issues.length) out.push("", "Still to complete:", ...q.issues.map((i) => `- ${i}`));
  out.push(
    "",
    "This is a build summary only. It is not an order, no payment has been taken",
    "and nothing has been sent. Hackulator is a prototype in development.",
  );
  return out.join("\n");
}
