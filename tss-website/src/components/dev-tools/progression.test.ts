import { describe, expect, it } from "vitest";
import { chanceAtLeastOnce, levelFromXp, parseChance, totalXp, triesFor, tssEffort } from "./progression";

const P = { base: 100, growth: 1.5 };

describe("TSS bot curve", () => {
  // Mirrors tss-dc-bot/index.js: level = floor(0.1 * sqrt(xp)), 0 below 100 XP.
  const botLevel = (xp: number) => (xp < 100 ? 0 : Math.floor(0.1 * Math.sqrt(xp)));

  it("matches the bot's level formula at and around every threshold", () => {
    for (let level = 1; level <= 100; level++) {
      const xp = totalXp("tss", level, P);
      expect(botLevel(xp)).toBe(level);
      expect(botLevel(xp - 1)).toBe(level - 1);
      expect(levelFromXp("tss", xp, P)).toBe(level);
      expect(levelFromXp("tss", xp - 1, P)).toBe(level - 1);
    }
  });

  it("level 10 needs 10 000 XP = 5000 messages or ~55.6 h of voice", () => {
    expect(totalXp("tss", 10, P)).toBe(10000);
    expect(tssEffort(10000)).toEqual({ messages: 5000, voiceMinutes: 3334 });
  });
});

describe("generic curves", () => {
  it("linear / quadratic / exponential totals", () => {
    expect(totalXp("linear", 5, P)).toBe(500);
    expect(totalXp("quadratic", 5, P)).toBe(2500);
    // 100 + 150 + 225 = 475
    expect(totalXp("exponential", 3, P)).toBeCloseTo(475, 6);
    expect(totalXp("exponential", 3, { base: 100, growth: 1 })).toBe(300);
  });

  it("inverts every curve", () => {
    for (const curve of ["linear", "quadratic", "exponential"] as const) {
      expect(levelFromXp(curve, totalXp(curve, 7, P), P)).toBe(7);
      expect(levelFromXp(curve, totalXp(curve, 7, P) - 0.5, P)).toBe(6);
    }
  });
});

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
