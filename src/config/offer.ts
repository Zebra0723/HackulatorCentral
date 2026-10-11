/**
 * Single source of truth for the current Hackulator offer.
 *
 * All amounts are GBP stored as integer pennies. Every price here is an
 * EXTRA on top of the base Hackulator price, which has not been announced.
 * Do not add a base price here until one is supplied.
 */

export type Pence = number;

export type GameId =
  | "snake"
  | "2048"
  | "blocks"
  | "flappy-style"
  | "pong"
  | "dino-style-runner"
  | "block-blast"
  | "space-invaders";

export interface Game {
  id: GameId;
  name: string;
  /** Short, factual description. No performance claims. */
  description: string;
  /** Included with every Hackulator; can never be removed or charged for. */
  base: boolean;
  /** Can be chosen as a single £2.50 extra. */
  availableIndividually: boolean;
}

export const GAMES: readonly Game[] = [
  { id: "snake", name: "Snake", description: "Steer, grow, avoid your own tail.", base: true, availableIndividually: false },
  { id: "2048", name: "2048", description: "Slide and merge tiles towards 2048.", base: true, availableIndividually: false },
  { id: "blocks", name: "Blocks", description: "A Tetris-style falling-block puzzle.", base: true, availableIndividually: false },
  { id: "flappy-style", name: "Flappy-style game", description: "Tap to fly through the gaps.", base: false, availableIndividually: true },
  { id: "pong", name: "Pong", description: "The classic two-paddle rally.", base: false, availableIndividually: true },
  { id: "dino-style-runner", name: "Dino-style runner", description: "A Google-Dino-style endless runner.", base: false, availableIndividually: true },
  { id: "block-blast", name: "Block Blast", description: "Place shapes, clear lines.", base: false, availableIndividually: true },
  { id: "space-invaders", name: "Space Invaders", description: "Hold the line against descending waves.", base: false, availableIndividually: true },
] as const;

export const BASE_GAME_IDS: readonly GameId[] = GAMES.filter((g) => g.base).map((g) => g.id);

export type PackId = "classics" | "arcade";

export interface GamePack {
  id: PackId;
  name: string;
  price: Pence;
  gameIds: readonly GameId[];
  /** Titles not yet decided. Shown as "to be announced", never invented. */
  unannouncedTitles: number;
  /** A pack with unannounced titles must not be selectable. */
  available: boolean;
}

export const PACKS: readonly GamePack[] = [
  {
    id: "classics",
    name: "Classics Pack",
    price: 500,
    gameIds: ["flappy-style", "pong", "dino-style-runner"],
    unannouncedTitles: 0,
    available: true,
  },
  {
    id: "arcade",
    name: "Arcade Pack",
    price: 500,
    gameIds: ["block-blast", "space-invaders"],
    unannouncedTitles: 1,
    available: false,
  },
] as const;

export const PRICES = {
  singleGame: 250,
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
  price: Pence;
  summary: string;
  includesAllGames: boolean;
  includesCustomUi: boolean;
}

export const TIERS: readonly TierInfo[] = [
  {
    id: "choose",
    name: "Choose games",
    price: 0,
    summary: "Base games included. Add single games or packs if you want them.",
    includesAllGames: false,
    includesCustomUi: false,
  },
  {
    id: "all-games-forever",
    name: "The Gamer",
    price: PRICES.allGamesForever,
    summary:
      "All games, forever. Every current and future compatible game, with installation, updates and reinstallation of covered games at no extra charge. No renewal.",
    includesAllGames: true,
    includesCustomUi: false,
  },
  {
    id: "all-software-forever",
    name: "The Hacker",
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
  return COVER_COLOURS.find((c) => c.id === id)!;
}

/** Custom UI choices. Fonts are generic system stacks, so nothing proprietary is bundled. */
export const UI_FONTS = [
  { id: "clean", label: "Clean", stack: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial, sans-serif' },
  { id: "rounded", label: "Rounded", stack: 'ui-rounded, "Arial Rounded MT Bold", "Varela Round", "Nunito", system-ui, sans-serif' },
  { id: "mono", label: "Mono", stack: 'ui-monospace, "Cascadia Mono", "Roboto Mono", Menlo, Consolas, monospace' },
  { id: "classic", label: "Classic", stack: 'Georgia, "Times New Roman", serif' },
] as const;

export type UiFontId = (typeof UI_FONTS)[number]["id"];

export const UI_THEMES = [
  { id: "lime", label: "Lime", accent: "#b4e23c", bg: "#10140a", text: "#f3f1ec", onAccent: "#1c2606" },
  { id: "ocean", label: "Ocean", accent: "#4fb3ff", bg: "#071521", text: "#eef6ff", onAccent: "#04213a" },
  { id: "sunset", label: "Sunset", accent: "#ff8a3d", bg: "#1d0f08", text: "#fff3ea", onAccent: "#3a1600" },
  { id: "berry", label: "Berry", accent: "#ff5fa2", bg: "#1b0912", text: "#ffeef5", onAccent: "#3d0620" },
  { id: "violet", label: "Violet", accent: "#a98bff", bg: "#110d22", text: "#f3efff", onAccent: "#1d1240" },
  { id: "paper", label: "Paper", accent: "#141413", bg: "#f4f1ea", text: "#141413", onAccent: "#f4f1ea" },
] as const;

export type UiThemeId = (typeof UI_THEMES)[number]["id"];

export const COVER_NAME_MAX_LENGTH = 14;
/** Letters, numbers, spaces and a few safe punctuation marks. */
export const COVER_NAME_PATTERN = /^[A-Za-z0-9 .'\-]+$/;

export function getGame(id: GameId): Game {
  const g = GAMES.find((x) => x.id === id);
  if (!g) throw new Error(`Unknown game id: ${id}`);
  return g;
}

export function getPack(id: PackId): GamePack {
  const p = PACKS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown pack id: ${id}`);
  return p;
}

export function getTier(id: SoftwareTier): TierInfo {
  const t = TIERS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown tier: ${id}`);
  return t;
}

export function formatPence(p: Pence): string {
  return `£${(p / 100).toFixed(2)}`;
}
