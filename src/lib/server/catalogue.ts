import "server-only";
import { DEFAULT_CATALOGUE, type Catalogue, type Game, type GamePack, type GameStatus, type PackStatus } from "@/config/offer";
import { audit } from "./audit";
import { getDb, type Db } from "./db";

type GameRow = {
  id: string; name: string; description: string; controls: string; preview_media: string | null;
  status: GameStatus; compatibility: string; price_pence: number | null; base: boolean; sort: number;
};
type PackRow = { id: string; name: string; price_pence: number; status: PackStatus; tba_titles: number; sort: number };

export async function readCatalogue(db: Db): Promise<Catalogue> {
  const games = await db.query<GameRow>("select * from catalogue_games order by sort, name");
  const packs = await db.query<PackRow>("select * from catalogue_packs order by sort, name");
  const links = await db.query<{ pack_id: string; game_id: string }>("select pack_id, game_id from pack_games");
  return {
    games: games.map<Game>((g) => ({
      id: g.id, name: g.name, description: g.description, controls: g.controls, previewMedia: g.preview_media,
      status: g.status, compatibility: g.compatibility, pricePence: g.price_pence, base: g.base, sort: g.sort,
    })),
    packs: packs.map<GamePack>((p) => ({
      id: p.id, name: p.name, pricePence: p.price_pence, status: p.status, tbaTitles: p.tba_titles, sort: p.sort,
      gameIds: links.filter((l) => l.pack_id === p.id).map((l) => l.game_id),
    })),
  };
}

/** Public pages: the live catalogue, or the built-in defaults when no database is configured. */
export async function loadCatalogue(): Promise<{ catalogue: Catalogue; source: "database" | "defaults" }> {
  try {
    const db = await getDb();
    if (db) return { catalogue: await readCatalogue(db), source: "database" };
  } catch (e) {
    console.error("Catalogue: falling back to defaults", e);
  }
  return { catalogue: DEFAULT_CATALOGUE, source: "defaults" };
}

export class ValidationError extends Error {}

const ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const GAME_STATUSES: GameStatus[] = ["development", "released", "available"];
const PACK_STATUSES: PackStatus[] = ["planned", "available"];

function text(v: unknown, max: number, field: string, required = false): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (required && !s) throw new ValidationError(`${field} is required.`);
  if (s.length > max) throw new ValidationError(`${field} must be ${max} characters or fewer.`);
  return s;
}

export function parsePence(v: unknown, field: string, allowNull = true): number | null {
  if (v === null || v === undefined || v === "") {
    if (allowNull) return null;
    throw new ValidationError(`${field} is required.`);
  }
  const n = typeof v === "number" ? v : Number(String(v).replace(/[£,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0 || n > 10_000_000) throw new ValidationError(`${field} must be a positive amount.`);
  return Math.round(n);
}

export interface GameInput {
  id: string; name: string; description?: string; controls?: string; previewMedia?: string | null;
  status: GameStatus; compatibility?: string; pricePence?: number | null; base?: boolean; sort?: number;
}

export async function saveGame(db: Db, actor: string, input: GameInput, isNew: boolean) {
  const id = text(input.id, 40, "ID", true).toLowerCase();
  if (!ID_RE.test(id)) throw new ValidationError("ID can use lowercase letters, numbers and hyphens.");
  const name = text(input.name, 60, "Name", true);
  const status = input.status;
  if (!GAME_STATUSES.includes(status)) throw new ValidationError("Choose a status.");
  const media = text(input.previewMedia ?? "", 300, "Preview media");
  if (media && !/^(\/|https:\/\/)/.test(media)) throw new ValidationError("Preview media must be a site path (/…) or an https:// link.");
  const price = parsePence(input.pricePence, "Price");
  const base = input.base === true;
  if (base && price != null) throw new ValidationError("Base games are always included, so they can't have a price.");
  const row = [
    id, name, text(input.description, 300, "Description"), text(input.controls, 200, "Controls"), media || null,
    status, text(input.compatibility, 200, "Compatibility"), price, base, Number(input.sort ?? 100) | 0,
  ];
  const existing = await db.query("select id from catalogue_games where id = $1", [id]);
  if (isNew && existing.length) throw new ValidationError("A game with that ID already exists.");
  if (!isNew && !existing.length) throw new ValidationError("That game doesn't exist.");
  await db.query(
    `insert into catalogue_games (id, name, description, controls, preview_media, status, compatibility, price_pence, base, sort, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
     on conflict (id) do update set name=$2, description=$3, controls=$4, preview_media=$5, status=$6,
       compatibility=$7, price_pence=$8, base=$9, sort=$10, updated_at=now()`,
    row,
  );
  await audit(db, actor, isNew ? "catalogue.game.create" : "catalogue.game.update", "game", id, { name, status, pricePence: price, base });
}

export interface PackInput { id: string; name: string; pricePence: number; status: PackStatus; tbaTitles: number; sort?: number; gameIds: string[] }

export async function savePack(db: Db, actor: string, input: PackInput, isNew: boolean) {
  const id = text(input.id, 40, "ID", true).toLowerCase();
  if (!ID_RE.test(id)) throw new ValidationError("ID can use lowercase letters, numbers and hyphens.");
  const name = text(input.name, 60, "Name", true);
  if (!PACK_STATUSES.includes(input.status)) throw new ValidationError("Choose a status.");
  const price = parsePence(input.pricePence, "Price", false)!;
  const tba = Math.max(0, Math.min(10, Number(input.tbaTitles) | 0));
  if (input.status === "available" && tba > 0) throw new ValidationError("A pack with a title still to be announced can't be available to buy.");
  const games = await db.query<{ id: string; base: boolean }>("select id, base from catalogue_games");
  const gameIds = Array.from(new Set(input.gameIds ?? []));
  for (const g of gameIds) {
    const found = games.find((x) => x.id === g);
    if (!found) throw new ValidationError(`Unknown game: ${g}`);
    if (found.base) throw new ValidationError("Base games are already included and can't be in a pack.");
  }
  const existing = await db.query("select id from catalogue_packs where id = $1", [id]);
  if (isNew && existing.length) throw new ValidationError("A pack with that ID already exists.");
  if (!isNew && !existing.length) throw new ValidationError("That pack doesn't exist.");
  await db.tx(async (t) => {
    await t.query(
      `insert into catalogue_packs (id, name, price_pence, status, tba_titles, sort, updated_at) values ($1,$2,$3,$4,$5,$6, now())
       on conflict (id) do update set name=$2, price_pence=$3, status=$4, tba_titles=$5, sort=$6, updated_at=now()`,
      [id, name, price, input.status, tba, Number(input.sort ?? 100) | 0],
    );
    await t.query("delete from pack_games where pack_id = $1", [id]);
    for (const g of gameIds) await t.query("insert into pack_games (pack_id, game_id) values ($1,$2)", [id, g]);
  });
  await audit(db, actor, isNew ? "catalogue.pack.create" : "catalogue.pack.update", "pack", id, { name, pricePence: price, status: input.status, tbaTitles: tba, gameIds });
}
