import { describe, expect, it } from "vitest";
import { detectPitch, toReading } from "./pitch";

const SR = 48000;

// A sine plus a 2nd harmonic (like a plucked string) and a little
// deterministic noise - the analyser buffer size the tuner actually uses.
function tone(freq: number, size = 2048) {
  const buf = new Float32Array(size);
  let seed = 7;
  for (let i = 0; i < size; i++) {
    seed = (seed * 16807) % 2147483647;
    const noise = (seed / 2147483647 - 0.5) * 0.02;
    buf[i] = 0.5 * Math.sin((2 * Math.PI * freq * i) / SR) + 0.2 * Math.sin((4 * Math.PI * freq * i) / SR) + noise;
  }
  return buf;
}

const cents = (a: number, b: number) => 1200 * Math.log2(a / b);

describe("detectPitch", () => {
  it.each([
    ["E2 (guitar low E)", 82.41],
    ["A2", 110],
    ["E4", 329.63],
    ["A4", 440],
    ["C6", 1046.5],
  ])("finds %s within 2 cents", (_, freq) => {
    expect(Math.abs(cents(detectPitch(tone(freq), SR), freq))).toBeLessThan(2);
  });

  it("returns -1 for silence", () => {
    expect(detectPitch(new Float32Array(2048), SR)).toBe(-1);
  });
});

describe("toReading", () => {
  it("names A4 in tune", () => {
    expect(toReading(440, 440)).toEqual({ freq: 440, note: "A", octave: 4, cents: 0 });
  });

  it("reports cents sharp", () => {
    const r = toReading(440 * 2 ** (20 / 1200), 440);
    expect([r.note, r.octave, r.cents]).toEqual(["A", 4, 20]);
  });

  it("follows the reference pitch", () => {
    // 432 Hz is A4 when the reference is 432, and ~-32 ct at 440.
    expect(toReading(432, 432).cents).toBe(0);
    expect(toReading(432, 440).cents).toBe(-32);
  });

  it("gets octaves right around C", () => {
    expect(toReading(261.63, 440)).toMatchObject({ note: "C", octave: 4 });
    expect(toReading(82.41, 440)).toMatchObject({ note: "E", octave: 2 });
  });
});
