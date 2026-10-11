import { UI_FONTS, UI_THEMES, type UiFontId, type UiThemeId } from "@/config/offer";

const APPS = [
  { name: "Snake", tile: "snake" },
  { name: "2048", tile: "2048" },
  { name: "Blocks", tile: "blocks" },
] as const;

function TileArt({ tile, accent }: { tile: (typeof APPS)[number]["tile"]; accent: string }) {
  if (tile === "snake") {
    return (
      <svg viewBox="0 0 30 30" aria-hidden="true">
        <path d="M6 22h8v-8h10V8" fill="none" stroke={accent} strokeWidth="4" strokeLinejoin="miter" />
        <rect x="21" y="19" width="4" height="4" fill="#e8c35a" />
      </svg>
    );
  }
  if (tile === "2048") {
    return (
      <svg viewBox="0 0 30 30" aria-hidden="true">
        {[0, 1].map((r) =>
          [0, 1].map((c) => (
            <rect key={`${r}${c}`} x={5 + c * 11} y={5 + r * 11} width="9" height="9" rx="1.5" fill={(r + c) % 2 ? "#e8c35a" : accent} />
          )),
        )}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true">
      <rect x="11" y="5" width="6" height="6" fill={accent} />
      <rect x="11" y="11" width="6" height="6" fill={accent} />
      <rect x="5" y="19" width="6" height="6" fill="#7fb6e8" />
      <rect x="11" y="19" width="6" height="6" fill="#7fb6e8" />
      <rect x="17" y="19" width="6" height="6" fill="#e8c35a" />
    </svg>
  );
}

/** Illustrative mock-up of the Hackulator home screen with the chosen Custom UI font and colours. */
export function HomeScreenPreview({ font, theme }: { font: UiFontId; theme: UiThemeId }) {
  const f = UI_FONTS.find((x) => x.id === font)!;
  const t = UI_THEMES.find((x) => x.id === theme)!;
  const tileBg = `color-mix(in srgb, ${t.text} 8%, ${t.bg})`;

  return (
    <figure className="home-preview" aria-label={`Preview of the home screen in the ${f.label} font with ${t.label} colours`}>
      <div className="home-preview__bezel">
        <div className="home-preview__screen" style={{ background: t.bg, color: t.text, fontFamily: f.stack }}>
          <div className="home-preview__bar" style={{ borderColor: `color-mix(in srgb, ${t.text} 18%, transparent)` }}>
            <span style={{ fontWeight: 700, letterSpacing: "0.04em" }}>HACKULATOR</span>
            <span style={{ opacity: 0.7 }}>12:00</span>
          </div>
          <div className="home-preview__tiles">
            {APPS.map((a, i) => (
              <div
                key={a.name}
                className="home-preview__tile"
                style={{
                  background: tileBg,
                  outline: i === 0 ? `2px solid ${t.accent}` : "none",
                }}
              >
                <TileArt tile={a.tile} accent={t.accent} />
                <span>{a.name}</span>
              </div>
            ))}
          </div>
          <div className="home-preview__hint">
            <span className="home-preview__key" style={{ background: t.accent, color: t.onAccent }}>
              OK
            </span>
            <span style={{ opacity: 0.75 }}>Play</span>
          </div>
        </div>
      </div>
      <figcaption className="small muted">Illustrative preview. The final screen layout may differ.</figcaption>
    </figure>
  );
}
