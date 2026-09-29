// Loudness per ITU-R BS.1770-4 / EBU R128: integrated loudness (LUFS),
// loudness range (LRA, EBU Tech 3342), max momentary/short-term loudness,
// and true peak (dBTP). Pure functions working on raw channel data, so they
// can be unit-tested outside a browser. Everything streams over the samples
// once; no filtered copies of a (possibly 10-minute, stereo) track are made.

const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

type Biquad = { b0: number; b1: number; b2: number; a1: number; a2: number };

// K-weighting for any sample rate: the BS.1770 pre-filter (high shelf,
// models the head) and RLB high-pass, re-derived per rate the way
// libebur128 does. At 48 kHz these reproduce the coefficients printed in
// the standard.
export function kWeighting(sampleRate: number): [Biquad, Biquad] {
  let f0 = 1681.974450955533;
  const G = 3.999843853973347;
  let Q = 0.7071752369554196;
  let K = Math.tan((Math.PI * f0) / sampleRate);
  const Vh = 10 ** (G / 20);
  const Vb = Vh ** 0.4996667741545416;
  let a0 = 1 + K / Q + K * K;
  const shelf: Biquad = {
    b0: (Vh + (Vb * K) / Q + K * K) / a0,
    b1: (2 * (K * K - Vh)) / a0,
    b2: (Vh - (Vb * K) / Q + K * K) / a0,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / Q + K * K) / a0,
  };

  f0 = 38.13547087602444;
  Q = 0.5003270373238773;
  K = Math.tan((Math.PI * f0) / sampleRate);
  a0 = 1 + K / Q + K * K;
  const highpass: Biquad = { b0: 1, b1: -2, b2: 1, a1: (2 * (K * K - 1)) / a0, a2: (1 - K / Q + K * K) / a0 };
  return [shelf, highpass];
}

// True peak: 4x oversampling (2x at 96 kHz+) with a windowed-sinc
// interpolator, 12 taps per phase like the BS.1770 reference filter.
// Phase 0 is the sample itself; phases 1..n-1 are the points in between.
const TAPS = 12;
const HALF = TAPS / 2;

function interpolationPhases(factor: number) {
  const phases: Float64Array[] = [];
  for (let p = 1; p < factor; p++) {
    const frac = p / factor;
    const taps = new Float64Array(TAPS);
    let sum = 0;
    for (let i = 0; i < TAPS; i++) {
      const x = i - (HALF - 1) - frac; // taps cover samples n-5 .. n+6
      const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
      const window = 0.5 + 0.5 * Math.cos((Math.PI * x) / HALF);
      taps[i] = sinc * window;
      sum += taps[i];
    }
    for (let i = 0; i < TAPS; i++) taps[i] /= sum; // unity gain at DC
    phases.push(taps);
  }
  return phases;
}

export type LoudnessResult = {
  integrated: number; // LUFS; -Infinity for silence
  range: number; // LU
  maxMomentary: number; // LUFS, 400 ms
  maxShortTerm: number; // LUFS, 3 s
  samplePeak: number; // dBFS
  truePeak: number; // dBTP
};

const toLufs = (meanSquare: number) => -0.691 + 10 * Math.log10(meanSquare);
const toDb = (amplitude: number) => 20 * Math.log10(amplitude);

// Surround channels (4th and 5th in the standard's L, R, C, Ls, Rs order)
// count 1.41x; everything else 1.0. A mono file is measured as one channel,
// same as ffmpeg's ebur128 filter.
const channelWeight = (index: number) => (index === 3 || index === 4 ? 1.41 : 1);

