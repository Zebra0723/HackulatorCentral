import "server-only";
import { SCHEMA_SQL, backfillWaitlistCodes, seedCatalogue } from "./schema";

export type Row = Record<string, unknown>;

export interface Db {
  mode: "postgres" | "demo";
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
  exec(text: string): Promise<void>;
  tx<R>(fn: (db: Db) => Promise<R>): Promise<R>;
}

/**
 * postgres: DATABASE_URL is set (Neon / Vercel Postgres / any Postgres).
 * demo: no DATABASE_URL and not production (or HACKULATOR_DEMO_MODE=1). Uses an
 *       embedded Postgres (PGlite) stored in .data/ on THIS machine only.
 * none: production without a database. Features that need storage say so.
 */
export function dbMode(): "postgres" | "demo" | "none" {
  if (process.env.DATABASE_URL) return "postgres";
  if (process.env.NODE_ENV !== "production" || process.env.HACKULATOR_DEMO_MODE === "1") return "demo";
  return "none";
}

type PgLike = {
  unsafe: (q: string, p?: unknown[]) => Promise<unknown[]>;
  begin: <R>(fn: (tx: PgLike) => Promise<R>) => Promise<R>;
};

function wrapPostgres(sql: PgLike): Db {
  return {
    mode: "postgres",
    query: async <T,>(text: string, params: unknown[] = []) => (await sql.unsafe(text, params as never[])) as T[],
    exec: async (text: string) => {
      await sql.unsafe(text);
    },
    tx: (fn) => sql.begin((tx) => fn(wrapPostgres(tx))),
  };
}

type PgliteLike = {
  query: (q: string, p?: unknown[]) => Promise<{ rows: unknown[] }>;
  exec: (q: string) => Promise<unknown>;
  transaction?: <R>(fn: (tx: PgliteLike) => Promise<R>) => Promise<R>;
};

function wrapPglite(pg: PgliteLike, inTx = false): Db {
  return {
    mode: "demo",
    query: async <T,>(text: string, params: unknown[] = []) => (await pg.query(text, params)).rows as T[],
    exec: async (text: string) => {
      await pg.exec(text);
    },
    tx: (fn) => (inTx || !pg.transaction ? fn(wrapPglite(pg, true)) : pg.transaction((tx) => fn(wrapPglite(tx, true)))),
  };
}

const globalKey = Symbol.for("hackulator.db");
type G = typeof globalThis & { [globalKey]?: Promise<Db | null> };

async function connect(): Promise<Db | null> {
  const mode = dbMode();
  let db: Db;
  if (mode === "none") return null;
  if (mode === "postgres") {
    const { default: postgres } = await import("postgres");
    const sql = postgres(process.env.DATABASE_URL!, {
      max: Number(process.env.DATABASE_POOL_MAX ?? 3),
      prepare: false, // works with poolers such as Neon's
      idle_timeout: 20,
      onnotice: () => {},
    });
    db = wrapPostgres(sql as unknown as PgLike);
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = process.env.HACKULATOR_DEMO_DIR ?? "./.data/demo-db";
    if (dir !== "memory://") {
      const { mkdirSync } = await import("node:fs");
      mkdirSync(dir, { recursive: true });
    }
    const pg = dir === "memory://" ? new PGlite() : new PGlite(dir);
    db = wrapPglite(pg as unknown as PgliteLike);
  }
  await db.exec(SCHEMA_SQL);
  await seedCatalogue(db);
  await backfillWaitlistCodes(db);
  return db;
}

/** Shared connection (survives hot reloads in development). */
export function getDb(): Promise<Db | null> {
  const g = globalThis as G;
  if (!g[globalKey]) {
    g[globalKey] = connect().catch((e) => {
      g[globalKey] = undefined;
      throw e;
    });
  }
  return g[globalKey]!;
}

/** For tests: start from a fresh in-memory database. */
export function resetDbForTests() {
  (globalThis as G)[globalKey] = undefined;
}

export async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new NoDatabaseError();
  return db;
}

export class NoDatabaseError extends Error {
  constructor() {
    super("No database is configured. Set DATABASE_URL (see README).");
  }
}
