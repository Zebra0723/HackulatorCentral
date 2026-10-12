import "server-only";
import { audit } from "./audit";
import { ValidationError, parsePence } from "./catalogue";
import type { Db } from "./db";

/** Things the owner can change from the control room without touching code. */
export interface SiteSettings {
  /** How many waitlist spots exist. */
  waitlistSpots: number;
  /** Whether the public can join the waitlist. */
  waitlistOpen: boolean;
  /** Optional bar across the top of the website. */
  announcementOn: boolean;
  announcementText: string;
  /** Small pill at the top of the hero. */
  statusLabel: string;
  /** Project status card. Empty = shown as "to be confirmed" / "to be published". */
  stageText: string;
  basePricePence: number | null;
  availabilityText: string;
  fulfilmentText: string;
  /** Whether order requests and questions can be sent from the website. */
  enquiriesOpen: boolean;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  waitlistSpots: 10,
  waitlistOpen: true,
  announcementOn: false,
  announcementText: "",
  statusLabel: "In development · prototype project",
  stageText: "Prototype in development",
  basePricePence: null,
  availabilityText: "",
  fulfilmentText: "",
  enquiriesOpen: true,
};

const TEXT_LIMITS: Partial<Record<keyof SiteSettings, number>> = {
  announcementText: 140,
  statusLabel: 60,
  stageText: 60,
  availabilityText: 120,
  fulfilmentText: 200,
};

export async function getSettings(db: Db | null): Promise<SiteSettings> {
  if (!db) return { ...DEFAULT_SETTINGS };
  const rows = await db.query<{ key: string; value: unknown }>("select key, value from site_settings");
  const out: SiteSettings = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    if (r.key in DEFAULT_SETTINGS) {
      const def = DEFAULT_SETTINGS[r.key as keyof SiteSettings];
      const v = r.value;
      if (r.key === "basePricePence" ? v === null || typeof v === "number" : typeof v === typeof def) {
        (out as unknown as Record<string, unknown>)[r.key] = v;
      }
    }
  }
  return out;
}

function clean(v: unknown, max: number) {
  return String(v ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, max);
}

/** Validate and save any subset of settings. Unknown keys are ignored. */
export async function saveSettings(db: Db, actor: string, input: Record<string, unknown>): Promise<SiteSettings> {
  const changes: Partial<SiteSettings> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[]) {
    if (!(key in input)) continue;
    const v = input[key];
    if (key === "waitlistSpots") {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 10000) throw new ValidationError("Waitlist spots must be a whole number from 0 to 10,000.");
      changes.waitlistSpots = n;
    } else if (key === "basePricePence") {
      changes.basePricePence = v === null || v === "" ? null : parsePence(v, "Base price");
    } else if (typeof DEFAULT_SETTINGS[key] === "boolean") {
      (changes as Record<string, unknown>)[key] = v === true || v === "true";
    } else {
      (changes as Record<string, unknown>)[key] = clean(v, TEXT_LIMITS[key] ?? 120);
    }
  }
  if (changes.announcementOn && !(changes.announcementText ?? (await getSettings(db)).announcementText)) {
    throw new ValidationError("Write the announcement text before switching it on.");
  }
  await db.tx(async (t) => {
    for (const [key, value] of Object.entries(changes)) {
      await t.query(
        `insert into site_settings (key, value, updated_at) values ($1, $2::jsonb, now())
         on conflict (key) do update set value = excluded.value, updated_at = now()`,
        [key, JSON.stringify(value)],
      );
    }
  });
  if (Object.keys(changes).length) await audit(db, actor, "settings.update", "settings", null, changes);
  return getSettings(db);
}
