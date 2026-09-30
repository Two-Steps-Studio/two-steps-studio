// Bars <-> time at a tempo, and note name <-> frequency.

// Seconds for `bars` bars of `beatsPerBar` beats at `bpm` (beats per minute).
export const barsToSeconds = (bars: number, bpm: number, beatsPerBar: number) => (bars * beatsPerBar * 60) / bpm;
export const secondsToBars = (seconds: number, bpm: number, beatsPerBar: number) => (seconds * bpm) / (60 * beatsPerBar);

// "1:30", "1:30.5", "90", "90.25" -> seconds.
export function parseDuration(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  const clock = s.match(/^(\d+):([0-5]?\d(?:\.\d+)?)$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  if (/^\d+(?:\.\d+)?$/.test(s)) return Number(s);
  return null;
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

const LETTERS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11, H: 11 };

// "A4", "C#3", "Eb2", "bb1" - letters C-B (and German/Polish H = B), with
// # / b (or ♯ / ♭) accidentals. Octave numbering as in scientific pitch (C4 = MIDI 60).
export function noteToMidi(raw: string): number | null {
  const m = raw.trim().match(/^([A-Ha-h])(#{1,2}|b{1,2}|♯|♭)?(-?\d)$/);
  if (!m) return null;
  const letter = m[1].toUpperCase();
  if (!(letter in LETTERS)) return null;
  const acc = m[2] ?? "";
  const shift = acc.startsWith("#") || acc === "♯" ? acc.length || 1 : acc.startsWith("b") || acc === "♭" ? -(acc.length || 1) : 0;
  const midi = (Number(m[3]) + 1) * 12 + LETTERS[letter] + shift;
  return midi >= 0 && midi <= 127 ? midi : null;
}

export const SPEED_OF_SOUND = 343; // m/s in air at 20 °C
