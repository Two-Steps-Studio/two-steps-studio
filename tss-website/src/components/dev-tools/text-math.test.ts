import { describe, expect, it } from "vitest";
import { convertCase, diffLines, findMatches, parseInteger, toBase, words } from "./text-math";

describe("findMatches", () => {
  it("lists every match with groups, even without the g flag", () => {
    const r = findMatches("(\\w+)@(\\w+)\\.pl", "", "ala@tss.pl, ola@dev.pl");
    expect("matches" in r && r.matches.map((m) => [m.index, m.text, m.groups])).toEqual([
      [0, "ala@tss.pl", ["ala", "tss"]],
      [12, "ola@dev.pl", ["ola", "dev"]],
    ]);
  });

  it("returns named groups", () => {
    const r = findMatches("(?<bpm>\\d+) BPM", "", "128 BPM");
    expect("matches" in r && r.matches[0].named).toEqual({ bpm: "128" });
  });

  it("does not loop on zero-length matches", () => {
    const r = findMatches("a*", "", "baaa");
    expect("matches" in r && r.matches.length).toBeGreaterThan(0);
  });

  it("caps the number of matches", () => {
    const r = findMatches(".", "", "x".repeat(1000), 10);
    expect(r).toMatchObject({ truncated: true });
    expect("matches" in r && r.matches).toHaveLength(10);
  });

  it("reports syntax errors", () => {
    expect(findMatches("(", "", "x")).toHaveProperty("error");
  });
});

describe("diffLines", () => {
  it("marks added and removed lines", () => {
    expect(diffLines("a\nb\nc", "a\nx\nc")).toEqual([
      { type: "same", text: "a" },
      { type: "removed", text: "b" },
      { type: "added", text: "x" },
      { type: "same", text: "c" },
    ]);
  });

  it("can ignore whitespace", () => {
    expect(diffLines("a  b\nc", "a b\nc", true).every((l) => l.type === "same")).toBe(true);
    expect(diffLines("a  b", "a b").map((l) => l.type)).toEqual(["removed", "added"]);
  });

  it("handles empty sides", () => {
    expect(diffLines("", "x").map((l) => l.type)).toEqual(["added"]);
    expect(diffLines("x", "").map((l) => l.type)).toEqual(["removed"]);
  });
});

describe("number bases", () => {
  it("parses in the given base or from a prefix", () => {
    expect(parseInteger("255", 10)).toBe(BigInt(255));
    expect(parseInteger("ff", 16)).toBe(BigInt(255));
    expect(parseInteger("0b1111_1111", 10)).toBe(BigInt(255));
    expect(parseInteger("0o377", 10)).toBe(BigInt(255));
    expect(parseInteger("12", 2)).toBeNull();
    expect(parseInteger("-5", 10)).toBeNull();
  });

  it("handles numbers beyond 2^53 (Discord snowflakes, permission bitfields)", () => {
    const n = parseInteger("1125899906842624", 10)!;
    expect(toBase(n, 2)).toBe("1" + "0".repeat(50));
    expect(toBase(n, 16)).toBe("4000000000000");
  });
});

describe("case conversion", () => {
  it("splits words from mixed input", () => {
    expect(words("helloWorld HTTPServer_v2-final")).toEqual(["hello", "World", "HTTP", "Server", "v2", "final"]);
  });

  it("converts to every style", () => {
    expect(convertCase("player health points")).toMatchObject({
      camel: "playerHealthPoints",
      pascal: "PlayerHealthPoints",
      snake: "player_health_points",
      constant: "PLAYER_HEALTH_POINTS",
      kebab: "player-health-points",
      title: "Player Health Points",
    });
  });

  it("strips Polish diacritics for identifiers but keeps them in title case", () => {
    const r = convertCase("zażółć gęślą jaźń Łódź");
    expect(r.kebab).toBe("zazolc-gesla-jazn-lodz");
    expect(r.title).toBe("Zażółć Gęślą Jaźń Łódź");
  });
});
