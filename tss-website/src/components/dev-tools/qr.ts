// QR payload helpers and SVG rendering on top of uqr's matrix encoder.

export type WifiSecurity = "WPA" | "WEP" | "nopass";

// Wi-Fi join format read by iOS/Android cameras. \ ; , : " must be
// backslash-escaped inside the SSID and password.
const escapeWifi = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");

export function wifiPayload({ ssid, password, security, hidden }: { ssid: string; password: string; security: WifiSecurity; hidden: boolean }) {
  const parts = [`T:${security}`, `S:${escapeWifi(ssid)}`];
  if (security !== "nopass") parts.push(`P:${escapeWifi(password)}`);
  if (hidden) parts.push("H:true");
  return `WIFI:${parts.join(";")};;`;
}

// One path for all dark modules (a 1x1 square each), instead of hundreds of
// <rect>s - smaller file, and it scales without seams between modules.
export function modulesPath(data: boolean[][]) {
  let d = "";
  data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) d += `M${x} ${y}h1v1h-1z`;
    })
  );
  return d;
}

export function qrSvg(data: boolean[][], dark: string, light: string) {
  const size = data.length;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="${light}"/><path d="${modulesPath(data)}" fill="${dark}"/></svg>`;
}
