import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDirectory, "..");
const toolkitRoot = resolve(appRoot, "..");
const DEFAULT_IMAGE_BASE = "https://1835135675.cdn.123clouddisk.com/1835135675/cdn/genshin/UI/";

function readOption(name) {
  const flagIndex = process.argv.indexOf(name);
  return flagIndex >= 0 ? process.argv[flagIndex + 1] : undefined;
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Update the app's regional-specialties data from AnimeGameData.

Usage:
  npm run data:update -- [options]

Options:
  --ref <branch-or-commit>  AnimeGameData revision to sync. Default: main
  --image-base <url>        CDN base URL for UI images.
  --help                    Show this help message.`);
  process.exit(0);
}

const imageBase = readOption("--image-base") ?? process.env.GENSHIN_IMAGE_BASE ?? DEFAULT_IMAGE_BASE;
const ref = readOption("--ref") ?? process.env.GENSHIN_DATA_REF;
const syncer = resolve(toolkitRoot, "scripts/sync/syncAnimeGameData.js");
const exporter = resolve(toolkitRoot, "scripts/export/exportCharacterRegionalSpecialties.js");
const downloader = resolve(toolkitRoot, "scripts/download/downloadRegionalSpecialtyImages.js");
const nativeAssetSync = resolve(appRoot, "scripts/sync-native-assets.mjs");
const source = resolve(toolkitRoot, "data/source/character-regional-specialties-source.json");
const output = resolve(appRoot, "public/data/characters-regional-specialties.json");
const cdnAssets = resolve(toolkitRoot, "cdn-assets/UI");

for (const script of [syncer, exporter, downloader, nativeAssetSync]) {
  if (!existsSync(script)) {
    console.error(`Required data script not found: ${script}`);
    process.exit(1);
  }
}

mkdirSync(dirname(output), { recursive: true });

const syncArgs = [syncer];
if (ref) {
  syncArgs.push("--ref", ref);
}

const syncResult = spawnSync(process.execPath, syncArgs, { stdio: "inherit" });
if (syncResult.status !== 0) {
  process.exit(syncResult.status ?? 1);
}

const exportResult = spawnSync(
  process.execPath,
  [exporter, "--source", source, "--output", output, "--image-base", imageBase],
  { stdio: "inherit" },
);

if (exportResult.status !== 0) {
  process.exit(exportResult.status ?? 1);
}

const downloadResult = spawnSync(
  process.execPath,
  [downloader, "--input", output, "--output", cdnAssets],
  { stdio: "inherit" },
);

if (downloadResult.status !== 0) {
  process.exit(downloadResult.status ?? 1);
}

const assetSyncResult = spawnSync(process.execPath, [nativeAssetSync], {
  stdio: "inherit",
});

process.exit(assetSyncResult.status ?? 1);
