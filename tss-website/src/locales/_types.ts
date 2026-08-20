import type pl from "./pl.json";

/**
 * Canonical message shape, derived from the Polish locale.
 * Adding a new locale requires:
 *   1. Drop a new <locale>.json with the same shape.
 *   2. Extend the `Locale` union below.
 *   3. Register a loader in `./index.ts`.
 */
export type Messages = typeof pl;