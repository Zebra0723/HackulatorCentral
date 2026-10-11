import { describe, expect, it } from "vitest";
import { Game2048, slideRow } from "./g2048";
import { Snake } from "./snake";
import { Tetris, WELL_H, WELL_W, rotate } from "./tetris";

describe("2048", () => {
  it("merges each pair once", () => {
    expect(slideRow([2, 2, 2, 2])).toEqual({ row: [4, 4, 0, 0], gained: 8 });
    expect(slideRow([0, 2, 0, 2])).toEqual({ row: [4, 0, 0, 0], gained: 4 });
    expect(slideRow([4, 2, 2, 0])).toEqual({ row: [4, 4, 0, 0], gained: 4 });
  });
  it("moves in all directions and detects game over", () => {
    const g = new Game2048(() => 0);
    g.grid = [[2, 0, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    expect(g.move("RIGHT")).toBe(true);
    expect(g.grid[0]).toEqual([0, 0, 0, 4]);
    g.grid = [[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]];
    expect(g.canMove()).toBe(false);
  });
});

describe("Tetris", () => {
  it("rotates shapes", () => {
    expect(rotate([[1, 1, 1, 1]])).toEqual([[1], [1], [1], [1]]);
  });
  it("clears a full line and scores", () => {
    const t = new Tetris(() => 0); // always the I piece
    t.well[WELL_H - 1] = Array(WELL_W).fill(1);
    t.well[WELL_H - 1][0] = 0;
    t.well[WELL_H - 1][1] = 0;
    t.well[WELL_H - 1][2] = 0;
    t.well[WELL_H - 1][3] = 0;
    // I piece spawns at x=3; move it to x=0 and drop to the bottom.
    for (let i = 0; i < 5; i++) t.key("LEFT");
    for (let i = 0; i < WELL_H + 2; i++) t.drop();
    expect(t.lines).toBeGreaterThanOrEqual(1);
    expect(t.score).toBeGreaterThan(0);
  });
  it("ends when pieces stack to the top", () => {
    const t = new Tetris(() => 0);
    for (let i = 0; i < 400 && !t.over; i++) t.drop();
    expect(t.over).toBe(true);
  });
});

describe("Snake", () => {
  it("grows when eating", () => {
    const s = new Snake(() => 0, 8, 4);
    s.food = { x: s.body[0].x + 1, y: s.body[0].y };
    s.step();
    expect(s.score).toBe(1);
    expect(s.body).toHaveLength(4);
  });
  it("wraps through walls instead of dying", () => {
    const s = new Snake(() => 0, 8, 4);
    s.food = { x: -1, y: -1 };
    const y = s.body[0].y;
    for (let i = 0; i < 20; i++) s.step();
    expect(s.over).toBe(false);
    expect(s.body[0].y).toBe(y);
    expect(s.body[0].x).toBe((2 + 20) % 8);
    s.key("UP");
    for (let i = 0; i < 5; i++) s.step();
    expect(s.over).toBe(false);
    expect(s.body[0].y).toBe((y - 5 + 4 * 2) % 4);
  });
  it("ends the game when it runs into itself", () => {
    const s = new Snake(() => 0, 8, 6);
    s.body = [{ x: 3, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 4, y: 2 }];
    s.dir = "RIGHT";
    s.food = { x: -1, y: -1 };
    s.key("DOWN");
    s.step();
    expect(s.over).toBe(true);
  });
});
