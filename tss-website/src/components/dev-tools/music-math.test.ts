import { describe, expect, it } from "vitest";
import { midiToFreq } from "./audio";
import { barsToSeconds, formatDuration, noteToMidi, parseDuration, secondsToBars } from "./music-math";

describe("bars and time", () => {
  it("16 bars of 4/4 at 128 BPM is 30 seconds", () => {
    expect(barsToSeconds(16, 128, 4)).toBeCloseTo(30, 10);
    expect(secondsToBars(30, 128, 4)).toBeCloseTo(16, 10);
  });

  it("handles other meters", () => {
    // 8 bars of 3/4 at 90 BPM = 24 beats = 16 s
    expect(barsToSeconds(8, 90, 3)).toBeCloseTo(16, 10);
  });

  it("parses and formats durations", () => {
    expect(parseDuration("1:30")).toBe(90);
    expect(parseDuration("2:05.5")).toBe(125.5);
    expect(parseDuration("45,25")).toBe(45.25);
    expect(parseDuration("1:75")).toBeNull();
    expect(formatDuration(90)).toBe("1:30.00");
    expect(formatDuration(5.5)).toBe("0:05.50");
  });
});

describe("noteToMidi", () => {
  it.each([
    ["A4", 69],
    ["C4", 60],
    ["C#3", 49],
    ["Eb2", 39],
    ["bb1", 34],
    ["H3", 59], // Polish/German H = B
    ["C-1", 0],
  ])("%s -> %i", (note, midi) => {
    expect(noteToMidi(note)).toBe(midi);
  });

  it("rejects nonsense and out-of-range notes", () => {
    expect(noteToMidi("X4")).toBeNull();
    expect(noteToMidi("A")).toBeNull();
    expect(noteToMidi("G9")).toBe(127);
    expect(noteToMidi("A9")).toBeNull();
  });

  it("lines up with frequencies", () => {
    expect(midiToFreq(noteToMidi("A4")!)).toBe(440);
    expect(midiToFreq(noteToMidi("E2")!)).toBeCloseTo(82.41, 2);
  });
});
