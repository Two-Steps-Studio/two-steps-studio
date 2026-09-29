import { describe, expect, it } from "vitest";
import { kWeighting, measureLoudness, waveformPeaks } from "./loudness";

const sine = (freq: number, amplitude: number, seconds: number, sampleRate: number, phase = 0) =>
  Float32Array.from({ length: Math.round(seconds * sampleRate) }, (_, i) => amplitude * Math.sin((2 * Math.PI * freq * i) / sampleRate + phase));

const dbfs = (db: number) => 10 ** (db / 20);

describe("kWeighting", () => {
  it("matches the BS.1770 coefficients at 48 kHz", () => {
    const [shelf, hp] = kWeighting(48000);
    expect(shelf.b0).toBeCloseTo(1.53512485958697, 10);
    expect(shelf.b1).toBeCloseTo(-2.69169618940638, 10);
    expect(shelf.b2).toBeCloseTo(1.19839281085285, 10);
    expect(shelf.a1).toBeCloseTo(-1.69065929318241, 10);
    expect(shelf.a2).toBeCloseTo(0.73248077421585, 10);
    expect(hp.a1).toBeCloseTo(-1.99004745483398, 10);
    expect(hp.a2).toBeCloseTo(0.99007225036621, 10);
  });
});

describe("measureLoudness", () => {
  // EBU Tech 3341 case 1/2: a 1 kHz stereo sine at -23 / -33 dBFS reads
  // -23 / -33 LUFS (the -0.691 offset cancels K-weighting's gain at 1 kHz).
  it.each([
    [-23, 48000],
    [-33, 48000],
    [-23, 44100],
  ])("1 kHz stereo sine at %i dBFS (%i Hz) reads the same in LUFS", async (level, sr) => {
    const ch = sine(1000, dbfs(level), 20, sr);
    const r = await measureLoudness([ch, ch], sr);
    expect(r.integrated).toBeCloseTo(level, 1);
    expect(r.maxMomentary).toBeCloseTo(level, 1);
    expect(r.range).toBeCloseTo(0, 1);
  });

  it("a mono channel reads 3 dB below the same signal in stereo", async () => {
    const ch = sine(1000, dbfs(-23), 10, 48000);
    const mono = await measureLoudness([ch], 48000);
    expect(mono.integrated).toBeCloseTo(-26.01, 1);
  });

  // EBU Tech 3341 case 5-style: the relative gate drops the quiet part, so a
  // loud section plus a much quieter one still reads as the loud section.
  it("gates out quiet passages", async () => {
    const sr = 48000;
    const loud = sine(1000, dbfs(-20), 10, sr);
    const quiet = sine(1000, dbfs(-50), 10, sr);
    const ch = new Float32Array(loud.length + quiet.length);
    ch.set(loud);
    ch.set(quiet, loud.length);
    const r = await measureLoudness([ch, ch], sr);
    // Tech 3341 allows +/-0.1 LU; blocks straddling the edge pull it slightly.
    expect(Math.abs(r.integrated + 20)).toBeLessThan(0.1);
  });

  it("measures loudness range between two levels", async () => {
    const sr = 48000;
    const a = sine(1000, dbfs(-20), 20, sr);
    const b = sine(1000, dbfs(-30), 20, sr);
    const ch = new Float32Array(a.length + b.length);
    ch.set(a);
    ch.set(b, a.length);
    const r = await measureLoudness([ch, ch], sr);
    // EBU Tech 3342 case 1: -20 / -30 LUFS halves -> LRA 10 LU (+/- 1).
    expect(r.range).toBeGreaterThan(9);
    expect(r.range).toBeLessThan(11);
  });

  it("finds inter-sample peaks the sample peak misses", async () => {
    // fs/4 sine phase-shifted by 45 degrees: every sample lands at +/-0.707
    // of the true amplitude, so sample peak is ~3 dB under the real peak.
    const sr = 48000;
    const ch = sine(sr / 4, 1, 2, sr, Math.PI / 4);
    const r = await measureLoudness([ch, ch], sr);
    expect(r.samplePeak).toBeCloseTo(-3.01, 1);
    expect(r.truePeak).toBeGreaterThan(-0.5);
    expect(r.truePeak).toBeLessThan(0.5);
  });

  it("reports silence as -Infinity", async () => {
    const r = await measureLoudness([new Float32Array(48000 * 5)], 48000);
    expect(r.integrated).toBe(-Infinity);
    expect(r.truePeak).toBe(-Infinity);
  });
});

describe("waveformPeaks", () => {
  it("returns min/max per bucket", () => {
    const peaks = waveformPeaks(Float32Array.from([0.1, -0.5, 0.3, 0.9, -0.2, 0]), 2);
    expect(Array.from(peaks).map((v) => Math.round(v * 10) / 10)).toEqual([-0.5, 0.3, -0.2, 0.9]);
  });
});
