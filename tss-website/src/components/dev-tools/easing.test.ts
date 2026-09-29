import { describe, expect, it } from "vitest";
import { cubicBezier, toCss, toGodot, toUnity } from "./easing";

describe("cubicBezier", () => {
  it("is exact at the ends", () => {
    const ease = cubicBezier([0.34, 1.56, 0.64, 1]);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
  });

  it("linear is the identity", () => {
    const linear = cubicBezier([0, 0, 1, 1]);
    for (const t of [0.1, 0.25, 0.5, 0.9]) expect(linear(t)).toBeCloseTo(t, 4);
  });

  // Reference values of CSS `ease`, from a 100-step bisection solve.
  it("matches CSS ease", () => {
    const ease = cubicBezier([0.25, 0.1, 0.25, 1]);
    expect(ease(0.25)).toBeCloseTo(0.4085, 3);
    expect(ease(0.5)).toBeCloseTo(0.8024, 3);
    expect(ease(0.75)).toBeCloseTo(0.9604, 3);
  });

  it("symmetric curves pass through the middle", () => {
    expect(cubicBezier([0.42, 0, 0.58, 1])(0.5)).toBeCloseTo(0.5, 4);
  });

  it("overshoots for back curves", () => {
    const back = cubicBezier([0.34, 1.56, 0.64, 1]);
    const peak = Math.max(...Array.from({ length: 99 }, (_, i) => back((i + 1) / 100)));
    expect(peak).toBeGreaterThan(1);
  });
});

describe("snippets", () => {
  it("formats values", () => {
    expect(toCss([0.16, 1, 0.3, 1])).toBe("cubic-bezier(0.16, 1, 0.3, 1)");
    expect(toUnity([0.16, 1, 0.3, 1])).toContain("x1 = 0.16f, y1 = 1f, x2 = 0.3f, y2 = 1f");
    expect(toGodot([0.16, 1, 0.3, 1])).toContain("const Y1 := 1.0");
  });
});