export async function measureLoudness(channels: Float32Array[], sampleRate: number, onProgress?: (p: number) => void): Promise<LoudnessResult> {
  const [shelf, hp] = kWeighting(sampleRate);
  const segment = Math.round(sampleRate / 10); // 100 ms
  const length = channels[0]?.length ?? 0;
  const segments = Math.floor(length / segment);
  // Weighted mean square of the K-filtered signal per 100 ms segment,
  // summed across channels. 400 ms / 3 s windows are sums of 4 / 30 of these.
  const power = new Float64Array(segments);
  const factor = sampleRate >= 96000 ? 2 : 4;
  const phases = interpolationPhases(factor);
  let samplePeak = 0;
  let truePeak = 0;
  const total = channels.length * length;

  for (let c = 0; c < channels.length; c++) {
    const x = channels[c];
    const weight = channelWeight(c);
    let s1 = 0, s2 = 0, h1 = 0, h2 = 0; // biquad states (transposed direct form II)
    for (let seg = 0; seg < segments; seg++) {
      let sum = 0;
      const end = (seg + 1) * segment;
      for (let n = seg * segment; n < end; n++) {
        const v = x[n];
        const y1 = shelf.b0 * v + s1;
        s1 = shelf.b1 * v - shelf.a1 * y1 + s2;
        s2 = shelf.b2 * v - shelf.a2 * y1;
        const y2 = hp.b0 * y1 + h1;
        h1 = hp.b1 * y1 - hp.a1 * y2 + h2;
        h2 = hp.b2 * y1 - hp.a2 * y2;
        sum += y2 * y2;

        const a = Math.abs(v);
        if (a > samplePeak) samplePeak = a;
        // Points between n and n+1 are interpolated here. Inter-sample peaks
        // only matter near the top, so skip the costly part while both
        // neighbors are 6 dB+ below the current max.
        if (Math.max(a, Math.abs(x[n + 1] ?? 0)) > truePeak * 0.5 && n >= HALF - 1 && n + HALF < length) {
          for (const taps of phases) {
            let acc = 0;
            for (let i = 0; i < TAPS; i++) acc += taps[i] * x[n - (HALF - 1) + i];
            const abs = Math.abs(acc);
            if (abs > truePeak) truePeak = abs;
          }
        }
        if (a > truePeak) truePeak = a;
      }
      power[seg] += (weight * sum) / segment;
      if (seg % 300 === 0) {
        onProgress?.((c * length + seg * segment) / total);
        await yieldToBrowser();
      }
    }
  }
  onProgress?.(1);

  const windowed = (size: number) => {
    const out: number[] = [];
    let sum = 0;
    for (let i = 0; i < segments; i++) {
      sum += power[i];
      if (i >= size) sum -= power[i - size];
      if (i >= size - 1) out.push(sum / size);
    }
    return out;
  };
  const momentary = windowed(4); // 400 ms blocks, 75 % overlap
  const shortTerm = windowed(30); // 3 s blocks

  // Integrated: absolute gate at -70 LUFS, then a relative gate 10 LU below
  // the loudness of what passed the absolute gate.
  const ABS_GATE = 10 ** ((-70 + 0.691) / 10);
  const gated = (blocks: number[], relativeLU: number) => {
    const aboveAbs = blocks.filter((z) => z > ABS_GATE);
    if (!aboveAbs.length) return [];
    const mean = aboveAbs.reduce((a, b) => a + b, 0) / aboveAbs.length;
    const relGate = mean * 10 ** (relativeLU / 10);
    return aboveAbs.filter((z) => z > relGate);
  };
  const integratedBlocks = gated(momentary, -10);
  const integrated = integratedBlocks.length ? toLufs(integratedBlocks.reduce((a, b) => a + b, 0) / integratedBlocks.length) : -Infinity;

  // LRA: spread between the 10th and 95th percentile of short-term
  // loudness, after a relative gate 20 LU down.
  const lra = gated(shortTerm, -20).map(toLufs).sort((a, b) => a - b);
  const percentile = (p: number) => lra[Math.min(lra.length - 1, Math.max(0, Math.round((p / 100) * (lra.length - 1))))];
  const range = lra.length > 1 ? percentile(95) - percentile(10) : 0;

  const max = (blocks: number[]) => (blocks.length ? toLufs(Math.max(...blocks)) : -Infinity);
  return {
    integrated,
    range,
    maxMomentary: max(momentary),
    maxShortTerm: max(shortTerm),
    samplePeak: toDb(samplePeak),
    truePeak: toDb(truePeak),
  };
}

// Loudness targets streaming services normalize to (their published
// reference levels). Positive gain = the service would play it louder,
// negative = quieter.
export const PLATFORM_TARGETS = [
  { name: "Spotify", lufs: -14 },
  { name: "YouTube", lufs: -14 },
  { name: "Tidal", lufs: -14 },
  { name: "Deezer", lufs: -15 },
  { name: "Apple Music", lufs: -16 },
] as const;

// Min/max per bucket for drawing a waveform; buckets = pixel columns.
export function waveformPeaks(samples: Float32Array, buckets: number) {
  const out = new Float32Array(buckets * 2);
  const size = samples.length / buckets;
  for (let b = 0; b < buckets; b++) {
    let min = 0;
    let max = 0;
    const end = Math.min(samples.length, Math.floor((b + 1) * size));
    for (let i = Math.floor(b * size); i < end; i++) {
      const v = samples[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    out[b * 2] = min;
    out[b * 2 + 1] = max;
  }
  return out;
}
