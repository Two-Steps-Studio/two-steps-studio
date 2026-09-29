import { encode } from "uqr";
import { describe, expect, it } from "vitest";
import { modulesPath, qrSvg, wifiPayload } from "./qr";

describe("wifiPayload", () => {
  it("builds the standard format", () => {
    expect(wifiPayload({ ssid: "TSS LAN", password: "haslo123", security: "WPA", hidden: false })).toBe("WIFI:T:WPA;S:TSS LAN;P:haslo123;;");
  });

  it("escapes special characters", () => {
    expect(wifiPayload({ ssid: 'a;b,c:d"e\\f', password: "p;w", security: "WPA", hidden: true })).toBe('WIFI:T:WPA;S:a\\;b\\,c\\:d\\"e\\\\f;P:p\\;w;H:true;;');
  });

  it("omits the password for open networks", () => {
    expect(wifiPayload({ ssid: "Open", password: "ignored", security: "nopass", hidden: false })).toBe("WIFI:T:nopass;S:Open;;");
  });
});

describe("svg", () => {
  it("draws one square per dark module", () => {
    const qr = encode("https://twostepsstudio.pl", { ecc: "M", border: 4 });
    const dark = qr.data.flat().filter(Boolean).length;
    expect(modulesPath(qr.data).match(/M/g)?.length).toBe(dark);
    // 4-module quiet zone on every side.
    expect(qr.data[0].every((v) => !v)).toBe(true);
    expect(qr.data.every((row) => row.slice(0, 4).every((v) => !v))).toBe(true);
  });

  it("uses the given colors and size", () => {
    const svg = qrSvg([[true, false], [false, true]], "#000000", "#ffffff");
    expect(svg).toContain('viewBox="0 0 2 2"');
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain('<path d="M0 0h1v1h-1zM1 1h1v1h-1z" fill="#000000"/>');
  });
});
