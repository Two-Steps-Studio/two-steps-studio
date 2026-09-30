import { describe, expect, it } from "vitest";
import { chanceAtLeastOnce, parseChance, triesFor } from "./progression";

describe("drop chance", () => {
  it("parses fractions and percents", () => {
    expect(parseChance("1/500")).toBeCloseTo(0.002, 10);
    expect(parseChance("0,2%")).toBeCloseTo(0.002, 10);
    expect(parseChance("5")).toBeCloseTo(0.05, 10);
    expect(parseChance("0")).toBeNull();
    expect(parseChance("150%")).toBeNull();
    expect(parseChance("abc")).toBeNull();
  });

  it("computes the chance of at least one drop", () => {
    // 1/100 over 100 tries is famously only ~63.4 %, not 100 %.
    expect(chanceAtLeastOnce(0.01, 100)).toBeCloseTo(0.634, 3);
    expect(chanceAtLeastOnce(0.5, 1)).toBe(0.5);
  });

  it("finds tries needed for a confidence level", () => {
    expect(triesFor(0.01, 0.5)).toBe(69);
    expect(triesFor(0.01, 0.9)).toBe(230);
    expect(triesFor(0.01, 0.99)).toBe(459);
    expect(triesFor(1, 0.99)).toBe(1);
  });
});
