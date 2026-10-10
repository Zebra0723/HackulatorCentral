import { describe, expect, it } from "vitest";
import { newGame, step, turn } from "./snake";

describe("snake web demo", () => {
  it("moves forward", () => {
    const s = step({ ...newGame(15, () => 0), food: { x: 0, y: 0 } });
    expect(s.snake[0]).toEqual({ x: 8, y: 7 });
    expect(s.snake).toHaveLength(3);
  });
  it("grows and scores when eating", () => {
    const s = step({ ...newGame(15, () => 0), food: { x: 8, y: 7 } });
    expect(s.score).toBe(1);
    expect(s.snake).toHaveLength(4);
  });
  it("ignores reversing into itself", () => {
    const g = newGame();
    expect(turn(g, "left")).toBe(g);
  });
  it("ends on wall collision", () => {
    let s = { ...newGame(5, () => 0), food: { x: 0, y: 0 } };
    for (let i = 0; i < 5; i++) s = step(s);
    expect(s.over).toBe(true);
  });
});
