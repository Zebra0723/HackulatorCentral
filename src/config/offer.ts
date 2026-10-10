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
  | "block-blast-style"
  | "space-invaders-style";

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
  { id: "block-blast-style", name: "Block-Blast-style puzzle", description: "Place shapes, clear lines.", base: false, availableIndividually: true },
  { id: "space-invaders-style", name: "Space-Invaders-style shooter", description: "Hold the line against descending waves.", base: false, availableIndividually: true },
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
    gameIds: ["block-blast-style", "space-invaders-style"],
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
    name: "All Games Forever",
    price: PRICES.allGamesForever,
    summary:
      "Every current and future compatible game, with installation, updates and reinstallation of covered games at no extra charge. No renewal.",
    includesAllGames: true,
    includesCustomUi: false,
  },
  {
    id: "all-software-forever",
    name: "All Software Forever + Custom UI",
    price: PRICES.allSoftwareForever,
    summary:
      "Every current and future compatible piece of software you want, including all games and Custom UI, with installation, updates and reinstalls of included software at no extra charge. No renewal.",
    includesAllGames: true,
    includesCustomUi: true,
  },
] as const;

/** Original icon options for the cover. Artwork lives in components/CoverIcons. */
export const COVER_ICONS = [
  { id: "bolt", label: "Bolt" },
  { id: "star", label: "Star" },
  { id: "heart", label: "Heart" },
  { id: "rocket", label: "Rocket" },
  { id: "note", label: "Music note" },
  { id: "invader", label: "Pixel creature" },
] as const;

export type CoverIconId = (typeof COVER_ICONS)[number]["id"];

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
