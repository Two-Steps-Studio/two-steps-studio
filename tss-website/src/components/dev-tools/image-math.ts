// Palette extraction (median cut) and .ico packing - pure functions over
// raw pixel/byte data so they can be tested without a canvas.

import type { RGB } from "./color";

export type Swatch = RGB & { share: number };

// Median-cut style: start with one box holding every (opaque) pixel,
// repeatedly split the box with the widest channel range, then average
// each box. Deterministic, unlike k-means with random seeds, so the same
// image always gives the same palette.
export function extractPalette(rgba: Uint8ClampedArray, count: number): Swatch[] {
  const pixels: number[][] = [];
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue; // skip transparent pixels
    pixels.push([rgba[i], rgba[i + 1], rgba[i + 2]]);
  }
  if (!pixels.length) return [];

  const range = (box: number[][], ch: number) => {
    let min = 255;
    let max = 0;
    for (const p of box) {
      if (p[ch] < min) min = p[ch];
      if (p[ch] > max) max = p[ch];
    }
    return max - min;
  };

  const boxes = [pixels];
  while (boxes.length < count) {
    // Split the box with the largest single-channel spread.
    let best = -1;
    let bestCh = 0;
    let bestRange = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (let ch = 0; ch < 3; ch++) {
        const r = range(box, ch);
        if (r > bestRange) {
          bestRange = r;
          best = i;
          bestCh = ch;
        }
      }
    });
    if (best < 0) break; // every box is a single color
    // Split at the middle of the channel's value range, not at the median
    // pixel: with 75 % teal and 25 % red, a median split lands inside the
    // teal run and averages the rest into a muddy teal-red mix.
    const box = boxes[best].sort((a, b) => a[bestCh] - b[bestCh]);
    const threshold = (box[0][bestCh] + box[box.length - 1][bestCh]) / 2;
    const cut = box.findIndex((p) => p[bestCh] > threshold);
    boxes.splice(best, 1, box.slice(0, cut), box.slice(cut));
  }

  return boxes
    .map((box) => {
      const sum = box.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0]);
      return {
        r: Math.round(sum[0] / box.length),
        g: Math.round(sum[1] / box.length),
        b: Math.round(sum[2] / box.length),
        share: box.length / pixels.length,
      };
    })
    .sort((a, b) => b.share - a.share);
}

// Windows .ico with PNG-compressed entries (supported since Vista and by
// every browser). Layout: 6-byte ICONDIR, 16 bytes per ICONDIRENTRY, then
// the PNG files back to back.
export function buildIco(images: { size: number; png: Uint8Array }[]): Uint8Array {
  const headerSize = 6 + 16 * images.length;
  const total = headerSize + images.reduce((n, img) => n + img.png.length, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type 1 = icon
  view.setUint16(4, images.length, true);
  let offset = headerSize;
  images.forEach((img, i) => {
    const entry = 6 + i * 16;
    view.setUint8(entry, img.size >= 256 ? 0 : img.size); // 0 means 256
    view.setUint8(entry + 1, img.size >= 256 ? 0 : img.size);
    view.setUint8(entry + 2, 0); // palette colors
    view.setUint8(entry + 3, 0); // reserved
    view.setUint16(entry + 4, 1, true); // color planes
    view.setUint16(entry + 6, 32, true); // bits per pixel
    view.setUint32(entry + 8, img.png.length, true);
    view.setUint32(entry + 12, offset, true);
    out.set(img.png, offset);
    offset += img.png.length;
  });
  return out;
}
