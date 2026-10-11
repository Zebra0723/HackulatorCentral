/**
 * Single source of truth for the current Hackulator offer.
 *
 * All amounts are GBP stored as integer pennies. Every price here is an
 * EXTRA on top of the base Hackulator price, which has not been announced.
 * Do not add a base price here until one is supplied.
 *
 * Games and packs form the *catalogue*. DEFAULT_CATALOGUE seeds the database;
 * after that the owner edits the catalogue in the admin area and every part of
 * the site (configurator, previews, summaries, server pricing) reads it from
 * there. Pass, personalisation and colour prices live only in this file.
 */

export type Pence = number;
export type GameId = string;
export type PackId = string;

export type GameStatus = "development" | "released" | "available";
export type PackStatus = "planned" | "available";

export interface Game {
  id: GameId;
  name: string;
  /** Short, factual description. No performance claims. */
  description: string;
  controls: string;
  /** Optional preview image URL. */
  previewMedia: string | null;
  /** development: not finished · released: finished but not sold separately · available: can be bought. */
  status: GameStatus;
  compatibility: string;
  /** Individual price; null when it can't be bought on its own. */
  pricePence: Pence | null;
  /** Included with every Hackulator; can never be removed or charged for. */
  base: boolean;
  sort: number;
}

export interface GamePack {
  id: PackId;
  name: string;
  pricePence: Pence;
  gameIds: readonly GameId[];
  /** Titles not yet decided. Shown as "to be announced", never invented. */
  tbaTitles: number;
  status: PackStatus;
  sort: number;
}

export interface Catalogue {
  games: readonly Game[];
  packs: readonly GamePack[];
}

const COMPAT = "Hackulator hardware with the colour display";

export const DEFAULT_CATALOGUE: Catalogue = {
  games: [
    { id: "snake", name: "Snake", description: "Steer, grow, avoid your own tail.", controls: "Arrow keys to steer.", previewMedia: null, status: "available", compatibility: COMPAT, pricePence: null, base: true, sort: 1 },
    { id: "2048", name: "2048", description: "Slide and merge tiles towards 2048.", controls: "Arrow keys to slide tiles.", previewMedia: null, status: "available", compatibility: COMPAT, pricePence: null, base: true, sort: 2 },
    { id: "tetris", name: "Tetris", description: "Rotate and drop falling blocks to clear lines.", controls: "Left/right to move, up to rotate, down to drop faster.", previewMedia: null, status: "available", compatibility: COMPAT, pricePence: null, base: true, sort: 3 },
    { id: "flappy-style", name: "Flappy-style game", description: "Tap to fly through the gaps.", controls: "OK to flap.", previewMedia: null, status: "available", compatibility: COMPAT, pricePence: 250, base: false, sort: 10 },
    { id: "pong", name: "Pong", description: "The classic two-paddle rally.", controls: "Up/down to move your paddle.", previewMedia: null, status: "available", compatibility: COMPAT, pricePence: 250, base: false, sort: 11 },
    { id: "dino-style-runner", name: "Dino-style runner", description: "A Google/Chrome-Dino-style endless runner.", controls: "OK to jump.", previewMedia: null, status: "available", compatibility: COMPAT, pricePence: 250, base: false, sort: 12 },
    { id: "block-blast", name: "Block Blast", description: "Place shapes, clear lines.", controls: "Arrows to move a shape, OK to place.", previewMedia: null, status: "available", compatibility: COMPAT, pricePence: 250, base: false, sort: 20 },
    { id: "space-invaders", name: "Space Invaders", description: "Hold the line against descending waves.", controls: "Left/right to move, OK to fire.", previewMedia: null, status: "available", compatibility: COMPAT, pricePence: 250, base: false, sort: 21 },
  ],
  packs: [
    { id: "classics", name: "Classics Pack", pricePence: 500, gameIds: ["flappy-style", "pong", "dino-style-runner"], tbaTitles: 0, status: "available", sort: 1 },
    { id: "arcade", name: "Arcade Pack", pricePence: 500, gameIds: ["block-blast", "space-invaders"], tbaTitles: 1, status: "planned", sort: 2 },
  ],
};

/** Can this game be bought on its own? */
export function isGameBuyable(g: Game): boolean {
  return !g.base && g.status === "available" && g.pricePence != null;
}

/** Can this pack be bought? A pack with a title still to be announced never can. */
export function isPackBuyable(p: GamePack): boolean {
  return p.status === "available" && p.tbaTitles === 0;
}

export function findGame(c: Catalogue, id: GameId): Game | undefined {
  return c.games.find((g) => g.id === id);
}

export function findPack(c: Catalogue, id: PackId): GamePack | undefined {
  return c.packs.find((p) => p.id === id);
}

export function baseGames(c: Catalogue): Game[] {
  return c.games.filter((g) => g.base);
}

export const PRICES = {
  coverName: 300,
  coverIcon: 400,
  customUi: 500,
  allGamesForever: 1000,
  allSoftwareForever: 2000,
} as const satisfies Record<string, Pence>;

export type SoftwareTier = "choose" | "all-games-forever" | "all-software-forever";

export interface TierInfo {
  id: SoftwareTier;
  name: string;
  tagline: string;
  price: Pence;
  summary: string;
  includesAllGames: boolean;
  includesCustomUi: boolean;
}

