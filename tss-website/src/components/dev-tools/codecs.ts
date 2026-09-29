// btoa/atob only handle Latin-1, so text goes through UTF-8 bytes first -
// otherwise "zażółć" throws on encode or comes back as mojibake on decode.
export function encodeBase64(text: string): string {
  let binary = "";
  new TextEncoder().encode(text).forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

// Accepts both standard and URL-safe (base64url, as used in JWTs) input,
// with or without padding. `fatal` makes invalid UTF-8 throw instead of
// silently producing U+FFFD, so the caller can show a real error.
export function decodeBase64(input: string): string {
  const normalized = input.trim().replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
