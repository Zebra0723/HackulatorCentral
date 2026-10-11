import {
  COVER_COLOURS,
  COVER_ICONS,
  COVER_NAME_MAX_LENGTH,
  COVER_NAME_PATTERN,
  DEFAULT_CATALOGUE,
  DEFAULT_COVER_COLOUR,
  DEFAULT_WELCOME,
  PRICES,
  TIERS,
  UI_ACCENTS,
  UI_APPEARANCES,
  UI_FONTS,
  UI_LAYOUTS,
  UI_WELCOME_MAX_LENGTH,
  UI_WELCOME_PATTERN,
  baseGames,
  findGame,
  findPack,
  formatPence,
  getCoverColour,
  getTier,
  isGameBuyable,
  isPackBuyable,
  type Catalogue,
  type CoverColourId,
  type CoverIconId,
  type GameId,
  type PackId,
  type Pence,
  type SoftwareTier,
  type UiAccentId,
  type UiAppearanceId,
  type UiFontId,
  type UiLayoutId,
} from "@/config/offer";

export interface UiSettings {
  font: UiFontId;
  accent: UiAccentId;
  appearance: UiAppearanceId;
  layout: UiLayoutId;
  /** Personal text: never placed in share links. */
  welcome: string;
}

export interface Build {
  tier: SoftwareTier;
  /** Individually chosen extra games. Kept while a pass is active so switching back restores them. */
  gameIds: GameId[];
  packIds: PackId[];
  customUi: boolean;
  /** Custom UI look. Only used when Custom UI is chosen or included. */
  ui: UiSettings;
  coverName: { enabled: boolean; text: string; colour: CoverColourId };
  coverIcon: { enabled: boolean; iconId: CoverIconId | null; colour: CoverColourId };
}

export const DEFAULT_UI: UiSettings = { font: "clean", accent: "lime", appearance: "dark", layout: "tiles", welcome: DEFAULT_WELCOME };

