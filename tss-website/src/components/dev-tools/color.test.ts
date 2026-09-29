import { describe, expect, it } from "vitest";
import { contrastRatio, hslToRgb, hsvToRgb, luminance, mix, parseColor, rgbToHsl, rgbToHsv, toHex } from "./color";

describe("parseColor", () => {
  it.each([
    ["#1bbdbd", { r: 27, g: 189, b: 189 }],
    ["1bbdbd", { r: 27, g: 189, b: 189 }],
    ["#fff", { r: 255, g: 255, b: 255 }],
    ["rgb(220, 53, 69)", { r: 220, g: 53, b: 69 }],
  ])("parses %s", (input, expected) => {
    expect(parseColor(input)).toEqual(expected);
  });

  it("rejects garbage", () => {
    expect(parseColor("not a color")).toBeNull();
    expect(parseColor("#12")).toBeNull();
  });
});

describe("conversions", () => {
  it("formats as whole-number hsl", () => {
    expect(rgbToHsl({ r: 173, g: 131, b: 248 })).toEqual({ h: 262, s: 89, l: 74 }); // Records #ad83f8
  });

  // rgbToHsl rounds to whole degrees/percents for display, so a round trip
  // can drift by up to ~3 RGB units per channel. Anything that must keep
  // the exact color (palette base, picker) has to use RGB/HSV, not this.
  it("round-trips hex -> hsl -> rgb within rounding error", () => {
    for (const hex of ["#1bbdbd", "#dc3545", "#ad83f8", "#ffcb2f", "#06e402"]) {
      const rgb = parseColor(hex)!;
      const { h, s, l } = rgbToHsl(rgb);
      const back = hslToRgb(h, s, l);
      for (const ch of ["r", "g", "b"] as const) expect(Math.abs(back[ch] - rgb[ch])).toBeLessThanOrEqual(3);
    }
  });

  it("formats hex", () => {
    expect(toHex({ r: 27, g: 189, b: 189 })).toBe("#1bbdbd");
  });

  it("round-trips rgb -> hsv -> rgb", () => {
    const rgb = { r: 255, g: 203, b: 47 }; // Dev #ffcb2f
    expect(hsvToRgb(rgbToHsv(rgb))).toEqual(rgb);
  });

  it("keeps the given hue for greys instead of snapping to red", () => {
    expect(rgbToHsv({ r: 128, g: 128, b: 128 }, 200).h).toBe(200);
  });
});

describe("contrast", () => {
  it("black on white is 21:1", () => {
    expect(contrastRatio(luminance({ r: 0, g: 0, b: 0 }), luminance({ r: 255, g: 255, b: 255 }))).toBeCloseTo(21, 5);
  });

  it("brand teal on white fails AA for text (~2.3:1)", () => {
    const ratio = contrastRatio(luminance({ r: 27, g: 189, b: 189 }), luminance({ r: 255, g: 255, b: 255 }));
    expect(ratio).toBeCloseTo(2.32, 2);
  });

  it("mix goes from a to b", () => {
    const a = { r: 0, g: 0, b: 0 };
    const b = { r: 200, g: 100, b: 50 };
    expect(mix(a, b, 0)).toEqual(a);
    expect(mix(a, b, 1)).toEqual(b);
  });
});
