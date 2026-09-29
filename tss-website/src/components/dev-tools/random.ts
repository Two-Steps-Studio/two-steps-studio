// Unbiased integer in [0, max) from the browser's CSPRNG. Values in the
// top partial bucket are rejected - a plain `n % max` would make the first
// (2^32 % max) results slightly more likely, which matters for passwords
// and is simply wrong for a "fair" dice roll or team draw.
export function randomInt(max: number): number {
  if (max <= 0) throw new RangeError("max must be positive");
  const range = 2 ** 32;
  const limit = range - (range % max);
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % max;
}

// Fisher-Yates on a copy, driven by randomInt so every order is equally likely.
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
