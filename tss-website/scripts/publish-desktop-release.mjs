#!/usr/bin/env node
/**
 * Publish the built Windows desktop artifacts so /download can offer them.
 *
 *   node scripts/publish-desktop-release.mjs [options]
 *
 * What it does
 *   1. Finds the installer and portable .exe in dist-electron/.
 *   2. Computes size + sha512 for each.
 *   3. Uploads each artifact to the Supabase `desktop-releases` bucket when it
 *      fits under the project's per-object limit, otherwise expects an
 *      already-hosted URL to be passed in (see --installer-url below).
 *   4. Writes latest.json, which /api/desktop/release serves to the page.
 *
 * Options
 *   --installer-url <url>  Use this URL instead of uploading the installer.
 *   --portable-url <url>   Same for the portable build.
 *   --notes <path>         Newline-separated changelog lines (default:
 *                          electron-builder-resources/RELEASE_NOTES.md).
 *   --dry-run              Print what would happen, upload nothing.
 *
 * Credentials come from .env.local / .env: NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY. The service role key must never ship to a client.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIR = path.join(projectRoot, "dist-electron");
const BUCKET = "desktop-releases";
const MANIFEST_NAME = "latest.json";

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === "--dry-run") args.dryRun = true;
    else if (key === "--installer-url") args.installerUrl = argv[++i];
    else if (key === "--portable-url") args.portableUrl = argv[++i];
    else if (key === "--notes") args.notesPath = argv[++i];
    else if (key === "--help" || key === "-h") args.help = true;
  }
  return args;
}

function loadEnv() {
  const env = {};
  for (const file of [".env.local", ".env"]) {
    const full = path.join(projectRoot, file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split("\n")) {
      const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      // First file wins, so .env.local overrides .env.
      if (match && !(match[1] in env)) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

function sha512(filePath) {
  return createHash("sha512").update(fs.readFileSync(filePath)).digest("base64");
}

function formatMb(bytes) {
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function findArtifacts(version) {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error(`${DIST_DIR} does not exist — run \`npm run electron:build:win\` first`);
  }
  const files = fs.readdirSync(DIST_DIR).filter((name) => name.toLowerCase().endsWith(".exe"));
  const pick = (predicate) => files.find(predicate);

  const portable = pick((name) => /portable/i.test(name));
  const installer = pick((name) => !/portable/i.test(name) && !/uninstaller/i.test(name));

  const artifacts = [];
  if (installer) {
    artifacts.push({ kind: "installer", label: "Instalator", filename: installer });
  }
  if (portable) {
    artifacts.push({ kind: "portable", label: "Wersja portable", filename: portable });
  }
  if (artifacts.length === 0) {
    throw new Error(`No .exe found in ${DIST_DIR}`);
  }
  for (const artifact of artifacts) {
    const full = path.join(DIST_DIR, artifact.filename);
    artifact.fullPath = full;
    artifact.sizeBytes = fs.statSync(full).size;
    artifact.storagePath = `windows/${version}/${artifact.filename}`;
  }
  return artifacts;
}

function readNotes(notesPath) {
  const candidate =
    notesPath ?? path.join(projectRoot, "electron-builder-resources", "RELEASE_NOTES.md");
  if (!fs.existsSync(candidate)) return [];
  // Only bullet items become changelog entries; headings and section labels
  // like "**Nowe funkcje:**" are document structure, not release notes.
  return fs
    .readFileSync(candidate, "utf8")
    .split("\n")
    .filter((line) => /^\s*[-*]\s+/.test(line))
    .map((line) => line.replace(/^\s*[-*]\s+/, "").replace(/\*\*/g, "").trim())
    .filter((line) => line.length > 0 && !line.endsWith(":"));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
  const version = pkg.version;
  const artifacts = findArtifacts(version);

  console.log(`Version ${version}`);
  for (const artifact of artifacts) {
    console.log(`  ${artifact.kind.padEnd(9)} ${artifact.filename} (${formatMb(artifact.sizeBytes)})`);
  }

  const env = loadEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  let { data: bucket } = await supabase.storage.getBucket(BUCKET);
  if (!bucket) {
    if (args.dryRun) {
      console.log(`\n[dry-run] would create public bucket "${BUCKET}"`);
    } else {
      const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
      if (error) throw new Error(`Failed to create bucket: ${error.message}`);
      ({ data: bucket } = await supabase.storage.getBucket(BUCKET));
      console.log(`\nCreated public bucket "${BUCKET}"`);
    }
  }
  // A null limit still means the project-wide cap applies; Storage rejects the
  // upload with "exceeded the maximum allowed size" rather than truncating.
  const perObjectLimit = bucket?.file_size_limit ?? null;

  const overrideUrls = { installer: args.installerUrl, portable: args.portableUrl };
  const published = [];

  for (const artifact of artifacts) {
    const override = overrideUrls[artifact.kind];
    if (override) {
      console.log(`\n${artifact.kind}: using provided URL, not uploading`);
      published.push({ ...artifact, url: override });
      continue;
    }

    if (perObjectLimit !== null && artifact.sizeBytes > perObjectLimit) {
      throw new Error(
        `${artifact.filename} is ${formatMb(artifact.sizeBytes)} but the "${BUCKET}" bucket caps ` +
          `objects at ${formatMb(perObjectLimit)}.\n` +
          `Either raise the limit in the Supabase dashboard (Storage -> Settings), or host the ` +
          `file elsewhere and pass --${artifact.kind}-url <url>.`
      );
    }

    if (args.dryRun) {
      console.log(`\n[dry-run] would upload ${artifact.filename} -> ${artifact.storagePath}`);
      published.push({ ...artifact, url: `<${artifact.storagePath}>` });
      continue;
    }

    console.log(`\nUploading ${artifact.filename} (${formatMb(artifact.sizeBytes)})...`);
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(artifact.storagePath, fs.readFileSync(artifact.fullPath), {
        contentType: "application/vnd.microsoft.portable-executable",
        upsert: true,
      });
    if (error) throw new Error(`Upload failed for ${artifact.filename}: ${error.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(artifact.storagePath);
    published.push({ ...artifact, url: data.publicUrl });
    console.log(`  -> ${data.publicUrl}`);
  }

  const manifest = {
    version,
    releasedAt: new Date().toISOString(),
    platform: "windows",
    minimumOs: "Windows 10 lub nowszy (64-bit)",
    notes: readNotes(args.notesPath),
    artifacts: published.map((artifact) => ({
      kind: artifact.kind,
      label: artifact.label,
      filename: artifact.filename,
      sizeBytes: artifact.sizeBytes,
      url: artifact.url,
      sha512: sha512(artifact.fullPath),
    })),
  };

  if (args.dryRun) {
    console.log(`\n[dry-run] manifest that would be written:\n${JSON.stringify(manifest, null, 2)}`);
    return;
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(MANIFEST_NAME, Buffer.from(JSON.stringify(manifest, null, 2)), {
      contentType: "application/json",
      upsert: true,
      cacheControl: "60",
    });
  if (error) throw new Error(`Failed to write ${MANIFEST_NAME}: ${error.message}`);

  console.log(`\nPublished ${MANIFEST_NAME} — /download now serves version ${version}.`);
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
