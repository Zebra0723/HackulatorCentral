"use client";

import { useEffect, useId, useMemo, useReducer, useRef, useState, type FormEvent } from "react";
import {
  COVER_COLOURS,
  COVER_ICONS,
  COVER_NAME_MAX_LENGTH,
  PRICES,
  TIERS,
  UI_ACCENTS,
  UI_APPEARANCES,
  UI_FONTS,
  UI_LAYOUTS,
  UI_WELCOME_MAX_LENGTH,
  findPack,
  formatPence,
  getCoverColour,
  getTier,
  isGameBuyable,
  isPackBuyable,
  type Catalogue,
  type CoverColourId,
} from "@/config/offer";
import {
  EMPTY_BUILD,
  buildSummaryText,
  decodeShare,
  encodeShare,
  gameCoverage,
  makeBuildReducer,
  quote,
  sanitizeBuild,
  uiIncluded,
  validateCoverName,
  validateWelcome,
} from "@/lib/pricing";
import { CoverIcon } from "./CoverIcons";
import { BuildPreview } from "./build/BuildPreview";
import { CloseIcon } from "./icons";

const STORAGE_KEY = "hackulator.build.v2";

function ColourPicker({
  name,
  legend,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  value: CoverColourId;
  onChange: (c: CoverColourId) => void;
}) {
  return (
    <fieldset className="option-group">
      <legend>{legend}</legend>
      <div className="swatches">
        {COVER_COLOURS.map((c) => (
          <label key={c.id} className="swatch">
            <input type="radio" name={name} value={c.id} checked={value === c.id} onChange={() => onChange(c.id)} />
            <span className="swatch__chip" style={{ background: c.hex }} aria-hidden="true" />
            <span className="swatch__label">
              {c.label}
              {c.surcharge > 0 && <span className="swatch__extra"> +{formatPence(c.surcharge)}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done"; reference: string }
  | { kind: "error"; message: string };

export function Configurator({
  catalogue,
  onlineSubmissions,
  email,
}: {
  catalogue: Catalogue;
  /** True only when a database is configured and enquiries are actually stored. */
  onlineSubmissions: boolean;
  email?: string;
}) {
  const reducer = useMemo(() => makeBuildReducer(catalogue), [catalogue]);
  const [build, dispatch] = useReducer(reducer, EMPTY_BUILD);
  const [status, setStatus] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [dialogMode, setDialogMode] = useState<"order" | "enquiry">("order");
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const ids = useId();

  const q = quote(build, catalogue);
  const tier = getTier(build.tier);
  const choosing = build.tier === "choose";
  const uiOn = uiIncluded(build);
  const nameError = build.coverName.enabled ? validateCoverName(build.coverName.text) : null;
  const showNameError = nameError && (nameTouched || build.coverName.text.length > 0);
  const welcomeError = uiOn ? validateWelcome(build.ui.welcome) : null;
  const summaryText = buildSummaryText(build, q, catalogue);
  const games = [...catalogue.games].sort((a, b) => a.sort - b.sort);
  const packs = [...catalogue.packs].sort((a, b) => a.sort - b.sort);
  const extraGames = games.filter((g) => !g.base);

  // Restore from a share link (?build=…) first, otherwise from this device.
  // Both live outside React (URL, localStorage) and only exist in the browser, so this runs after mount.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("build");
    if (code) {
      const shared = decodeShare(code, catalogue);
      if (shared) {
        dispatch({ type: "load", build: shared });
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off restore from the URL after mount
        setStatus("Loaded a shared build. Personal text isn't included in share links.");
        return;
      }
    }
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) dispatch({ type: "load", build: sanitizeBuild(JSON.parse(saved), catalogue) });
    } catch {
      /* storage unavailable: start fresh */
    }
  }, [catalogue]);

  const saveLocal = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(build));
      setStatus("Saved on this device only. It has not been sent to Hackulator.");
    } catch {
      setStatus("Couldn't save on this device. Try “Download” instead.");
    }
  };

  const download = () => {
    const blob = new Blob([summaryText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hackulator-build-summary.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus("Summary downloaded. Nothing has been sent.");
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`${what} copied. Nothing has been sent.`);
    } catch {
      setStatus("Couldn't copy automatically.");
    }
  };

  const shareLink = () => {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "build";
    url.searchParams.set("build", encodeShare(build));
    void copy(url.toString(), "Share link (without your name or welcome text)");
  };

  const openDialog = (mode: "order" | "enquiry", trigger: HTMLButtonElement) => {
    setDialogMode(mode);
    setSubmit({ kind: "idle" });
    returnFocusRef.current = trigger;
    dialogRef.current?.showModal?.();
  };
  const closeDialog = () => dialogRef.current?.close?.();

  const isOrder = dialogMode === "order";
  const mailBody = isOrder
    ? `Hi Hackulator,\n\nI'd like to order this build. Please confirm the base price, the total and availability before I pay anything.\n\n${summaryText}`
    : `Hi Hackulator,\n\nI have a question about this build:\n\n\n${summaryText}`;
  const mailto = email
    ? `mailto:${email}?subject=${encodeURIComponent(isOrder ? "Hackulator order request" : "Hackulator build enquiry")}&body=${encodeURIComponent(mailBody)}`
    : undefined;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSubmit({ kind: "sending" });
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: dialogMode,
          name: fd.get("name"),
          email: fd.get("email"),
          message: fd.get("message"),
          website: fd.get("website"), // honeypot
          build,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { reference?: string; error?: string };
      if (res.ok && data.reference) setSubmit({ kind: "done", reference: data.reference });
      else setSubmit({ kind: "error", message: data.error ?? "Something went wrong. Nothing was saved." });
    } catch {
      setSubmit({ kind: "error", message: "Couldn't reach the server. Nothing was sent." });
    }
  };

  return (
    <div className="config">
      <div className="config__aside">
        <div className="config__preview">
          <BuildPreview build={build} catalogue={catalogue} />
        </div>

        {/* Summary */}
        <aside className="summary" aria-labelledby={`${ids}-summary-title`}>
          <div className="summary__card dark-surface" ref={summaryRef} tabIndex={-1} id="build-summary">
            <h3 className="summary__title" id={`${ids}-summary-title`}>
              Your build
            </h3>
            <ul className="summary__lines">
              {q.lines.map((l) => (
                <li key={l.key} className={l.amount ? "is-charged" : undefined}>
                  <span>{l.label}</span>
                  <span>{l.amount === 0 ? l.note ?? "Included" : formatPence(l.amount)}</span>
                </li>
              ))}
            </ul>
            <div className="summary__total" aria-live="polite" aria-atomic="true">
              <span>Extras subtotal</span>
              <strong>{formatPence(q.extrasSubtotal)}</strong>
            </div>
            <div className="summary__base">
              <span>Base price</span>
              <span>To be confirmed</span>
            </div>
            {q.issues.length > 0 && (
              <div className="summary__issues" role="status">
                To finish this build:
                <ul>
                  {q.issues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="summary__actions">
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={(e) => openDialog("order", e.currentTarget)}
                disabled={q.issues.length > 0}
              >
                Send order request
              </button>
              <button type="button" className="btn btn-secondary btn-block" onClick={(e) => openDialog("enquiry", e.currentTarget)}>
                Ask a question
              </button>
              <div className="summary__row summary__row--3">
                <button type="button" className="btn btn-secondary btn-sm" onClick={saveLocal}>
                  Save
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={shareLink}>
                  Share
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={download}>
                  Download
                </button>
              </div>
            </div>
            <p className="summary__status" role="status">
              {status}
            </p>
            <p className="summary__fine">
              Extras are added to the base Hackulator price, which hasn&apos;t been announced yet. No payment is taken on
              this site.
            </p>
          </div>
        </aside>
      </div>

      <div className="config__steps">
        {/* Step 1: software level */}
        <fieldset className="step">
          <legend>
            <span className="step__title-row">
              <span className="step__num">01</span> Software level
            </span>
          </legend>
          <p className="step__desc">Pick one. Snake, 2048 and Tetris come with every Hackulator whichever you choose.</p>
          <div className="tier-options">
            {TIERS.map((t) => (
              <label key={t.id} className="choice">
                <input
                  type="radio"
                  name={`${ids}-tier`}
                  value={t.id}
                  checked={build.tier === t.id}
                  onChange={() => dispatch({ type: "setTier", tier: t.id })}
                />
                <span className="choice__top">
                  <span className="choice__name">{t.name}</span>
                  <span className="choice__mark" aria-hidden="true" />
                </span>
                <span className="choice__price">{t.price === 0 ? "No pass" : formatPence(t.price)}</span>
                <span className="choice__desc">{t.summary}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Step 2: games */}
        <fieldset className="step">
          <legend>
            <span className="step__title-row">
              <span className="step__num">02</span> Games
            </span>
          </legend>
          <p className="step__desc">
            {choosing
              ? "Add single games or a pack. Nothing is charged twice: a game inside a chosen pack is covered by the pack."
              : `${tier.name} covers every current and future compatible game, so there's nothing to pick here.`}
          </p>

          <h3 className="subhead">Included with every Hackulator</h3>
          <ul className="check-list">
            {games
              .filter((g) => g.base)
              .map((g) => (
                <li key={g.id}>
                  <div className="check-row is-locked">
                    <input type="checkbox" checked readOnly disabled aria-label={`${g.name}, included`} />
                    <span className="check-row__body">
                      <span className="check-row__name">{g.name}</span>
                      <span className="check-row__sub">{g.description}</span>
                    </span>
                    <span className="check-row__price">Included</span>
                  </div>
                </li>
              ))}
          </ul>

          <h3 className="subhead">Packs</h3>
          <ul className="check-list">
            {packs.map((p) => {
              const buyable = isPackBuyable(p);
              const checked = !choosing || build.packIds.includes(p.id);
              const titles = p.gameIds.map((id) => games.find((g) => g.id === id)?.name ?? id);
              return (
                <li key={p.id}>
                  <label className={`check-row${!choosing ? " is-locked" : ""}${!buyable ? " is-unavailable" : ""}`}>
                    <input
                      type="checkbox"
                      checked={buyable && checked}
                      disabled={!choosing || !buyable}
                      onChange={() => dispatch({ type: "togglePack", id: p.id })}
                    />
                    <span className="check-row__body">
                      <span className="check-row__name">{p.name}</span>
                      <span className="check-row__sub">
                        {titles.join(", ")}
                        {p.tbaTitles > 0 && `, ${p.tbaTitles === 1 ? "third game" : `${p.tbaTitles} more games`} to be announced`}
                      </span>
                    </span>
                    <span className="check-row__price">
                      {!buyable ? <span className="tag">Planned</span> : !choosing ? "Covered" : formatPence(p.pricePence)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <h3 className="subhead">Single games</h3>
          <ul className="check-list">
            {extraGames.map((g) => {
              const cov = gameCoverage(build, g.id, catalogue);
              const covered = cov.kind === "tier" || cov.kind === "pack";
              const buyable = isGameBuyable(g);
              const checked = covered || cov.kind === "chosen";
              const priceText =
                cov.kind === "tier"
                  ? "Covered"
                  : cov.kind === "pack"
                    ? `In ${findPack(catalogue, cov.packId)?.name}`
                    : buyable
                      ? formatPence(g.pricePence!)
                      : g.status === "development"
                        ? "In development"
                        : "Not sold separately";
              return (
                <li key={g.id}>
                  <label className={`check-row${covered || !buyable ? " is-locked" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={covered || !buyable}
                      onChange={() => dispatch({ type: "toggleGame", id: g.id })}
                    />
                    <span className="check-row__body">
                      <span className="check-row__name">{g.name}</span>
                      <span className="check-row__sub">{g.description}</span>
                    </span>
                    <span className="check-row__price">{priceText}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          {q.suggestion && (
            <div className="notice notice--accent" style={{ marginTop: 16 }} role="note">
              <div>
                <p>
                  Your separate software choices come to <strong>{formatPence(q.suggestion.separateCost)}</strong>.{" "}
                  <strong>{getTier(q.suggestion.tier).name}</strong> is {formatPence(q.suggestion.tierPrice)} and also
                  covers future compatible {q.suggestion.tier === "all-software-forever" ? "software" : "games"}. Your
                  build stays as it is unless you switch.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: 10 }}
                  onClick={() => dispatch({ type: "setTier", tier: q.suggestion!.tier })}
                >
                  Switch to {getTier(q.suggestion.tier).name}
                </button>
              </div>
            </div>
          )}
        </fieldset>

        {/* Step 3: custom UI */}
        <fieldset className="step">
          <legend>
            <span className="step__title-row">
              <span className="step__num">03</span> Interface
            </span>
          </legend>
          <p className="step__desc">Make the colour display yours. All of these choices are part of the one Custom UI option.</p>
          <label className={`check-row${tier.includesCustomUi ? " is-locked" : ""}`}>
            <input
              type="checkbox"
              checked={uiOn}
              disabled={tier.includesCustomUi}
              onChange={(e) => dispatch({ type: "setCustomUi", value: e.target.checked })}
            />
            <span className="check-row__body">
              <span className="check-row__name">Custom UI</span>
              {build.tier === "all-games-forever" && <span className="check-row__sub">Not included in {tier.name}</span>}
            </span>
            <span className="check-row__price">{tier.includesCustomUi ? "Included" : formatPence(PRICES.customUi)}</span>
          </label>
          {uiOn && (
            <div className="ui-controls">
              <div className="field">
                <label htmlFor={`${ids}-welcome`}>Welcome text</label>
                <input
                  id={`${ids}-welcome`}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={UI_WELCOME_MAX_LENGTH + 5}
                  value={build.ui.welcome}
                  aria-invalid={welcomeError ? true : undefined}
                  aria-describedby={`${ids}-welcome-hint${welcomeError ? ` ${ids}-welcome-err` : ""}`}
                  onChange={(e) => dispatch({ type: "setUi", patch: { welcome: e.target.value } })}
                />
                <span className="field__hint" id={`${ids}-welcome-hint`}>
                  Shown at the top of the home screen. Up to {UI_WELCOME_MAX_LENGTH} characters. Stays on this device until
                  you send a request.
                </span>
                {welcomeError && (
                  <span className="field__error" id={`${ids}-welcome-err`}>
                    {welcomeError}
                  </span>
                )}
              </div>
              <fieldset className="option-group">
                <legend>Accent colour</legend>
                <div className="swatches">
                  {UI_ACCENTS.map((a) => (
                    <label key={a.id} className="swatch">
                      <input
                        type="radio"
                        name={`${ids}-accent`}
                        checked={build.ui.accent === a.id}
                        onChange={() => dispatch({ type: "setUi", patch: { accent: a.id } })}
                      />
                      <span className="swatch__chip" style={{ background: a.hex }} aria-hidden="true" />
                      <span className="swatch__label">{a.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="ui-controls__row">
                <fieldset className="option-group">
                  <legend>Appearance</legend>
                  <div className="segmented">
                    {UI_APPEARANCES.map((a) => (
                      <label key={a.id} className="segmented__opt">
                        <input
                          type="radio"
                          name={`${ids}-appearance`}
                          checked={build.ui.appearance === a.id}
                          onChange={() => dispatch({ type: "setUi", patch: { appearance: a.id } })}
                        />
                        <span>{a.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="option-group">
                  <legend>Menu layout</legend>
                  <div className="segmented">
                    {UI_LAYOUTS.map((l) => (
                      <label key={l.id} className="segmented__opt">
                        <input
                          type="radio"
                          name={`${ids}-layout`}
                          checked={build.ui.layout === l.id}
                          onChange={() => dispatch({ type: "setUi", patch: { layout: l.id } })}
                        />
                        <span>{l.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
              <fieldset className="option-group">
                <legend>Font</legend>
                <div className="font-options">
                  {UI_FONTS.map((f) => (
                    <label key={f.id} className="font-option">
                      <input
                        type="radio"
                        name={`${ids}-font`}
                        checked={build.ui.font === f.id}
                        onChange={() => dispatch({ type: "setUi", patch: { font: f.id } })}
                      />
                      <span className="font-option__sample" style={{ fontFamily: f.stack }} aria-hidden="true">
                        Aa
                      </span>
                      <span>{f.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="field__hint">See it in the Screen and Front previews.</p>
            </div>
          )}
        </fieldset>

        {/* Step 4: cover */}
        <fieldset className="step">
          <legend>
            <span className="step__title-row">
              <span className="step__num">04</span> Cover
            </span>
          </legend>
          <p className="step__desc">Optional personalisation on the calculator cover. These stay as you set them if you change software level.</p>

          <ul className="check-list">
            <li>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={build.coverName.enabled}
                  onChange={(e) => dispatch({ type: "setCoverNameEnabled", value: e.target.checked })}
                />
                <span className="check-row__body">
                  <span className="check-row__name">Name on cover</span>
                </span>
                <span className="check-row__price">{formatPence(PRICES.coverName)}</span>
              </label>
              {build.coverName.enabled && (
                <div className="cover-options">
                  <div className="field">
                    <label htmlFor={`${ids}-name`}>Text for the cover</label>
                    <input
                      id={`${ids}-name`}
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={COVER_NAME_MAX_LENGTH + 10}
                      value={build.coverName.text}
                      aria-invalid={showNameError ? true : undefined}
                      aria-describedby={`${ids}-name-hint${showNameError ? ` ${ids}-name-err` : ""}`}
                      onBlur={() => setNameTouched(true)}
                      onChange={(e) => dispatch({ type: "setCoverNameText", text: e.target.value })}
                    />
                    <span className="field__hint" id={`${ids}-name-hint`}>
                      Up to {COVER_NAME_MAX_LENGTH} characters. A nickname or word works just as well as a real name. It
                      isn&apos;t included in share links.
                    </span>
                    {showNameError && (
                      <span className="field__error" id={`${ids}-name-err`}>
                        {nameError}
                      </span>
                    )}
                  </div>
                  <ColourPicker
                    name={`${ids}-name-colour`}
                    legend="Name colour"
                    value={build.coverName.colour}
                    onChange={(colour) => dispatch({ type: "setCoverNameColour", colour })}
                  />
                </div>
              )}
            </li>
            <li>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={build.coverIcon.enabled}
                  onChange={(e) => dispatch({ type: "setCoverIconEnabled", value: e.target.checked })}
                />
                <span className="check-row__body">
                  <span className="check-row__name">Icon on cover</span>
                </span>
                <span className="check-row__price">{formatPence(PRICES.coverIcon)}</span>
              </label>
              {build.coverIcon.enabled && (
                <div className="cover-options">
                  <fieldset className="option-group">
                    <legend>Icon</legend>
                    <div
                      className="icon-picker"
                      style={{ ["--icon-colour" as string]: getCoverColour(build.coverIcon.colour).hex }}
                    >
                      {COVER_ICONS.map((icon) => (
                        <label key={icon.id} className="icon-option">
                          <input
                            type="radio"
                            name={`${ids}-icon`}
                            value={icon.id}
                            checked={build.coverIcon.iconId === icon.id}
                            onChange={() => dispatch({ type: "setCoverIcon", iconId: icon.id })}
                          />
                          <span className="icon-option__badge" aria-hidden="true">
                            <CoverIcon id={icon.id} cut="#1d1d1c" />
                          </span>
                          {icon.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <ColourPicker
                    name={`${ids}-icon-colour`}
                    legend="Icon colour"
                    value={build.coverIcon.colour}
                    onChange={(colour) => dispatch({ type: "setCoverIconColour", colour })}
                  />
                </div>
              )}
            </li>
          </ul>
          {(build.coverName.enabled || build.coverIcon.enabled) && (
            <p className="field__hint" style={{ marginTop: 12 }}>
              Gold adds {formatPence(COVER_COLOURS.find((c) => c.id === "gold")!.surcharge)} to the name or icon it&apos;s
              chosen for. Check the Cover preview.
            </p>
          )}
        </fieldset>

        <div className="summary-bar">
          <span className="summary-bar__total">
            Extras subtotal
            <strong>{formatPence(q.extrasSubtotal)}</strong>
          </span>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => {
              summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              summaryRef.current?.focus({ preventScroll: true });
            }}
          >
            View summary
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="dialog"
        aria-labelledby={`${ids}-dlg-title`}
        onClose={() => returnFocusRef.current?.focus()}
        onClick={(e) => {
          if (e.target === dialogRef.current) closeDialog();
        }}
      >
        <div className="dialog__inner">
          <div className="dialog__head">
            <h2 id={`${ids}-dlg-title`}>{isOrder ? "Send an order request" : "Ask about this build"}</h2>
            <button type="button" className="close-btn" onClick={closeDialog} autoFocus>
              <CloseIcon width={18} height={18} />
              <span className="visually-hidden">Close</span>
            </button>
          </div>

          {submit.kind === "done" ? (
            <div className="notice notice--accent" role="status">
              <p>
                <strong>Received.</strong> Your reference is <strong>{submit.reference}</strong>. Hackulator will reply by
                email{isOrder ? " to confirm the base price, total and availability before you pay anything" : ""}.
              </p>
            </div>
          ) : onlineSubmissions ? (
            <form className="enquiry-form" onSubmit={onSubmit}>
              <p className="small muted" style={{ marginTop: 0 }}>
                {isOrder
                  ? "This sends your build to Hackulator as an order request. It isn't a payment and nothing is charged. You'll get a reply confirming the total first."
                  : "Your question is sent with this build attached."}{" "}
                We only use these details to reply about your Hackulator.
              </p>
              <div className="field">
                <label htmlFor={`${ids}-c-name`}>Your name</label>
                <input id={`${ids}-c-name`} name="name" type="text" required maxLength={80} autoComplete="name" />
              </div>
              <div className="field">
                <label htmlFor={`${ids}-c-email`}>Email</label>
                <input id={`${ids}-c-email`} name="email" type="email" required maxLength={160} autoComplete="email" />
              </div>
              <div className="field">
                <label htmlFor={`${ids}-c-msg`}>{isOrder ? "Anything to add? (optional)" : "Your question"}</label>
                <textarea id={`${ids}-c-msg`} name="message" rows={3} maxLength={2000} required={!isOrder} />
              </div>
              <div className="visually-hidden" aria-hidden="true">
                <label>
                  Leave this empty <input name="website" type="text" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              <details className="small">
                <summary>What gets sent</summary>
                <pre>{summaryText}</pre>
              </details>
              <div className="dialog__actions">
                <button type="submit" className="btn btn-primary" disabled={submit.kind === "sending"}>
                  {submit.kind === "sending" ? "Sending…" : isOrder ? "Send order request" : "Send question"}
                </button>
                {mailto && (
                  <a className="btn btn-secondary" href={mailto}>
                    Email instead
                  </a>
                )}
              </div>
              {submit.kind === "error" && (
                <p className="field__error" role="alert">
                  {submit.message}
                </p>
              )}
            </form>
          ) : (
            <>
              <p>
                <strong>Online requests aren&apos;t switched on yet.</strong> Your build has <strong>not</strong> been
                submitted.{" "}
                {email ? (
                  <>
                    You can email it to <strong>{email}</strong> from your own email app instead.
                  </>
                ) : null}
              </p>
              <pre tabIndex={0} aria-label="Build summary text">
                {summaryText}
              </pre>
              <div className="dialog__actions">
                {mailto && (
                  <a className="btn btn-primary" href={mailto}>
                    {isOrder ? "Email order" : "Email question"}
                  </a>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => copy(summaryText, "Summary")}>
                  Copy summary
                </button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
