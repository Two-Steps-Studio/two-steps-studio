// Offline BPM + key estimation for a decoded, mono, resampled track.
// Pure functions (no Web Audio) so they can be unit-tested outside a
// browser; they yield to the event loop periodically so a long track
// doesn't freeze the page.

export const ANALYSIS_RATE = 22050;

const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

// In-place iterative radix-2 FFT. `re`/`im` length must be a power of two.
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wr = Math.cos(angle);
    const wi = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k;
        const b = a + half;
        const br = re[b] * cr - im[b] * ci;
        const bi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - br;
        im[b] = im[a] - bi;
        re[a] += br;
        im[a] += bi;
        const next = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = next;
      }
    }
  }
}

function hann(size: number) {
  const w = new Float64Array(size);
  for (let i = 0; i < size; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
  return w;
}

// Magnitude spectrum (first size/2 bins) of one windowed frame.
function frameMagnitudes(samples: Float32Array, start: number, window: Float64Array, re: Float64Array, im: Float64Array, out: Float64Array) {
  const size = window.length;
  for (let i = 0; i < size; i++) {
    re[i] = (samples[start + i] ?? 0) * window[i];
    im[i] = 0;
  }
  fft(re, im);
  for (let k = 0; k < out.length; k++) out[k] = Math.hypot(re[k], im[k]);
}

// The middle `seconds` of the track - skips intros/outros, which are the
// parts most likely to have no beat or to sit in a different key.
export function middleSegment(samples: Float32Array, sampleRate: number, seconds: number) {
  const len = Math.min(samples.length, Math.floor(seconds * sampleRate));
  const start = Math.floor((samples.length - len) / 2);
  return samples.subarray(start, start + len);
}

/* ------------------------------------ BPM ------------------------------------- */

export type BpmResult = { bpm: number; confidence: number };

const MIN_BPM = 60;
const MAX_BPM = 200;

export async function detectBpm(samples: Float32Array, sampleRate: number, onProgress?: (p: number) => void): Promise<BpmResult | null> {
  const size = 1024;
  const hop = 256;
  const fps = sampleRate / hop;
  const frames = Math.floor((samples.length - size) / hop);
  if (frames < fps * 6) return null; // need a few seconds of material

  // 1. Onset strength: spectral flux on log-compressed magnitudes - how much
  //    new energy appears in each frame, across all frequencies.
  const window = hann(size);
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  let prev = new Float64Array(size / 2);
  let cur = new Float64Array(size / 2);
  const flux = new Float64Array(frames);
  for (let f = 0; f < frames; f++) {
    frameMagnitudes(samples, f * hop, window, re, im, cur);
    let sum = 0;
    for (let k = 0; k < cur.length; k++) {
      cur[k] = Math.log1p(100 * cur[k]);
      const d = cur[k] - prev[k];
      if (d > 0) sum += d;
    }
    flux[f] = sum;
    [prev, cur] = [cur, prev];
    if (f % 512 === 0) {
      onProgress?.(f / frames);
      await yieldToBrowser();
    }
  }

  // 2. Remove the slow trend (local mean over ~0.5 s), keep only peaks.
  const radius = Math.round(fps * 0.25);
  const env = new Float64Array(frames);
  let windowSum = 0;
  for (let i = 0; i < Math.min(frames, radius); i++) windowSum += flux[i];
  for (let f = 0; f < frames; f++) {
    const add = f + radius;
    const drop = f - radius - 1;
    if (add < frames) windowSum += flux[add];
    if (drop >= 0) windowSum -= flux[drop];
    const count = Math.min(frames - 1, f + radius) - Math.max(0, f - radius) + 1;
    env[f] = Math.max(0, flux[f] - windowSum / count);
  }

  // 3. Autocorrelation of the onset envelope, up to 4 beats at the slowest tempo.
  const maxLag = Math.ceil(((60 * fps) / MIN_BPM) * 4) + 2;
  const ac = new Float64Array(Math.min(maxLag, frames - 1));
  for (let lag = 1; lag < ac.length; lag++) {
    let sum = 0;
    for (let t = 0; t + lag < frames; t++) sum += env[t] * env[t + lag];
    ac[lag] = sum / (frames - lag);
  }
  const acAt = (lag: number) => {
    const i = Math.floor(lag);
    if (i + 1 >= ac.length) return 0;
    return ac[i] + (ac[i + 1] - ac[i]) * (lag - i);
  };

  // 4. Score every tempo on a 0.1 BPM grid by its beat and its first few
  //    multiples (a real tempo lines up with 2, 3 and 4 beats too), times a
  //    broad prior centered on 120 BPM that settles half/double ambiguity
  //    the way listeners usually would.
  let best = { bpm: 0, score: -Infinity };
  let total = 0;
  let count = 0;
  for (let tenths = MIN_BPM * 10; tenths <= MAX_BPM * 10; tenths++) {
    const bpm = tenths / 10;
    const lag = (60 * fps) / bpm;
    let score = 0;
    for (let m = 1; m <= 4; m++) score += acAt(lag * m);
    score *= Math.exp(-0.5 * Math.log2(bpm / 120) ** 2);
    total += score;
    count++;
    if (score > best.score) best = { bpm, score };
  }
  onProgress?.(1);
  const mean = total / count;
  if (!(best.score > 0) || !(mean > 0)) return null;
  // Peak-to-mean ratio mapped to 0..1 - a rough "how clear is the beat".
  const confidence = Math.max(0, Math.min(1, (best.score / mean - 1) / 3));
  return { bpm: best.bpm, confidence };
}

/* ------------------------------------ Key ------------------------------------- */

// Krumhansl-Kessler key profiles (C major / C minor), rotated per tonic.
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const MAJOR_NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const MINOR_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];
// Camelot wheel numbers indexed by tonic pitch class (C = 0).
const CAMELOT_MAJOR = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1];
const CAMELOT_MINOR = [5, 12, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10];

