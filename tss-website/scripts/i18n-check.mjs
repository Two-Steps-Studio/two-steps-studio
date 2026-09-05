// Verifies src/locales/{pl,en,de}.json all define exactly the same set of
// keys (nested objects flattened to dot paths). Referenced by
// src/app/translations/page.tsx's "how to add a translation" instructions
// as `npm run i18n:check` - the script itself never existed until now.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, "..", "src", "locales");
const LOCALES = ["pl", "en", "de"];
// pl.json is the reference locale - src/app/translations/page.tsx's step 1
// tells contributors to add new keys there first.
const REFERENCE_LOCALE = "pl";

function flatten(obj, prefix = "") {
  let keys = [];
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys = keys.concat(flatten(value, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

const keysByLocale = {};
for (const locale of LOCALES) {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  const raw = fs.readFileSync(filePath, "utf-8");
  keysByLocale[locale] = new Set(flatten(JSON.parse(raw)));
}

const referenceKeys = keysByLocale[REFERENCE_LOCALE];
let hasMismatch = false;

for (const locale of LOCALES) {
  if (locale === REFERENCE_LOCALE) continue;
  const localeKeys = keysByLocale[locale];

  const missing = [...referenceKeys].filter((k) => !localeKeys.has(k));
  const extra = [...localeKeys].filter((k) => !referenceKeys.has(k));

  if (missing.length > 0) {
    hasMismatch = true;
    console.error(`\n[i18n-check] ${locale}.json is missing ${missing.length} key(s) present in ${REFERENCE_LOCALE}.json:`);
    missing.forEach((k) => console.error(`  - ${k}`));
  }
  if (extra.length > 0) {
    hasMismatch = true;
    console.error(`\n[i18n-check] ${locale}.json has ${extra.length} extra key(s) not in ${REFERENCE_LOCALE}.json:`);
    extra.forEach((k) => console.error(`  - ${k}`));
  }
}

if (hasMismatch) {
  console.error("\n[i18n-check] FAILED - locale files are out of sync.\n");
  process.exit(1);
}

console.log(`[i18n-check] OK - ${LOCALES.join("/")} all define ${referenceKeys.size} matching keys.`);
