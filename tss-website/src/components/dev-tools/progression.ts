// Loot-drop odds for game design.

/* ------------------------------- Drop chance -------------------------------- */

// Accepts "1/500", "0.2%", "0.2 %" or a plain percent number ("5" = 5 %).
export function parseChance(raw: string): number | null {
  const s = raw.trim().replace(",", ".").replace(/\s+/g, "");
  const frac = s.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (frac) {
    const p = Number(frac[1]) / Number(frac[2]);
    return p > 0 && p <= 1 ? p : null;
  }
  const pct = s.match(/^(\d+(?:\.\d+)?)%?$/);
  if (pct) {
    const p = Number(pct[1]) / 100;
    return p > 0 && p <= 1 ? p : null;
  }
  return null;
}

// Probability of at least one drop in `tries` independent attempts.
export const chanceAtLeastOnce = (p: number, tries: number) => 1 - (1 - p) ** tries;

// Attempts needed to have reached `confidence` probability of >= 1 drop.
export function triesFor(p: number, confidence: number) {
  if (p >= 1) return 1;
  return Math.ceil(Math.log(1 - confidence) / Math.log(1 - p));
}
