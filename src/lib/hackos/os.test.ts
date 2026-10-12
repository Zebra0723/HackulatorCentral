import { beforeEach, describe, expect, it } from "vitest";
import { getBest, resetBests } from "./bests";
import type { Tetris } from "./games/tetris";
import { ADMIN_SHORTCUT_SEQUENCE, DEMO_UNLOCK_SEQUENCE, HackOS, INTRO_MS } from "./os";

beforeEach(() => resetBests());

describe("Hackulator OS (web demo)", () => {
  it("starts as a calculator and calculates", () => {
    const os = new HackOS();
    for (const k of ["7", "MUL", "8", "EXE"] as const) os.press(k);
    expect(os.mode).toBe("calc");
    expect(os.result).toBe("56");
    os.press("ADD");
    os.press("4");
    os.press("EXE");
    expect(os.result).toBe("60");
    os.press("AC");
    expect(os.expr).toBe("");
  });

  it("unlocks the launcher with the public demo sequence", () => {
    const os = new HackOS();
    for (const k of DEMO_UNLOCK_SEQUENCE) os.press(k);
    expect(os.mode).toBe("launcher");
    expect(os.expr).toBe("");
  });

  it("opens each game, pauses, restarts and returns", () => {
    const os = new HackOS({ startIn: "launcher" });
    for (let i = 0; i < 3; i++) {
      os.selected = i;
      os.press("OK");
      expect(os.mode).toBe("game");
      os.tick(1000);
      os.press("OK");
      expect(os.paused).toBe(true);
      const before = JSON.stringify(os.game);
      os.tick(5000);
      expect(JSON.stringify(os.game)).toBe(before); // nothing moves while paused
      os.press("AC");
      expect(os.paused).toBe(false);
      os.press("BACK");
      expect(os.mode).toBe("launcher");
    }
    os.press("HOME");
    expect(os.mode).toBe("calc");
  });

  it("holds each game still during READY / GO", () => {
    const os = new HackOS({ startIn: "launcher" });
    os.selected = 0; // Snake
    os.press("OK");
    const head = JSON.stringify(os.game);
    os.tick(INTRO_MS - 100);
    expect(JSON.stringify(os.game)).toBe(head);
    expect(os.intro).toBeGreaterThan(0);
    os.tick(200);
    os.tick(400);
    expect(JSON.stringify(os.game)).not.toBe(head);
  });

  it("uses = / EXE as hard drop in Tetris but as pause elsewhere", () => {
    const os = new HackOS({ startIn: "launcher" });
    os.selected = 2;
    os.press("OK");
    os.tick(INTRO_MS + 1);
    const t = os.game as Tetris;
    const before = t.score;
    os.press("EXE");
    expect(os.paused).toBe(false);
    expect(t.score).toBeGreaterThan(before);
    os.press("BACK");
    os.selected = 1;
    os.press("OK");
    os.tick(INTRO_MS + 1);
    os.press("EXE");
    expect(os.paused).toBe(true);
  });

  it("maps swipes and taps on the screen", () => {
    const os = new HackOS({ startIn: "launcher" });
    os.swipe("RIGHT");
    expect(os.selected).toBe(1);
    os.tap();
    expect(os.mode).toBe("game");
    expect(os.game?.id).toBe("2048");
  });

  it("records a best score when a game ends", () => {
    const os = new HackOS({ startIn: "launcher" });
    os.selected = 0;
    os.press("OK");
    os.tick(INTRO_MS + 1);
    const g = os.game!;
    g.score = 7;
    g.over = true;
    os.tick(16);
    expect(getBest("snake")).toBe(7);
    expect(os.newBest).toBe(true);
    os.press("OK"); // too soon: the result stays up
    expect(os.game?.over).toBe(true);
    os.tick(700);
    os.press("OK"); // play again
    expect(os.game?.over).toBe(false);
    expect(os.newBest).toBe(false);
  });

  it("asks to open the control room when the owner shortcut is typed", () => {
    const os = new HackOS();
    for (const k of ["1", "ADD", "1"] as const) os.press(k);
    for (const k of ADMIN_SHORTCUT_SEQUENCE) os.press(k);
    expect(os.adminRequested).toBe(true);
    expect(os.mode).toBe("calc");
    expect(os.expr).toBe("");
    // a near miss does nothing
    const other = new HackOS();
    for (const k of ["0", "7", "2", "3", "2", "0", "1", "6"] as const) other.press(k);
    expect(other.adminRequested).toBe(false);
    expect(other.expr).toBe("07232016");
  });

  it("does not open apps without a web demo", () => {
    const os = new HackOS({ startIn: "launcher", apps: [{ id: "pong", name: "Pong", playable: false }] });
    os.press("OK");
    expect(os.mode).toBe("launcher");
    expect(os.toast?.text).toMatch(/not in the web demo/i);
  });
});
