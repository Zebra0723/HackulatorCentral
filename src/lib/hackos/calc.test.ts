import { describe, expect, it } from "vitest";
import { CalcError, evaluate, formatResult } from "./calc";

describe("calculator parser", () => {
  it.each([
    ["7×8", 56],
    ["1+2×3", 7],
    ["(1+2)×3", 9],
    ["10÷4", 2.5],
    ["-3+5", 2],
    ["2^3^2", 512],
    ["3²", 9],
    ["√16", 4],
    ["√(9+16)", 5],
    ["2(3+4)", 14],
    ["1.5E3", 1500],
    ["(2+3", 5],
    ["0.1+0.2", 0.30000000000000004],
  ])("%s = %d", (src, want) => {
    expect(evaluate(src)).toBeCloseTo(want as number, 10);
  });

  it("uses Ans", () => {
    expect(evaluate("Ans×2", 21)).toBe(42);
  });

  it("reports maths and syntax errors", () => {
    expect(() => evaluate("1÷0")).toThrow(CalcError);
    expect(() => evaluate("√-4")).toThrowError("Math ERROR");
    expect(() => evaluate("1++")).toThrowError("Syntax ERROR");
    expect(() => evaluate("1..2")).toThrowError("Syntax ERROR");
    expect(() => evaluate("")).toThrowError("Syntax ERROR");
  });

  it("never evaluates arbitrary code", () => {
    expect(() => evaluate("alert(1)")).toThrowError("Syntax ERROR");
    expect(() => evaluate("constructor")).toThrowError("Syntax ERROR");
  });

  it("formats results for the display", () => {
    expect(formatResult(0.1 + 0.2)).toBe("0.3");
    expect(formatResult(56)).toBe("56");
    expect(formatResult(1e12)).toBe("1×10^12");
  });
});
