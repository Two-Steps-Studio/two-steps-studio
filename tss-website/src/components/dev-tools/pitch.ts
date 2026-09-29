const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Autocorrelation pitch detection (the ACF2+ approach from Chris Wilson's
// PitchDetect): trim the quiet edges, correlate the buffer with itself, take
// the first strong peak after the initial dip, then refine with parabolic
// interpolation. Returns -1 for silence / no clear pitch.
export function detectPitch(input: Float32Array, sampleRate: number): number {
  let rms = 0;
  for (const v of input) rms += v * v;
  if (Math.sqrt(rms / input.length) < 0.01) return -1;

  let start = 0;
  let end = input.length - 1;
  const threshold = 0.2;
  for (let i = 0; i < input.length / 2; i++) if (Math.abs(input[i]) < threshold) { start = i; break; }
  for (let i = 1; i < input.length / 2; i++) if (Math.abs(input[input.length - i]) < threshold) { end = input.length - i; break; }
  const buf = input.slice(start, end);
  const size = buf.length;

  const c = new Float32Array(size);
  for (let lag = 0; lag < size; lag++) {
    let sum = 0;
    for (let j = 0; j < size - lag; j++) sum += buf[j] * buf[j + lag];
    c[lag] = sum;
  }
  let d = 0;
  while (d < size - 1 && c[d] > c[d + 1]) d++;
  let maxVal = -1;
  let maxPos = -1;
  for (let i = d; i < size; i++) if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
  if (maxPos <= 0 || maxPos >= size - 1) return -1;

  const [x1, x2, x3] = [c[maxPos - 1], c[maxPos], c[maxPos + 1]];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  const period = a ? maxPos - b / (2 * a) : maxPos;
  return sampleRate / period;
}

export type Reading = { freq: number; note: string; octave: number; cents: number };

export function toReading(freq: number, a4: number): Reading {
  const semis = 12 * Math.log2(freq / a4);
  const midi = Math.round(semis) + 69;
  const cents = Math.round((semis - Math.round(semis)) * 100);
  return { freq, note: NOTE_NAMES[((midi % 12) + 12) % 12], octave: Math.floor(midi / 12) - 1, cents };
}
