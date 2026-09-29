import { describe, expect, it } from "vitest";
import { randomInt, shuffle } from "./random";

describe("randomInt", () => {
  it("stays in [0, max)", () => {
    for (let i = 0; i < 2000; i++) {
      const v = randomInt(6);
      expect(Number.isInteger(v) && v >= 0 && v < 6).toBe(true);
    }
  });

  it("is roughly uniform", () => {
    const counts = new Array(6).fill(0);
    const n = 60000;
    for (let i = 0; i < n; i++) counts[randomInt(6)]++;
    // Expected 10000 each; 5 sigma for a binomial here is ~460.
    for (const c of counts) expect(Math.abs(c - n / 6)).toBeLessThan(500);
  });

  it("rejects a non-positive max", () => {
    expect(() => randomInt(0)).toThrow(RangeError);
  });
});

describe("shuffle", () => {
  it("returns a permutation and leaves the input alone", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it("puts every item in every position", () => {
    const seen = Array.from({ length: 4 }, () => new Set<string>());
    for (let i = 0; i < 400; i++) shuffle(["a", "b", "c", "d"]).forEach((v, pos) => seen[pos].add(v));
    for (const s of seen) expect(s.size).toBe(4);
  });
});
