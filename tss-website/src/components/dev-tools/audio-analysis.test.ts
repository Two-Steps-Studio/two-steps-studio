import { describe, expect, it } from "vitest";
import { ANALYSIS_RATE, detectBpm, detectKey, middleSegment } from "./audio-analysis";

const SR = ANALYSIS_RATE;
const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

// Synthetic "track": kick on every beat, snare on 2 and 4, eighth-note hats,
// and a one-bar-per-chord progression (bass + triad with a few harmonics).
function synth(bpm: number, chords: number[][], seconds = 40) {
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const out = new Float32Array(Math.floor(seconds * SR));
  const beat = 60 / bpm;
  for (let t = 0, b = 0; t < seconds; t += beat, b++) {
    const i0 = Math.floor(t * SR);
    for (let i = 0; i < 0.15 * SR && i0 + i < out.length; i++) out[i0 + i] += 0.6 * Math.sin((2 * Math.PI * 55 * i) / SR) * Math.exp(-i / SR / 0.05);
    if (b % 2 === 1) for (let i = 0; i < 0.1 * SR && i0 + i < out.length; i++) out[i0 + i] += 0.3 * rnd() * Math.exp(-i / SR / 0.04);
    for (const off of [0, beat / 2]) {
      const j0 = Math.floor((t + off) * SR);
      for (let i = 0; i < 0.03 * SR && j0 + i < out.length; i++) out[j0 + i] += 0.08 * rnd() * Math.exp(-i / SR / 0.01);
    }
  }
  const bar = 4 * beat;
  for (let t = 0, c = 0; t < seconds; t += bar, c++) {
    const i0 = Math.floor(t * SR);
    const len = Math.floor(bar * SR);
    chords[c % chords.length].forEach((m, idx) => {
      const f = midiHz(m);
      const amp = idx === 0 ? 0.12 : 0.07;
      for (let i = 0; i < len && i0 + i < out.length; i++) {
        const x = i / SR;
        const env = Math.min(1, x / 0.02) * Math.exp(-x / 3);
        out[i0 + i] += amp * env * (Math.sin(2 * Math.PI * f * x) + 0.5 * Math.sin(4 * Math.PI * f * x) + 0.25 * Math.sin(6 * Math.PI * f * x));
      }
    });
  }
  return out;
}

// [bass, ...triad] as MIDI notes; I-IV-V-I or i-iv-V-i.
const CASES: { key: string; camelot: string; bpm: number; chords: number[][] }[] = [
  { key: "A minor", camelot: "8A", bpm: 90, chords: [[45, 57, 60, 64], [38, 62, 65, 69], [40, 64, 68, 71], [45, 57, 60, 64]] },
  { key: "D major", camelot: "10B", bpm: 120, chords: [[38, 62, 66, 69], [43, 67, 71, 74], [45, 69, 73, 76], [38, 62, 66, 69]] },
  { key: "Eb major", camelot: "5B", bpm: 128, chords: [[39, 63, 67, 70], [44, 68, 72, 75], [46, 70, 74, 77], [39, 63, 67, 70]] },
  { key: "F# minor", camelot: "11A", bpm: 140, chords: [[42, 66, 69, 73], [47, 71, 74, 78], [49, 73, 77, 80], [42, 66, 69, 73]] },
  { key: "C major", camelot: "8B", bpm: 100, chords: [[36, 60, 64, 67], [41, 65, 69, 72], [43, 67, 71, 74], [36, 60, 64, 67]] },
  { key: "G minor", camelot: "6A", bpm: 110, chords: [[43, 67, 70, 74], [36, 60, 63, 67], [38, 62, 66, 69], [43, 67, 70, 74]] },
];

describe("detectBpm + detectKey", () => {
  it.each(CASES)("$key @ $bpm BPM", async ({ key, camelot, bpm, chords }) => {
    const audio = synth(bpm, chords);
    const bpmResult = await detectBpm(audio, SR);
    const keyResult = await detectKey(audio, SR);
    expect(Math.abs(bpmResult!.bpm - bpm)).toBeLessThanOrEqual(1);
    expect(`${keyResult!.best.name} ${keyResult!.best.mode}`).toBe(key);
    expect(keyResult!.best.camelot).toBe(camelot);
  });

  // Drum & bass is the textbook half/double-time case: the 120 BPM prior
  // settles it at half, and the UI shows 2x as the alternative.
  it("reports 174 BPM as 174 or its half", async () => {
    const { bpm } = (await detectBpm(synth(174, CASES[0].chords), SR))!;
    expect([87, 174].some((target) => Math.abs(bpm - target) <= 1)).toBe(true);
  });

  it("returns null when there is nothing to analyze", async () => {
    expect(await detectBpm(new Float32Array(SR * 2), SR)).toBeNull(); // too short
    expect(await detectBpm(new Float32Array(SR * 20), SR)).toBeNull(); // silence
    expect(await detectKey(new Float32Array(SR * 20), SR)).toBeNull();
  });

  it("reports progress up to 1", async () => {
    const seen: number[] = [];
    await detectBpm(synth(120, CASES[1].chords, 10), SR, (p) => seen.push(p));
    expect(seen.at(-1)).toBe(1);
    expect(seen.every((p, i) => i === 0 || p >= seen[i - 1])).toBe(true);
  });
});

describe("middleSegment", () => {
  it("takes the middle", () => {
    const samples = Float32Array.from({ length: 100 }, (_, i) => i);
    expect(Array.from(middleSegment(samples, 10, 2))).toEqual([40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59]);
  });

  it("returns everything when the track is shorter than the window", () => {
    expect(middleSegment(new Float32Array(50), 10, 90).length).toBe(50);
  });
});