export const TIERS: readonly TierInfo[] = [
  {
    id: "choose",
    name: "Choose games",
    tagline: "Pay for what you pick",
    price: 0,
    summary: "Base games included. Add single games or packs if you want them.",
    includesAllGames: false,
    includesCustomUi: false,
  },
  {
    id: "all-games-forever",
    name: "The Gamer",
    tagline: "All games, forever",
    price: PRICES.allGamesForever,
    summary:
      "All games, forever. Every current and future compatible game, with installation, updates and reinstallation of covered games at no extra charge. No renewal.",
    includesAllGames: true,
    includesCustomUi: false,
  },
  {
    id: "all-software-forever",
    name: "The Hacker",
    tagline: "All software + Custom UI, forever",
    price: PRICES.allSoftwareForever,
    summary:
      "All software and Custom UI, forever. Every current and future compatible piece of software you want, including all games and Custom UI, with installation, updates and reinstalls of included software at no extra charge. No renewal.",
    includesAllGames: true,
    includesCustomUi: true,
  },
] as const;

/** Original icon options for the cover. Artwork lives in components/CoverIcons. */
export const COVER_ICONS = [
  { id: "dog", label: "Dog" },
  { id: "lightning", label: "Lightning" },
  { id: "heart", label: "Heart" },
  { id: "star", label: "Star" },
  { id: "soccer-ball", label: "Soccer ball" },
  { id: "tennis-ball", label: "Tennis ball" },
  { id: "paw-print", label: "Paw print" },
  { id: "smiley", label: "Smiley face" },
] as const;

export type CoverIconId = (typeof COVER_ICONS)[number]["id"];

/** Colours for the name and icon on the cover. Gold costs extra. */
export const COVER_COLOURS = [
  { id: "red", label: "Red", hex: "#d32f2f", surcharge: 0 },
  { id: "orange", label: "Orange", hex: "#f57c00", surcharge: 0 },
  { id: "yellow", label: "Yellow", hex: "#fbc02d", surcharge: 0 },
  { id: "green", label: "Green", hex: "#388e3c", surcharge: 0 },
  { id: "blue", label: "Blue", hex: "#1976d2", surcharge: 0 },
  { id: "black", label: "Black", hex: "#111111", surcharge: 0 },
  { id: "white", label: "White", hex: "#ffffff", surcharge: 0 },
  { id: "gold", label: "Gold", hex: "#c9a227", surcharge: 50 },
] as const satisfies readonly { id: string; label: string; hex: string; surcharge: Pence }[];

export type CoverColourId = (typeof COVER_COLOURS)[number]["id"];
export const DEFAULT_COVER_COLOUR: CoverColourId = "white";

export function getCoverColour(id: CoverColourId) {
  return COVER_COLOURS.find((c) => c.id === id) ?? COVER_COLOURS[6];
}

/**
 * Custom UI choices. These are settings inside the single £5 Custom UI option
 * (or The Hacker), not separately priced extras. Fonts are generic system
 * stacks, so nothing proprietary is bundled.
 */
export const UI_FONTS = [
  { id: "clean", label: "Clean", stack: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial, sans-serif' },
  { id: "rounded", label: "Rounded", stack: 'ui-rounded, "Arial Rounded MT Bold", "Varela Round", "Nunito", system-ui, sans-serif' },
  { id: "mono", label: "Mono", stack: 'ui-monospace, "Cascadia Mono", "Roboto Mono", Menlo, Consolas, monospace' },
  { id: "classic", label: "Classic", stack: 'Georgia, "Times New Roman", serif' },
] as const;
export type UiFontId = (typeof UI_FONTS)[number]["id"];

export const UI_ACCENTS = [
  { id: "lime", label: "Lime", hex: "#b4e23c" },
  { id: "ocean", label: "Ocean", hex: "#4fb3ff" },
  { id: "sunset", label: "Sunset", hex: "#ff8a3d" },
  { id: "berry", label: "Berry", hex: "#ff5fa2" },
  { id: "violet", label: "Violet", hex: "#a98bff" },
  { id: "mint", label: "Mint", hex: "#3fd4a8" },
] as const;
export type UiAccentId = (typeof UI_ACCENTS)[number]["id"];

export const UI_APPEARANCES = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
] as const;
export type UiAppearanceId = (typeof UI_APPEARANCES)[number]["id"];

export const UI_LAYOUTS = [
  { id: "tiles", label: "Tiles" },
  { id: "list", label: "List" },
] as const;
export type UiLayoutId = (typeof UI_LAYOUTS)[number]["id"];

export const UI_WELCOME_MAX_LENGTH = 16;
export const UI_WELCOME_PATTERN = /^[A-Za-z0-9 .,'!?\-]*$/;
export const DEFAULT_WELCOME = "HACKULATOR";

export const COVER_NAME_MAX_LENGTH = 14;
/** Letters, numbers, spaces and a few safe punctuation marks. */
export const COVER_NAME_PATTERN = /^[A-Za-z0-9 .'\-]+$/;

export function getTier(id: SoftwareTier): TierInfo {
  const t = TIERS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown tier: ${id}`);
  return t;
}

export function formatPence(p: Pence): string {
  const sign = p < 0 ? "-" : "";
  return `${sign}£${(Math.abs(p) / 100).toFixed(2)}`;
}