export const EMPTY_BUILD: Build = {
  tier: "choose",
  gameIds: [],
  packIds: [],
  customUi: false,
  ui: DEFAULT_UI,
  coverName: { enabled: false, text: "", colour: DEFAULT_COVER_COLOUR },
  coverIcon: { enabled: false, iconId: null, colour: DEFAULT_COVER_COLOUR },
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

function unique<T>(xs: readonly T[]): T[] {
  return Array.from(new Set(xs));
}

function activePackIds(build: Build, cat: Catalogue): PackId[] {
  if (build.tier !== "choose") return [];
  return unique(build.packIds).filter((id) => {
    const p = findPack(cat, id);
    return p != null && isPackBuyable(p);
  });
}

/** Why (if at all) a game is part of this build. Ownership only, not installation. */
export function gameCoverage(build: Build, id: GameId, cat: Catalogue = DEFAULT_CATALOGUE): GameCoverage {
  const g = findGame(cat, id);
  if (g?.base) return { kind: "base" };
  if (getTier(build.tier).includesAllGames) return { kind: "tier", tier: build.tier };
  const pack = activePackIds(build, cat).find((p) => findPack(cat, p)!.gameIds.includes(id));
  if (pack) return { kind: "pack", packId: pack };
  if (build.gameIds.includes(id) && g && isGameBuyable(g)) return { kind: "chosen" };
  return { kind: "none" };
}

/** Every game this build owns, in catalogue order (base games first). */
export function ownedGames(build: Build, cat: Catalogue = DEFAULT_CATALOGUE) {
  return [...cat.games]
    .sort((a, b) => a.sort - b.sort)
    .filter((g) => {
      const c = gameCoverage(build, g.id, cat);
      if (c.kind === "none") return false;
      // A pass covers released/available games; unfinished ones are "coming" not owned-and-playable yet.
      if (c.kind === "tier") return g.status !== "development";
      return true;
    });
}

/** Individually chosen games that are actually charged (deduplicated by id). */
export function chargedGameIds(build: Build, cat: Catalogue = DEFAULT_CATALOGUE): GameId[] {
  if (build.tier !== "choose") return [];
  const covered = new Set(activePackIds(build, cat).flatMap((p) => findPack(cat, p)!.gameIds));
  return unique(build.gameIds).filter((id) => {
    const g = findGame(cat, id);
    return g != null && isGameBuyable(g) && !covered.has(id);
  });
}

export function validateCoverName(text: string): string | null {
  const t = text.trim();
  if (t.length === 0) return "Enter the name you would like on the cover.";
  if (t.length > COVER_NAME_MAX_LENGTH) return `Use ${COVER_NAME_MAX_LENGTH} characters or fewer so it fits the printable area.`;
  if (!COVER_NAME_PATTERN.test(t)) return "Use letters, numbers, spaces, full stops, hyphens or apostrophes only.";
  return null;
}

export function validateWelcome(text: string): string | null {
  if (text.trim().length === 0) return "Enter some welcome text, or keep HACKULATOR.";
  if (text.length > UI_WELCOME_MAX_LENGTH) return `Use ${UI_WELCOME_MAX_LENGTH} characters or fewer so it fits the screen.`;
  if (!UI_WELCOME_PATTERN.test(text)) return "Use letters, numbers, spaces and basic punctuation only.";
  return null;
}

export function uiIncluded(build: Build): boolean {
  return getTier(build.tier).includesCustomUi || build.customUi;
}

function pushColourSurcharge(lines: LineItem[], key: string, what: string, colour: CoverColourId) {
  const c = getCoverColour(colour);
  if (c.surcharge > 0) lines.push({ key, label: `${what} colour: ${c.label}`, amount: c.surcharge });
}

export function quote(build: Build, cat: Catalogue = DEFAULT_CATALOGUE): Quote {
  const lines: LineItem[] = [];
  const issues: string[] = [];
  const tier = getTier(build.tier);

  const bases = baseGames(cat).map((g) => g.name);
  lines.push({ key: "base-games", label: joinNames(bases), amount: 0, note: "Included" });

  let separateSoftware = 0;
  if (build.tier === "choose") {
    for (const id of activePackIds(build, cat)) {
      const pack = findPack(cat, id)!;
      lines.push({ key: `pack:${id}`, label: pack.name, amount: pack.pricePence });
      separateSoftware += pack.pricePence;
    }
    for (const id of chargedGameIds(build, cat)) {
      const g = findGame(cat, id)!;
      lines.push({ key: `game:${id}`, label: g.name, amount: g.pricePence! });
      separateSoftware += g.pricePence!;
    }
  } else {
    lines.push({ key: `tier:${tier.id}`, label: tier.name, amount: tier.price });
  }

  if (tier.includesCustomUi) {
    lines.push({ key: "custom-ui", label: "Custom UI", amount: 0, note: "Included in pass" });
  } else if (build.customUi) {
    lines.push({ key: "custom-ui", label: "Custom UI", amount: PRICES.customUi });
  }
  if (uiIncluded(build)) {
    const err = validateWelcome(build.ui.welcome);
    if (err) issues.push(`Custom UI welcome text: ${err}`);
  }

  if (build.coverName.enabled) {
    const err = validateCoverName(build.coverName.text);
    const label = err ? "Name on cover" : `Name on cover: “${build.coverName.text.trim()}”`;
    lines.push({ key: "cover-name", label, amount: PRICES.coverName });
    pushColourSurcharge(lines, "cover-name-colour", "Name", build.coverName.colour);
    if (err) issues.push(`Name on cover: ${err}`);
  }

  if (build.coverIcon.enabled) {
    lines.push({ key: "cover-icon", label: "Icon on cover", amount: PRICES.coverIcon });
    pushColourSurcharge(lines, "cover-icon-colour", "Icon", build.coverIcon.colour);
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

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
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
  | { type: "setCoverNameColour"; colour: CoverColourId }
  | { type: "setCoverIconColour"; colour: CoverColourId }
  | { type: "setUi"; patch: Partial<UiSettings> }
  | { type: "load"; build: Build }
  | { type: "reset" };

function toggle<T>(xs: readonly T[], x: T): T[] {
  return xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x];
}

export function makeBuildReducer(cat: Catalogue) {
  return function reducer(build: Build, action: BuildAction): Build {
    switch (action.type) {
      case "setTier":
        // Physical extras and earlier software picks are kept; pricing ignores
        // whatever the chosen pass already covers.
        return { ...build, tier: action.tier };
      case "toggleGame": {
        const game = findGame(cat, action.id);
        if (!game || !isGameBuyable(game) || build.tier !== "choose") return build;
        return { ...build, gameIds: toggle(build.gameIds, action.id) };
      }
      case "togglePack": {
        const pack = findPack(cat, action.id);
        if (!pack || !isPackBuyable(pack) || build.tier !== "choose") return build;
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
      case "setCoverNameColour":
        return { ...build, coverName: { ...build.coverName, colour: action.colour } };
      case "setCoverIconColour":
        return { ...build, coverIcon: { ...build.coverIcon, colour: action.colour } };
      case "setUi":
        return { ...build, ui: { ...build.ui, ...action.patch } };
      case "load":
        return sanitizeBuild(action.build, cat);
      case "reset":
        return EMPTY_BUILD;
    }
  };
}

export const buildReducer = makeBuildReducer(DEFAULT_CATALOGUE);

const oneOf = <T extends string>(v: unknown, allowed: readonly { id: T }[], fallback: T): T =>
  typeof v === "string" && allowed.some((a) => a.id === v) ? (v as T) : fallback;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/**
 * Turn untrusted input (a share link, local storage, an API request body) into a
 * valid Build. Unknown or unavailable options are dropped, never guessed.
 */
export function sanitizeBuild(raw: unknown, cat: Catalogue = DEFAULT_CATALOGUE): Build {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const ui = (r.ui && typeof r.ui === "object" ? r.ui : {}) as Record<string, unknown>;
  const cn = (r.coverName && typeof r.coverName === "object" ? r.coverName : {}) as Record<string, unknown>;
  const ci = (r.coverIcon && typeof r.coverIcon === "object" ? r.coverIcon : {}) as Record<string, unknown>;
  const ids = (v: unknown) => (Array.isArray(v) ? unique(v.filter((x): x is string => typeof x === "string")).slice(0, 50) : []);
  return {
    tier: oneOf(r.tier, TIERS, "choose"),
    gameIds: ids(r.gameIds).filter((id) => {
      const g = findGame(cat, id);
      return g != null && isGameBuyable(g);
    }),
    packIds: ids(r.packIds).filter((id) => {
      const p = findPack(cat, id);
      return p != null && isPackBuyable(p);
    }),
    customUi: r.customUi === true,
    ui: {
      font: oneOf(ui.font, UI_FONTS, DEFAULT_UI.font),
      accent: oneOf(ui.accent, UI_ACCENTS, DEFAULT_UI.accent),
      appearance: oneOf(ui.appearance, UI_APPEARANCES, DEFAULT_UI.appearance),
      layout: oneOf(ui.layout, UI_LAYOUTS, DEFAULT_UI.layout),
      welcome: typeof ui.welcome === "string" ? str(ui.welcome, UI_WELCOME_MAX_LENGTH + 10) : DEFAULT_UI.welcome,
    },
    coverName: {
      enabled: cn.enabled === true,
      text: str(cn.text, COVER_NAME_MAX_LENGTH + 10),
      colour: oneOf(cn.colour, COVER_COLOURS, DEFAULT_COVER_COLOUR),
    },
    coverIcon: {
      enabled: ci.enabled === true,
      iconId: COVER_ICONS.some((i) => i.id === ci.iconId) ? (ci.iconId as CoverIconId) : null,
      colour: oneOf(ci.colour, COVER_COLOURS, DEFAULT_COVER_COLOUR),
    },
  };
}

/**
 * Public share code: option IDs only. The cover name and welcome text are
 * personal, so they are deliberately left out.
 */
export function encodeShare(build: Build): string {
  const data = {
    t: build.tier,
    g: build.gameIds,
    p: build.packIds,
    u: build.customUi ? 1 : 0,
    f: build.ui.font,
    a: build.ui.accent,
    m: build.ui.appearance,
    l: build.ui.layout,
    n: build.coverName.enabled ? build.coverName.colour : 0,
    i: build.coverIcon.enabled ? [build.coverIcon.iconId, build.coverIcon.colour] : 0,
  };
  const json = JSON.stringify(data);
  const b64 = typeof btoa === "function" ? btoa(json) : Buffer.from(json, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShare(code: string, cat: Catalogue = DEFAULT_CATALOGUE): Build | null {
  try {
    if (!/^[A-Za-z0-9_-]{1,2000}$/.test(code)) return null;
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("utf8");
    const d = JSON.parse(json) as Record<string, unknown>;
    const icon = Array.isArray(d.i) ? d.i : null;
    return sanitizeBuild(
      {
        tier: d.t,
        gameIds: d.g,
        packIds: d.p,
        customUi: d.u === 1,
        ui: { font: d.f, accent: d.a, appearance: d.m, layout: d.l, welcome: DEFAULT_UI.welcome },
        coverName: { enabled: typeof d.n === "string", text: "", colour: d.n },
        coverIcon: { enabled: icon != null, iconId: icon?.[0], colour: icon?.[1] },
      },
      cat,
    );
  } catch {
    return null;
  }
}

export function buildSummaryText(build: Build, q: Quote = quote(build), cat: Catalogue = DEFAULT_CATALOGUE): string {
  const out: string[] = ["Hackulator build summary", "========================", ""];
  for (const l of q.lines) {
    out.push(`- ${l.label}: ${l.amount === 0 ? (l.note ?? "Included") : formatPence(l.amount)}`);
  }
  const details: string[] = [];
  const owned = ownedGames(build, cat).map((g) => g.name);
  details.push(`- Games: ${owned.join(", ")}${getTier(build.tier).includesAllGames ? ", plus future compatible games" : ""}`);
  if (build.coverName.enabled) details.push(`- Name colour: ${getCoverColour(build.coverName.colour).label}`);
  if (build.coverIcon.enabled) {
    const icon = COVER_ICONS.find((i) => i.id === build.coverIcon.iconId);
    details.push(`- Icon: ${icon ? icon.label : "not chosen yet"}, ${getCoverColour(build.coverIcon.colour).label}`);
  }
  if (uiIncluded(build)) details.push(`- Custom UI: ${describeUi(build.ui)}`);
  out.push("", "Details:", ...details);
  out.push("", `Extras subtotal: ${formatPence(q.extrasSubtotal)}`, "Base price: to be confirmed");
  if (q.issues.length) out.push("", "Still to complete:", ...q.issues.map((i) => `- ${i}`));
  out.push(
    "",
    "This is a build summary only. It is not an order and no payment has been taken.",
    "Hackulator is a prototype in development.",
  );
  return out.join("\n");
}

export function describeUi(ui: UiSettings): string {
  const font = UI_FONTS.find((f) => f.id === ui.font)!.label;
  const accent = UI_ACCENTS.find((a) => a.id === ui.accent)!.label;
  const appearance = UI_APPEARANCES.find((a) => a.id === ui.appearance)!.label;
  const layout = UI_LAYOUTS.find((l) => l.id === ui.layout)!.label;
  return `${font} font, ${accent} accent, ${appearance} appearance, ${layout} menu, welcome text “${ui.welcome}”`;
}
