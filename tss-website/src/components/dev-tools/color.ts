export type RGB = { r: number; g: number; b: number };
// h: 0-360, s/v: 0-1. Pickers keep HSV as their source of truth because hue
// is undefined for greys - round-tripping through RGB would snap the hue
// back to red the moment a color passed through grey or black.
export type HSV = { h: number; s: number; v: number };

// The site's own section colors (globals.css / CLAUDE.md theme table).
export const BRAND_SWATCHES = [
  { name: "General", hex: "#1bbdbd" },
  { name: "Games", hex: "#dc3545" },
  { name: "Records", hex: "#ad83f8" },
  { name: "Dev", hex: "#ffcb2f" },
  { name: "E-Sport", hex: "#06e402" },
  { name: "White", hex: "#ffffff" },
  { name: "Black", hex: "#000000" },
];

export const toHex =({ r, g, b }: RGB) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

export function hslToRgb(h: number, s: number, l: number): RGB {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

export function rgbToHsl({ r, g, b }: RGB) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: Math.round(l * 100) };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  h = Math.round(h * 60);
  return { h: h < 0 ? h + 360 : h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hsvToRgb({ h, s, v }: HSV): RGB {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return { r: Math.round(f(5) * 255), g: Math.round(f(3) * 255), b: Math.round(f(1) * 255) };
}

export function rgbToHsv({ r, g, b }: RGB, fallbackHue = 0): HSV {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const d = max - Math.min(rn, gn, bn);
  let h = fallbackHue;
  if (d !== 0) {
    h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

// Accepts #rgb, #rrggbb, rgb()/rgba() and hsl()/hsla(), comma or space separated.
export function parseColor(raw: string): RGB | null {
  const s = raw.trim().toLowerCase();
  const hex = s.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const full = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
  }
  const rgb = s.match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/);
  if (rgb) {
    const [r, g, b] = rgb.slice(1, 4).map(Number);
    return [r, g, b].every((v) => v <= 255) ? { r, g, b } : null;
  }
  const hsl = s.match(/^hsla?\(\s*(\d{1,3}(?:\.\d+)?)(?:deg)?\s*[, ]\s*(\d{1,3}(?:\.\d+)?)%\s*[, ]\s*(\d{1,3}(?:\.\d+)?)%/);
  if (hsl) {
    const [h, sat, l] = hsl.slice(1, 4).map(Number);
    return sat <= 100 && l <= 100 ? hslToRgb(h % 360, sat, l) : null;
  }
  return null;
}

// WCAG 2.x relative luminance and contrast ratio.
export function luminance({ r, g, b }: RGB) {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

export const contrastRatio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

// Linear sRGB-space mix, t=0 -> a, t=1 -> b. Good enough for tint/shade
// scales; not perceptually uniform, which is fine for a quick palette.
export const mix = (a: RGB, b: RGB, t: number): RGB => ({
  r: Math.round(a.r + (b.r - a.r) * t),
  g: Math.round(a.g + (b.g - a.g) * t),
  b: Math.round(a.b + (b.b - a.b) * t),
});
