"use client";

import { useState, type FormEvent } from "react";
import { formatPence, type Game, type GamePack } from "@/config/offer";
import { inputToPence, penceToInput } from "./fmt";
import { Feedback, useApi } from "./useApi";

const STATUS_TEXT = { development: "In development", released: "Released (not sold separately)", available: "Available to buy" };

function GameForm({ game, onDone }: { game: Game | null; onDone: () => void }) {
  const { call, busy, error, message, setError } = useApi();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const price = inputToPence(String(fd.get("price") ?? ""));
    if (price === "invalid") return setError("Enter the price like 2.50, or leave it empty.");
    const ok = await call("POST", "/api/admin/catalogue/games", {
      isNew: !game,
      id: fd.get("id"),
      name: fd.get("name"),
      description: fd.get("description"),
      controls: fd.get("controls"),
      previewMedia: fd.get("previewMedia"),
      status: fd.get("status"),
      compatibility: fd.get("compatibility"),
      pricePence: price,
      base: game?.base ?? false,
      sort: Number(fd.get("sort") || 100),
    }, { success: "Saved. The website now uses this." });
    if (ok && !game) onDone();
  }
  return (
    <form className="a-form a-subform" onSubmit={onSubmit}>
      <div className="a-grid2">
        <label className="a-field"><span>ID</span><input name="id" defaultValue={game?.id} readOnly={!!game} required pattern="[a-z0-9][a-z0-9\-]*" placeholder="e.g. pac-style" /></label>
        <label className="a-field"><span>Name</span><input name="name" defaultValue={game?.name} required maxLength={60} /></label>
      </div>
      <label className="a-field"><span>Description</span><input name="description" defaultValue={game?.description} maxLength={300} /></label>
      <label className="a-field"><span>Controls</span><input name="controls" defaultValue={game?.controls} maxLength={200} /></label>
      <div className="a-grid2">
        <label className="a-field">
          <span>Status</span>
          <select name="status" defaultValue={game?.status ?? "development"}>
            {Object.entries(STATUS_TEXT).map(([id, t]) => <option key={id} value={id}>{t}</option>)}
          </select>
        </label>
        <label className="a-field">
          <span>Individual price (£)</span>
          <input name="price" inputMode="decimal" defaultValue={penceToInput(game?.pricePence)} disabled={game?.base} placeholder={game?.base ? "Base game: always included" : "empty = not sold alone"} />
        </label>
      </div>
      <label className="a-field"><span>Compatibility requirements</span><input name="compatibility" defaultValue={game?.compatibility} maxLength={200} /></label>
      <div className="a-grid2">
        <label className="a-field"><span>Preview image (optional)</span><input name="previewMedia" defaultValue={game?.previewMedia ?? ""} placeholder="/media/… or https://…" /></label>
        <label className="a-field"><span>Order</span><input name="sort" type="number" defaultValue={game?.sort ?? 100} /></label>
      </div>
      <Feedback error={error} message={message} />
      <div className="a-inline">
        <button className="a-btn a-btn--primary a-btn--sm" disabled={busy}>Save game</button>
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={onDone}>Close</button>
      </div>
    </form>
  );
}

