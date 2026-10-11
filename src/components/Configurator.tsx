"use client";

import { useId, useReducer, useRef, useState } from "react";
import {
  COVER_COLOURS,
  COVER_ICONS,
  COVER_NAME_MAX_LENGTH,
  GAMES,
  PACKS,
  PRICES,
  TIERS,
  UI_FONTS,
  UI_THEMES,
  formatPence,
  getCoverColour,
  type CoverColourId,
  getPack,
  getTier,
} from "@/config/offer";
import { siteConfig } from "@/config/site";
import { EMPTY_BUILD, buildReducer, buildSummaryText, gameCoverage, quote, validateCoverName } from "@/lib/pricing";
import { CoverIcon } from "./CoverIcons";
import { CloseIcon } from "./icons";
import { HomeScreenPreview } from "./HomeScreenPreview";

const GOLD_SURCHARGE = COVER_COLOURS.find((c) => c.id === "gold")!.surcharge;

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

export function Configurator() {
  const [build, dispatch] = useReducer(buildReducer, EMPTY_BUILD);
  const [status, setStatus] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const [dialogMode, setDialogMode] = useState<"order" | "enquiry">("order");
  const summaryRef = useRef<HTMLDivElement>(null);
  const ids = useId();

  const q = quote(build);
  const tier = getTier(build.tier);
  const uiActive = tier.includesCustomUi || build.customUi;
  const choosing = build.tier === "choose";
  const nameError = build.coverName.enabled ? validateCoverName(build.coverName.text) : null;
  const showNameError = nameError && (nameTouched || build.coverName.text.length > 0);
  const summaryText = buildSummaryText(build, q);
  const email = siteConfig.contact.email;

  const save = () => {
    const blob = new Blob([summaryText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hackulator-build-summary.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus("Build summary saved as a text file on this device. Nothing has been sent.");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setStatus("Build summary copied. Nothing has been sent.");
    } catch {
      setStatus("Couldn't copy automatically. Use “Save build summary” instead.");
    }
  };

  const openDialog = (mode: "order" | "enquiry", trigger: HTMLButtonElement) => {
    setDialogMode(mode);
    returnFocusRef.current = trigger;
    dialogRef.current?.showModal?.();
  };
  const closeEnquiry = () => dialogRef.current?.close?.();

  const isOrder = dialogMode === "order";
  const mailBody = isOrder
    ? `Hi Hackulator,\n\nI'd like to order this build. Please confirm the base price, the total and availability before I pay anything.\n\n${summaryText}`
    : `Hi Hackulator,\n\nI have a question about this build:\n\n\n${summaryText}`;
  const mailto = email
    ? `mailto:${email}?subject=${encodeURIComponent(isOrder ? "Hackulator order request" : "Hackulator build enquiry")}&body=${encodeURIComponent(mailBody)}`
    : undefined;

  return (
    <div className="config">
      <div className="config__steps">
        {/* Step 1: software level */}
        <fieldset className="step">
          <legend>
            <span className="step__title-row">
              <span className="step__num">01</span> Software level
            </span>
          </legend>
          <p className="step__desc">Pick one. Snake, 2048 and Blocks come with every Hackulator whichever you choose.</p>
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
            {GAMES.filter((g) => g.base).map((g) => (
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

          <h3 className="subhead">Packs · {formatPence(PACKS[0].price)} each</h3>
          <ul className="check-list">
            {PACKS.map((p) => {
              const checked = choosing && build.packIds.includes(p.id);
              const disabled = !choosing || !p.available;
              const titles = p.gameIds.map((id) => GAMES.find((g) => g.id === id)!.name);
              return (
                <li key={p.id}>
                  <label className={`check-row${!choosing ? " is-locked" : ""}${!p.available ? " is-unavailable" : ""}`}>
                    <input
                      type="checkbox"
                      checked={!choosing || checked}
                      disabled={disabled}
                      onChange={() => dispatch({ type: "togglePack", id: p.id })}
                      aria-describedby={`${ids}-pack-${p.id}`}
                    />
                    <span className="check-row__body">
                      <span className="check-row__name">{p.name}</span>
                      <span className="check-row__sub" id={`${ids}-pack-${p.id}`}>
                        {titles.join(", ")}
                        {p.unannouncedTitles > 0 && ", third game to be announced"}
                      </span>
                    </span>
                    <span className="check-row__price">
                      {!choosing ? (
                        "Covered"
                      ) : p.available ? (
                        formatPence(p.price)
                      ) : (
                        <span className="tag">Not yet available</span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <h3 className="subhead">Single games · {formatPence(PRICES.singleGame)} each</h3>
          <ul className="check-list">
            {GAMES.filter((g) => g.availableIndividually).map((g) => {
              const cov = gameCoverage(build, g.id);
              const covered = cov.kind === "tier" || cov.kind === "pack";
              const checked = covered || cov.kind === "chosen";
              const priceText =
                cov.kind === "tier"
                  ? "Covered"
                  : cov.kind === "pack"
                    ? `In ${getPack(cov.packId).name}`
                    : formatPence(PRICES.singleGame);
              return (
                <li key={g.id}>
                  <label className={`check-row${covered ? " is-locked" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={covered}
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
          <p className="step__desc">A personalised look for the colour display: pick a font and colours.</p>
          <label className={`check-row${tier.includesCustomUi ? " is-locked" : ""}`}>
            <input
              type="checkbox"
              checked={uiActive}
              disabled={tier.includesCustomUi}
              onChange={(e) => dispatch({ type: "setCustomUi", value: e.target.checked })}
            />
            <span className="check-row__body">
              <span className="check-row__name">Custom UI</span>
              {build.tier === "all-games-forever" && (
                <span className="check-row__sub">Not included in {tier.name}</span>
              )}
            </span>
            <span className="check-row__price">
              {tier.includesCustomUi ? "Included" : formatPence(PRICES.customUi)}
            </span>
          </label>
          {uiActive && (
            <div className="ui-designer">
              <div className="ui-designer__controls">
                <fieldset className="option-group">
                  <legend>Font</legend>
                  <div className="font-options">
                    {UI_FONTS.map((f) => (
                      <label key={f.id} className="font-option">
                        <input
                          type="radio"
                          name={`${ids}-font`}
                          value={f.id}
                          checked={build.ui.font === f.id}
                          onChange={() => dispatch({ type: "setUiFont", font: f.id })}
                        />
                        <span className="font-option__sample" style={{ fontFamily: f.stack }} aria-hidden="true">
                          Aa
                        </span>
                        <span>{f.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="option-group">
                  <legend>Colours</legend>
                  <div className="swatches">
                    {UI_THEMES.map((t) => (
                      <label key={t.id} className="swatch swatch--theme" title={t.label}>
                        <input
                          type="radio"
                          name={`${ids}-theme`}
                          value={t.id}
                          checked={build.ui.theme === t.id}
                          onChange={() => dispatch({ type: "setUiTheme", theme: t.id })}
                        />
                        <span className="swatch__chip" style={{ background: t.bg }} aria-hidden="true">
                          <span style={{ background: t.accent }} />
                        </span>
                        <span className="swatch__label">{t.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
              <HomeScreenPreview font={build.ui.font} theme={build.ui.theme} />
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
                      Up to {COVER_NAME_MAX_LENGTH} characters. It doesn&apos;t need to be your real name, and a nickname
                      or word works just as well.
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
                    <div className="icon-picker" style={{ ["--icon-colour" as string]: getCoverColour(build.coverIcon.colour).hex }}>
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
              Gold adds {formatPence(GOLD_SURCHARGE)} to the name or icon it&apos;s chosen for. The cover marking method
              is still being worked out.
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
              aria-describedby={q.issues.length > 0 ? `${ids}-order-blocked` : undefined}
            >
              Send order by email
            </button>
            {q.issues.length > 0 && (
              <span className="visually-hidden" id={`${ids}-order-blocked`}>
                Finish the items listed above to send your order.
              </span>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={(e) => openDialog("enquiry", e.currentTarget)}
            >
              Enquire about this build
            </button>
            <div className="summary__row">
              <button type="button" className="btn btn-secondary btn-sm" onClick={save}>
                Save build summary
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={copy}>
                Copy
              </button>
            </div>
          </div>
          <p className="summary__status" role="status">
            {status}
          </p>
          <p className="summary__fine">
            Extras are added to the base Hackulator price, which hasn&apos;t been announced yet. Orders and enquiries
            go to {email ?? "Hackulator"} by email. No payment is taken on this site.
          </p>
        </div>
      </aside>

      <dialog
        ref={dialogRef}
        className="dialog"
        aria-labelledby={`${ids}-dlg-title`}
        onClose={() => returnFocusRef.current?.focus()}
        onClick={(e) => {
          if (e.target === dialogRef.current) closeEnquiry();
        }}
      >
        <div className="dialog__inner">
          <div className="dialog__head">
            <h2 id={`${ids}-dlg-title`}>{isOrder ? "Send your order" : "Enquire about this build"}</h2>
            <button type="button" className="close-btn" onClick={closeEnquiry} autoFocus>
              <CloseIcon width={18} height={18} />
              <span className="visually-hidden">Close</span>
            </button>
          </div>
          {email ? (
            <p>
              {isOrder ? "Your order goes to " : "Your enquiry goes to "}
              <strong>{email}</strong>. Your email app will open with this summary filled in. Nothing is sent until you
              press send there.
              {isOrder &&
                " The base price hasn't been announced yet, so Hackulator will confirm the total and availability with you before you pay anything."}
            </p>
          ) : (
            <p>
              <strong>Enquiries aren&apos;t open yet.</strong> Contact details haven&apos;t been published, so no
              enquiry has been sent. Save or copy your summary to keep it for later.
            </p>
          )}
          <pre tabIndex={0} aria-label="Build summary text">
            {summaryText}
          </pre>
          <div className="dialog__actions">
            {mailto && (
              <a className="btn btn-primary" href={mailto}>
                {isOrder ? "Email order" : "Email enquiry"}
              </a>
            )}
            <button type="button" className={`btn ${mailto ? "btn-secondary" : "btn-primary"}`} onClick={save}>
              Save build summary
            </button>
            <button type="button" className="btn btn-secondary" onClick={copy}>
              Copy
            </button>
          </div>
          <p className="small muted" role="status" style={{ minHeight: "1.5em", marginBottom: 0 }}>
            {status}
          </p>
        </div>
      </dialog>
    </div>
  );
}
