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

const requestedRoot = readOption("--root");
const imageBase = readOption("--image-base") ?? process.env.GENSHIN_IMAGE_BASE ?? DEFAULT_IMAGE_BASE;
const genshinDbRoot = resolve(appRoot, requestedRoot ?? "../genshin-db");
const exporter = resolve(toolkitRoot, "scripts/export/exportCharacterRegionalSpecialties.js");
const output = resolve(appRoot, "public/data/characters-regional-specialties.json");

if (!existsSync(genshinDbRoot)) {
  console.error(`genshin-db directory not found: ${genshinDbRoot}`);
  console.error("Use: npm run data:update -- --root <path-to-genshin-db> [--image-base <cdn-url>]");
  process.exit(1);
}

if (!existsSync(exporter)) {
  console.error(`Exporter not found: ${exporter}`);
  process.exit(1);
}

mkdirSync(dirname(output), { recursive: true });

const result = spawnSync(
  process.execPath,
  [exporter, "--root", genshinDbRoot, "--output", output, "--image-base", imageBase],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
