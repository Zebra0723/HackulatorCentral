"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type KeyboardEvent } from "react";
import { DEFAULT_UI } from "@/lib/pricing";
import { keyFromKeyboard, type HKey } from "@/lib/hackos/keys";
import { DEMO_UNLOCK_SEQUENCE, HackOS } from "@/lib/hackos/os";
import { themeFromUi } from "@/lib/hackos/theme";
import { ArrowIcon } from "../icons";
import { DeviceFront } from "./DeviceFront";
import { KEYS, PHOTO, pct } from "./keymap";
import { ScreenCanvas } from "./ScreenCanvas";

const SEQ_LABEL: Partial<Record<HKey, string>> = { HOME: "HOME", OK: "OK" };

/** Keys whose default browser action we suppress while the calculator has focus. */
const CAPTURED = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Backspace", "Enter", "Escape"]);

export function InteractiveHackulator() {
  const [os] = useState(() => new HackOS());
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pressed, setPressed] = useState<HKey | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const theme = useMemo(() => themeFromUi(DEFAULT_UI), []);

  useEffect(() => os.subscribe(rerender), [os]);

  // Only run while on screen and the tab is visible; pause games otherwise.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    const onVis = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const running = visible && pageVisible;
  useEffect(() => {
    if (!running) os.pause();
  }, [running, os]);

  const press = useCallback(
    (k: HKey) => {
      const wasCalc = os.mode === "calc";
      os.press(k);
      if (wasCalc) {
        // Show progress through the public demo sequence.
        setProgress((p) => {
          if (os.mode !== "calc") return 0;
          if (k === DEMO_UNLOCK_SEQUENCE[p]) return p + 1;
          return k === DEMO_UNLOCK_SEQUENCE[0] ? 1 : 0;
        });
      }
      setPressed(k);
      window.setTimeout(() => setPressed((cur) => (cur === k ? null : cur)), 120);
      rerender();
    },
    [os],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Never hijack typing in other fields; this handler only runs while the device has focus.
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, select, [contenteditable='true']")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = keyFromKeyboard(e.key);
    if (!k) return;
    if (CAPTURED.has(e.key)) e.preventDefault();
    press(k);
  };

  const inGame = os.mode === "game";
  const unlocked = os.mode !== "calc";

  return (
    <div className="demo">
      <div className="demo__stage">
        <div
          ref={wrapRef}
          className="demo__device"
          tabIndex={0}
          role="group"
          aria-roledescription="interactive calculator"
          aria-label="Interactive Hackulator. Click it or tab to it, then use the on-screen keys or your keyboard."
          onKeyDown={onKeyDown}
        >
          <DeviceFront
            priority
            screen={
              <ScreenCanvas
                className="device__canvas"
                animate={running}
                onFrame={(dt) => os.tick(dt)}
                draw={(ctx) => os.draw(ctx, theme)}
                label={
                  os.mode === "calc"
                    ? `Calculator display: ${os.expr || "empty"}${os.result ? `, result ${os.result}` : ""}`
                    : os.mode === "launcher"
                      ? `Launcher: ${os.apps[os.selected]?.name} selected`
                      : `${os.game?.title}${os.paused ? ", paused" : ""}, score ${os.game?.score ?? 0}`
                }
              />
            }
            overlay={
              <div className="device__keys">
                {KEYS.map((key) => (
                  <button
                    key={key.k}
                    type="button"
                    tabIndex={-1}
                    className={`device__key${pressed === key.k ? " is-pressed" : ""}${
                      showHelp && os.mode === "calc" && DEMO_UNLOCK_SEQUENCE[progress] === key.k ? " is-hint" : ""
                    }`}
                    style={{
                      left: pct(key.x - key.r, PHOTO.w),
                      top: pct(key.y - key.r, PHOTO.h),
                      width: pct(key.r * 2, PHOTO.w),
                      height: pct(key.r * 2, PHOTO.h),
                    }}
                    aria-label={key.label}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      wrapRef.current?.focus({ preventScroll: true });
                      press(key.k);
                    }}
                  />
                ))}
              </div>
            }
          />
        </div>
      </div>

      <div className="demo__panel">
        <span className="tag">Interactive web demo</span>
        <p className="demo__mode" aria-live="polite">
          {os.mode === "calc" ? "Calculator mode" : os.mode === "launcher" ? "Launcher" : `${os.game?.title}${os.paused ? " · paused" : ""}`}
        </p>
        <p className="small muted demo__hint">{os.controlsHint}</p>

        {inGame && (
          <div className="demo__gamebar">
            <div className="demo__pad" role="group" aria-label="Game controls">
              {(["UP", "LEFT", "DOWN", "RIGHT"] as const).map((d) => (
                <button key={d} type="button" className={`pad-${d.toLowerCase()}`} onClick={() => press(d)} aria-label={d.toLowerCase()}>
                  <ArrowIcon dir={d.toLowerCase() as "up"} width={18} height={18} />
                </button>
              ))}
            </div>
            <div className="demo__actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => press("OK")}>
                {os.game?.over ? "Play again" : os.paused ? "Resume" : "Pause"}
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => press("AC")}>
                Restart
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => press("BACK")}>
                Menu
              </button>
            </div>
          </div>
        )}

        <div className="demo__actions">
          {unlocked ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => press("HOME")}>
              Back to calculator
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              aria-expanded={showHelp}
              aria-controls="discover-panel"
              onClick={() => setShowHelp((s) => !s)}
            >
              Discover what&apos;s inside
            </button>
          )}
        </div>

        {showHelp && !unlocked && (
          <div className="demo__discover" id="discover-panel">
            <p>
              Press these keys on the calculator in order. It&apos;s a public demo sequence for this website, not a
              password.
            </p>
            <ol className="seq" aria-label="Demo sequence">
              {DEMO_UNLOCK_SEQUENCE.map((k, i) => (
                <li key={i} className={i < progress ? "is-done" : i === progress ? "is-next" : undefined}>
                  {SEQ_LABEL[k] ?? k}
                </li>
              ))}
            </ol>
            <button type="button" className="link-btn" onClick={() => os.unlock()}>
              Skip and open the launcher
            </button>
          </div>
        )}
        <p className="small muted demo__note">
          Runs in your browser, so it shows the idea rather than how fast the real hardware runs. Keyboard: arrows,
          Enter (=), Space (OK), Esc (back), H (home), Backspace (DEL).
        </p>
      </div>
    </div>
  );
}