export type KeyGuess = { tonic: number; mode: "major" | "minor"; name: string; camelot: string; score: number };
export type KeyResult = { best: KeyGuess; alternative: KeyGuess; confidence: number; chroma: number[] };

function pearson(a: ArrayLike<number>, b: ArrayLike<number>) {
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < 12; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= 12;
  mb /= 12;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < 12; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

export async function detectKey(samples: Float32Array, sampleRate: number, onProgress?: (p: number) => void): Promise<KeyResult | null> {
  // Long frames for enough low-frequency resolution (~2.7 Hz per bin at
  // 22.05 kHz), which matters because semitones are only ~4 Hz apart at C2.
  const size = 8192;
  const hop = 4096;
  const frames = Math.floor((samples.length - size) / hop);
  if (frames < 8) return null;

  const window = hann(size);
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const mags = new Float64Array(size / 2);

  // Bin -> pitch class, only between C2 and ~C7 (below is rumble, above
  // is mostly cymbal noise and harmonics).
  const pitchClass = new Int8Array(size / 2).fill(-1);
  for (let k = 1; k < size / 2; k++) {
    const freq = (k * sampleRate) / size;
    if (freq < 65 || freq > 2100) continue;
    pitchClass[k] = (((Math.round(12 * Math.log2(freq / 440)) + 9) % 12) + 12) % 12;
  }

  const chroma = new Float64Array(12);
  const frameChroma = new Float64Array(12);
  for (let f = 0; f < frames; f++) {
    frameMagnitudes(samples, f * hop, window, re, im, mags);
    frameChroma.fill(0);
    let energy = 0;
    for (let k = 0; k < mags.length; k++) {
      const pc = pitchClass[k];
      if (pc < 0) continue;
      frameChroma[pc] += mags[k];
      energy += mags[k];
    }
    // Per-frame normalization so one loud section can't outvote the rest.
    if (energy > 1e-3) for (let i = 0; i < 12; i++) chroma[i] += frameChroma[i] / energy;
    if (f % 16 === 0) {
      onProgress?.(f / frames);
      await yieldToBrowser();
    }
  }
  onProgress?.(1);
  if (chroma.every((v) => v === 0)) return null;

  const guesses: KeyGuess[] = [];
  for (let tonic = 0; tonic < 12; tonic++) {
    for (const mode of ["major", "minor"] as const) {
      const profile = mode === "major" ? MAJOR_PROFILE : MINOR_PROFILE;
      const rotated = Array.from({ length: 12 }, (_, i) => profile[(i - tonic + 12) % 12]);
      guesses.push({
        tonic,
        mode,
        name: (mode === "major" ? MAJOR_NAMES : MINOR_NAMES)[tonic],
        camelot: `${(mode === "major" ? CAMELOT_MAJOR : CAMELOT_MINOR)[tonic]}${mode === "major" ? "B" : "A"}`,
        score: pearson(chroma, rotated),
      });
    }
  }
  guesses.sort((a, b) => b.score - a.score);
  const [best, alternative] = guesses;
  // Margin over the runner-up, scaled: correlations of 0.9 vs 0.85 are a
  // lot less decisive than 0.9 vs 0.6.
  const confidence = Math.max(0, Math.min(1, (best.score - alternative.score) * 5 + Math.max(0, best.score - 0.5)));
  const sum = chroma.reduce((a, b) => a + b, 0);
  return { best, alternative, confidence, chroma: Array.from(chroma, (v) => v / sum) };
}
