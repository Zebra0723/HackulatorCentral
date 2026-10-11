import { describe, expect, it } from "vitest";
import { DEMO_UNLOCK_SEQUENCE, HackOS } from "./os";

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

  it("does not open apps without a web demo", () => {
    const os = new HackOS({ startIn: "launcher", apps: [{ id: "pong", name: "Pong", playable: false }] });
    os.press("OK");
    expect(os.mode).toBe("launcher");
    expect(os.toast?.text).toMatch(/not in the web demo/i);
  });
});