function PackForm({ pack, games, onDone }: { pack: GamePack | null; games: Game[]; onDone: () => void }) {
  const { call, busy, error, message, setError } = useApi();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const price = inputToPence(String(fd.get("price") ?? ""));
    if (price === null || price === "invalid") return setError("Enter the pack price like 5.00.");
    const ok = await call("POST", "/api/admin/catalogue/packs", {
      isNew: !pack,
      id: fd.get("id"),
      name: fd.get("name"),
      pricePence: price,
      status: fd.get("status"),
      tbaTitles: Number(fd.get("tba") || 0),
      sort: Number(fd.get("sort") || 100),
      gameIds: fd.getAll("games"),
    }, { success: "Saved. The website now uses this." });
    if (ok && !pack) onDone();
  }
  return (
    <form className="a-form a-subform" onSubmit={onSubmit}>
      <div className="a-grid2">
        <label className="a-field"><span>ID</span><input name="id" defaultValue={pack?.id} readOnly={!!pack} required pattern="[a-z0-9][a-z0-9\-]*" /></label>
        <label className="a-field"><span>Name</span><input name="name" defaultValue={pack?.name} required maxLength={60} /></label>
      </div>
      <div className="a-grid2">
        <label className="a-field"><span>Price (£)</span><input name="price" inputMode="decimal" defaultValue={penceToInput(pack?.pricePence)} required /></label>
        <label className="a-field">
          <span>Status</span>
          <select name="status" defaultValue={pack?.status ?? "planned"}>
            <option value="planned">Planned (shown, can&apos;t be bought)</option>
            <option value="available">Available to buy</option>
          </select>
        </label>
      </div>
      <div className="a-grid2">
        <label className="a-field"><span>Titles still to be announced</span><input name="tba" type="number" min={0} max={10} defaultValue={pack?.tbaTitles ?? 0} /></label>
        <label className="a-field"><span>Order</span><input name="sort" type="number" defaultValue={pack?.sort ?? 100} /></label>
      </div>
      <fieldset className="a-fieldset">
        <legend>Games in this pack</legend>
        {games.filter((g) => !g.base).map((g) => (
          <label key={g.id} className="a-check"><input type="checkbox" name="games" value={g.id} defaultChecked={pack?.gameIds.includes(g.id)} /> {g.name}</label>
        ))}
      </fieldset>
      <Feedback error={error} message={message} />
      <div className="a-inline">
        <button className="a-btn a-btn--primary a-btn--sm" disabled={busy}>Save pack</button>
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={onDone}>Close</button>
      </div>
    </form>
  );
}

export function CatalogueEditor({ games, packs }: { games: Game[]; packs: GamePack[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="a-cols">
      <section className="a-card">
        <div className="a-head"><h2>Games</h2><button type="button" className="a-btn a-btn--sm" onClick={() => setEditing("game:new")}>Add game</button></div>
        {editing === "game:new" && <GameForm game={null} onDone={() => setEditing(null)} />}
        <ul className="a-rows">
          {games.map((g) => (
            <li key={g.id}>
              <div className="a-row">
                <span className="a-row__main">
                  <strong>{g.name}</strong>
                  <span className="a-muted a-row__sub">{g.base ? "Base: always included" : STATUS_TEXT[g.status]}</span>
                </span>
                <span className="a-row__side">
                  <span>{g.base ? "Included" : g.pricePence != null ? formatPence(g.pricePence) : "—"}</span>
                  <button type="button" className="a-linkbtn" onClick={() => setEditing(editing === `game:${g.id}` ? null : `game:${g.id}`)}>Edit</button>
                </span>
              </div>
              {editing === `game:${g.id}` && <GameForm game={g} onDone={() => setEditing(null)} />}
            </li>
          ))}
        </ul>
      </section>
      <section className="a-card">
        <div className="a-head"><h2>Packs</h2><button type="button" className="a-btn a-btn--sm" onClick={() => setEditing("pack:new")}>Add pack</button></div>
        {editing === "pack:new" && <PackForm pack={null} games={games} onDone={() => setEditing(null)} />}
        <ul className="a-rows">
          {packs.map((p) => (
            <li key={p.id}>
              <div className="a-row">
                <span className="a-row__main">
                  <strong>{p.name}</strong>
                  <span className="a-muted a-row__sub">
                    {p.gameIds.map((id) => games.find((g) => g.id === id)?.name ?? id).join(", ")}
                    {p.tbaTitles > 0 && ` + ${p.tbaTitles} to be announced`} · {p.status === "available" ? "Available" : "Planned"}
                  </span>
                </span>
                <span className="a-row__side">
                  <span>{formatPence(p.pricePence)}</span>
                  <button type="button" className="a-linkbtn" onClick={() => setEditing(editing === `pack:${p.id}` ? null : `pack:${p.id}`)}>Edit</button>
                </span>
              </div>
              {editing === `pack:${p.id}` && <PackForm pack={p} games={games} onDone={() => setEditing(null)} />}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
