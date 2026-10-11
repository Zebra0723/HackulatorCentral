"use client";

import { useState } from "react";
import { COVER_ICONS, getCoverColour, type Catalogue } from "@/config/offer";
import { DEFAULT_UI, ownedGames, uiIncluded, type Build } from "@/lib/pricing";
import { drawLauncher, type LauncherApp } from "@/lib/hackos/os";
import { themeFromUi } from "@/lib/hackos/theme";
import { coverIconArt } from "../CoverIcons";
import { DeviceFront } from "../device/DeviceFront";
import { PHOTO } from "../device/keymap";
import { ScreenCanvas } from "../device/ScreenCanvas";

type View = "front" | "cover" | "screen";

const COVER_FONT = 'ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial, sans-serif';

let measureCtx: CanvasRenderingContext2D | null = null;
function measureText(text: string, font: string): number {
  if (typeof document === "undefined") return 0;
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * 1000; // can't measure: always fit to the area
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

const VIEWS: { id: View; label: string }[] = [
  { id: "front", label: "Front" },
  { id: "cover", label: "Cover" },
  { id: "screen", label: "Screen" },
];

export function BuildPreview({ build, catalogue }: { build: Build; catalogue: Catalogue }) {
  const [view, setView] = useState<View>("front");
  const ui = uiIncluded(build) ? build.ui : DEFAULT_UI;
  const theme = themeFromUi(ui);
  const apps: LauncherApp[] = ownedGames(build, catalogue).map((g) => ({
    id: g.id,
    name: g.name,
    playable: ["snake", "2048", "tetris"].includes(g.id),
  }));
  const drawScreen = (ctx: CanvasRenderingContext2D) => drawLauncher(ctx, theme, apps, 0);

  return (
    <section className="preview" aria-label="Live preview of your build">
      <div className="preview__tabs" role="tablist" aria-label="Preview view">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            id={`preview-tab-${v.id}`}
            aria-selected={view === v.id}
            aria-controls="preview-panel"
            className="preview__tab"
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div className="preview__panel" id="preview-panel" role="tabpanel" aria-labelledby={`preview-tab-${view}`}>
        {view === "front" && (
          <div className="preview__device">
            <DeviceFront
              alt="Front of your Hackulator with your games on the launcher"
              screen={<ScreenCanvas className="device__canvas" draw={drawScreen} label={`Launcher showing ${apps.map((a) => a.name).join(", ")}`} />}
            />
          </div>
        )}
        {view === "cover" && <CoverView build={build} />}
        {view === "screen" && (
          <div className="preview__screen-wrap">
            <div className="preview__bezel">
              <ScreenCanvas className="preview__screen" draw={drawScreen} label="Home screen preview" />
            </div>
            {!uiIncluded(build) && <p className="small muted">Standard look shown. Add Custom UI to change it.</p>}
          </div>
        )}
      </div>
      <p className="preview__note">Preview only. Placement and colours are approximate.</p>
    </section>
  );
}

/** The slide-on cover, drawn to the calculator's proportions. Name and icon sit in the printable area. */
function CoverView({ build }: { build: Build }) {
  const W = PHOTO.w;
  const H = PHOTO.h;
  const name = build.coverName.enabled ? build.coverName.text.trim() : "";
  const nameColour = getCoverColour(build.coverName.colour).hex;
  const iconColour = getCoverColour(build.coverIcon.colour).hex;
  const icon = build.coverIcon.enabled ? build.coverIcon.iconId : null;
  const iconLabel = COVER_ICONS.find((i) => i.id === icon)?.label;
  const nothing = !build.coverName.enabled && !build.coverIcon.enabled;

  // Printable area: centred, 70% wide. Large type for short names; anything that
  // could be wider than the area is compressed to fit, so it can never spill out.
  const areaW = W * 0.7;
  const maxW = areaW * 0.9;
  const fontSize = name.length <= 8 ? 54 : name.length <= 11 ? 44 : 36;
  // Real glyph widths decide (W is much wider than i). The Cover view only renders in the browser.
  const tooWide = measureText(name, `700 ${fontSize}px ${COVER_FONT}`) + name.length > maxW;
  const fit = tooWide ? { textLength: maxW, lengthAdjust: "spacingAndGlyphs" as const } : {};

  return (
    <div className="preview__cover">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Cover preview${name ? ` with the name ${name}` : ""}${iconLabel ? ` and a ${iconLabel} icon` : ""}`}
      >
        <defs>
          <linearGradient id="cover-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2c2c2b" />
            <stop offset="1" stopColor="#161615" />
          </linearGradient>
        </defs>
        <rect x="14" y="10" width={W - 28} height={H - 20} rx="54" fill="url(#cover-grad)" />
        <rect x="14.5" y="10.5" width={W - 29} height={H - 21} rx="53.5" fill="none" stroke="#3d3d3b" />
        {/* finger grip ridges at the bottom */}
        {Array.from({ length: 7 }).map((_, i) => (
          <rect key={i} x={W / 2 - 90} y={H - 140 + i * 14} width="180" height="5" rx="2.5" fill="#262625" />
        ))}
        {nothing ? (
          <text x={W / 2} y={H * 0.42} textAnchor="middle" fill="#7d7c78" fontSize="26" fontFamily="system-ui, sans-serif">
            Add a name or icon to see it here
          </text>
        ) : (
          <>
            <rect
              x={(W - areaW) / 2}
              y={H * 0.2}
              width={areaW}
              height={H * 0.36}
              rx="16"
              fill="none"
              stroke="#4a4a47"
              strokeDasharray="6 8"
            />
            {name && (
              <text
                x={W / 2}
                y={H * 0.29}
                textAnchor="middle"
                fill={nameColour}
                fontSize={fontSize}
                {...fit}
                fontWeight="700"
                letterSpacing="1"
                fontFamily={COVER_FONT}
              >
                {name}
              </text>
            )}
            {icon && (
              <g
                transform={`translate(${W / 2 - 50} ${H * 0.34}) scale(${100 / 24})`}
                fill={iconColour}
                style={{ ["--icon-cut" as string]: "#222221" }}
              >
                {coverIconArt(icon)}
              </g>
            )}
          </>
        )}
      </svg>
    </div>
  );
}
