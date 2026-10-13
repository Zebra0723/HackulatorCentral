import "server-only";
import { DEFAULT_CATALOGUE } from "@/config/offer";
import type { Db } from "./db";
import { newWaitlistCode } from "./waitlist-code";

/**
 * Database schema. Idempotent: safe to run on every start. The same SQL is
 * shipped as db/schema.sql for people who prefer to run it by hand.
 */
export const SCHEMA_SQL = `
create table if not exists admin_users (
  id serial primary key,
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
create table if not exists admin_sessions (
  token_hash text primary key,
  user_id int not null references admin_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create table if not exists login_attempts (
  key text primary key,
  count int not null,
  window_start timestamptz not null
);

create table if not exists catalogue_games (
  id text primary key,
  name text not null,
  description text not null default '',
  controls text not null default '',
  preview_media text,
  status text not null check (status in ('development','released','available')),
  compatibility text not null default '',
  price_pence int check (price_pence is null or price_pence >= 0),
  base boolean not null default false,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists catalogue_packs (
  id text primary key,
  name text not null,
  price_pence int not null check (price_pence >= 0),
  status text not null check (status in ('planned','available')),
  tba_titles int not null default 0 check (tba_titles >= 0),
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists pack_games (
  pack_id text not null references catalogue_packs(id) on delete cascade,
  game_id text not null references catalogue_games(id) on delete cascade,
  primary key (pack_id, game_id)
);

create sequence if not exists enquiry_ref_seq;
create sequence if not exists order_ref_seq;
create sequence if not exists device_ref_seq;

create table if not exists enquiries (
  id serial primary key,
  reference text unique not null,
  kind text not null check (kind in ('order','enquiry')),
  status text not null default 'new' check (status in ('new','reviewed','converted','closed')),
  name text not null,
  email text not null,
  message text not null default '',
  build jsonb,
  quote jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id serial primary key,
  reference text unique not null,
  enquiry_id int references enquiries(id) on delete set null,
  job_type text not null check (job_type in ('new_build','software','repair','ui_change')),
  status text not null,
  customer_name text not null,
  customer_email text not null default '',
  build jsonb,
  quote jsonb,
  extras_pence int not null default 0,
  base_price_pence int check (base_price_pence is null or base_price_pence >= 0),
  agreed_total_pence int check (agreed_total_pence is null or agreed_total_pence >= 0),
  covered boolean not null default false,
  estimated_ready date,
  donor_received_at timestamptz,
  tracking_token text unique,
  tracking_created_at timestamptz,
  archived boolean not null default false,
  cancelled_at timestamptz,
  cancel_reason text,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payments (
  id serial primary key,
  order_id int not null references orders(id) on delete restrict,
  amount_pence int not null,
  method text not null default '',
  note text not null default '',
  received_at timestamptz not null default now(),
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists order_events (
  id serial primary key,
  order_id int not null references orders(id) on delete cascade,
  kind text not null,
  status text,
  message text not null default '',
  customer_visible boolean not null default true,
  hidden boolean not null default false,
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on order_events(order_id, created_at);

create table if not exists order_photos (
  id serial primary key,
  order_id int not null references orders(id) on delete cascade,
  mime text not null,
  bytes bytea not null,
  size int not null,
  caption text not null default '',
  removed_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists devices (
  id serial primary key,
  reference text unique not null,
  order_id int references orders(id) on delete set null,
  owner_name text not null default '',
  hardware_revision text not null default '',
  software_version text not null default '',
  owned jsonb not null default '[]',
  installed jsonb not null default '[]',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_records (
  id serial primary key,
  device_id int not null references devices(id) on delete cascade,
  category text not null check (category in ('SOFTWARE','REPAIR','UI CHANGE')),
  action text not null,
  description text not null default '',
  covered boolean not null default false,
  price_pence int check (price_pence is null or price_pence >= 0),
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists software_releases (
  id serial primary key,
  version text unique not null,
  name text not null default '',
  changes text not null default '',
  compatibility text not null default '',
  status text not null check (status in ('draft','released')),
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_log (
  id serial primary key,
  at timestamptz not null default now(),
  actor text not null,
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb
);
create index if not exists audit_log_at_idx on audit_log(at desc);

create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists waitlist (
  id serial primary key,
  position int not null,
  name text not null,
  email text not null,
  note text not null default '',
  private_note text not null default '',
  status text not null default 'waiting' check (status in ('waiting','contacted','converted','withdrawn')),
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists waitlist_email_idx on waitlist (lower(email));
alter table waitlist add column if not exists code text;
create unique index if not exists waitlist_code_idx on waitlist (code);
alter table enquiries add column if not exists waitlist_id int references waitlist(id) on delete set null;

create table if not exists mailing_list (
  id serial primary key,
  email text not null,
  name text not null default '',
  token text unique not null,
  source text not null default 'website',
  consent_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists mailing_list_email_idx on mailing_list (lower(email));

create table if not exists mailing_campaigns (
  id serial primary key,
  status text not null default 'draft' check (status in ('draft','sent')),
  subject text not null default '',
  content jsonb not null,
  recipients int not null default 0,
  failed int not null default 0,
  sent_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
`;

/** Insert the default catalogue the first time only. Later edits happen in the admin area. */
export async function seedCatalogue(db: Db) {
  const [{ n }] = await db.query<{ n: number }>("select count(*)::int as n from catalogue_games");
  if (n > 0) return;
  await db.tx(async (t) => {
    for (const g of DEFAULT_CATALOGUE.games) {
      await t.query(
        `insert into catalogue_games (id, name, description, controls, preview_media, status, compatibility, price_pence, base, sort)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict (id) do nothing`,
        [g.id, g.name, g.description, g.controls, g.previewMedia, g.status, g.compatibility, g.pricePence, g.base, g.sort],
      );
    }
    for (const p of DEFAULT_CATALOGUE.packs) {
      await t.query(
        `insert into catalogue_packs (id, name, price_pence, status, tba_titles, sort) values ($1,$2,$3,$4,$5,$6) on conflict (id) do nothing`,
        [p.id, p.name, p.pricePence, p.status, p.tbaTitles, p.sort],
      );
      for (const gid of p.gameIds) {
        await t.query(`insert into pack_games (pack_id, game_id) values ($1,$2) on conflict do nothing`, [p.id, gid]);
      }
    }
  });
}

/** Give every waitlist entry an ID (entries from before IDs existed get one now). */
export async function backfillWaitlistCodes(db: Db) {
  const rows = await db.query<{ id: number }>("select id from waitlist where code is null");
  for (const r of rows) {
    await db.query("update waitlist set code = $2 where id = $1 and code is null", [r.id, newWaitlistCode()]);
  }
}
