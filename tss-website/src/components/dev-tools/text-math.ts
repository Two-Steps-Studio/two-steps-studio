// Regex matching, line diff, number bases and identifier case conversion.

/* ---------------------------------- Regex ----------------------------------- */

export type RegexMatch = { index: number; text: string; groups: (string | undefined)[]; named: Record<string, string | undefined> };

// All matches (capped), or the compile error message. Always iterates with
// the `g` flag so non-global patterns still list every hit, and steps past
// zero-length matches so /a*/ can't loop forever on the same index.
export function findMatches(pattern: string, flags: string, text: string, limit = 500): { matches: RegexMatch[]; truncated: boolean } | { error: string } {
  let re: RegExp;
  try {
    re = new RegExp(pattern, flags.includes("g") ? flags : `${flags}g`);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const matches: RegexMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    matches.push({ index: m.index, text: m[0], groups: m.slice(1), named: { ...(m.groups ?? {}) } });
    if (m[0] === "") re.lastIndex++;
    if (matches.length >= limit) return { matches, truncated: true };
  }
  return { matches, truncated: false };
}

/* ----------------------------------- Diff ----------------------------------- */

export type DiffLine = { type: "same" | "added" | "removed"; text: string };

// Line diff via longest common subsequence. O(n*m) memory, so callers cap
// the input size (a few thousand lines is fine).
export function diffLines(a: string, b: string, ignoreWhitespace = false): DiffLine[] {
  // An empty box is zero lines, not one empty line.
  const left = a === "" ? [] : a.split("\n");
  const right = b === "" ? [] : b.split("\n");
  const key = (s: string) => (ignoreWhitespace ? s.trim().replace(/\s+/g, " ") : s);
  const n = left.length;
  const m = right.length;
  // lcs[i][j] = LCS length of left[i..] and right[j..], flattened.
  const lcs = new Uint32Array((n + 1) * (m + 1));
  const at = (i: number, j: number) => i * (m + 1) + j;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[at(i, j)] = key(left[i]) === key(right[j]) ? lcs[at(i + 1, j + 1)] + 1 : Math.max(lcs[at(i + 1, j)], lcs[at(i, j + 1)]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (key(left[i]) === key(right[j])) {
      out.push({ type: "same", text: right[j] });
      i++;
      j++;
    } else if (lcs[at(i + 1, j)] >= lcs[at(i, j + 1)]) {
      out.push({ type: "removed", text: left[i++] });
    } else {
      out.push({ type: "added", text: right[j++] });
    }
  }
  while (i < n) out.push({ type: "removed", text: left[i++] });
  while (j < m) out.push({ type: "added", text: right[j++] });
  return out;
}

/* ------------------------------- Number bases ------------------------------- */

export type Base = 2 | 8 | 10 | 16;
const DIGITS: Record<Base, RegExp> = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[0-9a-f]+$/ };
const PREFIX: Record<string, Base> = { "0b": 2, "0o": 8, "0x": 16 };

// Parses a non-negative integer of any size (BigInt). A 0x / 0b / 0o prefix
// overrides `base`; "_" and spaces are ignored as digit separators.
export function parseInteger(raw: string, base: Base): bigint | null {
  let s = raw.trim().toLowerCase().replace(/[_\s]/g, "");
  let b = base;
  const prefix = PREFIX[s.slice(0, 2)];
  if (prefix) {
    b = prefix;
    s = s.slice(2);
  }
  if (!s || !DIGITS[b].test(s)) return null;
  const prefixText = b === 2 ? "0b" : b === 8 ? "0o" : b === 16 ? "0x" : "";
  return BigInt(prefixText + s);
}

export const toBase = (n: bigint, base: Base) => n.toString(base).toUpperCase();

/* ----------------------------------- Case ----------------------------------- */

// Splits "helloWorld", "Hello_World-again", "HTTPServer v2" into words.
export function words(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

// Diacritics stripped for identifiers and slugs ("Zażółć" -> "Zazolc"); ł/Ł
// has no decomposition, so it's mapped by hand.
const ascii = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/ł/g, "l").replace(/Ł/g, "L");

export function convertCase(input: string) {
  const w = words(input);
  const a = words(ascii(input));
  return {
    camel: a.map((x, i) => (i === 0 ? x.toLowerCase() : cap(x))).join(""),
    pascal: a.map(cap).join(""),
    snake: a.map((x) => x.toLowerCase()).join("_"),
    constant: a.map((x) => x.toUpperCase()).join("_"),
    kebab: a.map((x) => x.toLowerCase()).join("-"),
    title: w.map(cap).join(" "),
    lower: input.toLowerCase(),
    upper: input.toUpperCase(),
  };
}
