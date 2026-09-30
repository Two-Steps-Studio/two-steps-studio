// Level/XP curves and loot-drop odds for game design - plus the TSS Discord
// bot's own curve, so community members can see what a level costs.

export type Curve = "tss" | "linear" | "quadratic" | "exponential";
export type CurveParams = { base: number; growth: number };

// The bot (tss-dc-bot/index.js getLevelFromXP) uses
// level = floor(0.1 * sqrt(xp)), i.e. level L starts at (10 * L)^2 XP.
export const TSS_BOT = {
  messageXp: 2, // MESSAGE_XP_REWARD, per message (3 s cooldown)
  voiceXpPerMinute: 3, // VOICE_XP_REWARD
  maxLevel: 100, // auto-roles go up to level 100
} as const;

// Total XP needed to *reach* `level` (level 0 = 0 XP).
export function totalXp(curve: Curve, level: number, { base, growth }: CurveParams): number {
  if (level <= 0) return 0;
  switch (curve) {
    case "tss":
      return (10 * level) ** 2;
    case "linear":
      return base * level;
    case "quadratic":
      return base * level ** 2;
    case "exponential":
      // Each level costs `growth` times the previous one, first level = base.
      return growth === 1 ? base * level : (base * (growth ** level - 1)) / (growth - 1);
  }
}

// Highest level whose threshold `xp` has reached. Every curve is increasing,
// so a binary search works for all of them.
export function levelFromXp(curve: Curve, xp: number, params: CurveParams, maxLevel = 1000): number {
  let lo = 0;
  let hi = maxLevel;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (totalXp(curve, mid, params) <= xp) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

// Time/effort to earn `xp` in the TSS bot: messages or voice minutes.
export function tssEffort(xp: number) {
  return {
    messages: Math.ceil(xp / TSS_BOT.messageXp),
    voiceMinutes: Math.ceil(xp / TSS_BOT.voiceXpPerMinute),
  };
}

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
