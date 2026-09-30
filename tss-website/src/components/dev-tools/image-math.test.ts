import { describe, expect, it } from "vitest";
import { buildIco, extractPalette } from "./image-math";

function image(colors: [number, number, number, number][]) {
  return Uint8ClampedArray.from(colors.flat());
}

describe("extractPalette", () => {
  it("finds the distinct colors and their shares", () => {
    const teal: [number, number, number, number] = [27, 189, 189, 255];
    const red: [number, number, number, number] = [220, 53, 69, 255];
    const px = image([...Array(75).fill(teal), ...Array(25).fill(red)]);
    const palette = extractPalette(px, 2);
    expect(palette).toHaveLength(2);
    expect(palette[0]).toMatchObject({ r: 27, g: 189, b: 189 });
    expect(palette[0].share).toBeCloseTo(0.75, 5);
    expect(palette[1]).toMatchObject({ r: 220, g: 53, b: 69 });
  });

  it("ignores transparent pixels", () => {
    const px = image([...Array(10).fill([0, 0, 0, 0]), ...Array(10).fill([255, 255, 255, 255])]);
    expect(extractPalette(px, 3)).toEqual([{ r: 255, g: 255, b: 255, share: 1 }]);
  });

  it("stops early when there are fewer colors than requested", () => {
    const px = image(Array(20).fill([10, 20, 30, 255]));
    expect(extractPalette(px, 6)).toHaveLength(1);
  });

  it("is deterministic", () => {
    const px = image(Array.from({ length: 500 }, (_, i) => [(i * 37) % 256, (i * 91) % 256, (i * 13) % 256, 255] as [number, number, number, number]));
    expect(extractPalette(px, 5)).toEqual(extractPalette(px, 5));
  });
});

describe("buildIco", () => {
  it("writes a valid header and directory", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([4, 5]);
    const ico = buildIco([
      { size: 16, png: a },
      { size: 256, png: b },
    ]);
    const v = new DataView(ico.buffer);
    expect([v.getUint16(0, true), v.getUint16(2, true), v.getUint16(4, true)]).toEqual([0, 1, 2]);
    // entry 1
    expect(ico[6]).toBe(16);
    expect(v.getUint16(6 + 6, true)).toBe(32);
    expect(v.getUint32(6 + 8, true)).toBe(3);
    expect(v.getUint32(6 + 12, true)).toBe(38); // 6 + 2*16
    // entry 2: 256 is stored as 0
    expect(ico[22]).toBe(0);
    expect(v.getUint32(22 + 12, true)).toBe(41);
    expect(Array.from(ico.slice(38))).toEqual([1, 2, 3, 4, 5]);
  });
});
