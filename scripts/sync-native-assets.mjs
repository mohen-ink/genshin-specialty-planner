import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDirectory, "..");
const catalogPath = resolve(
  appRoot,
  "public/data/characters-regional-specialties.json",
);
const sourceDirectory = resolve(appRoot, "../cdn-assets/UI");
const targetDirectory = resolve(appRoot, "native-assets/UI");
const expectedTarget = join("native-assets", "UI");

if (relative(appRoot, targetDirectory) !== expectedTarget) {
  throw new Error(`Refusing to sync into unexpected path: ${targetDirectory}`);
}

if (!existsSync(sourceDirectory)) {
  throw new Error(`CDN asset directory not found: ${sourceDirectory}`);
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
if (!Array.isArray(catalog.characters)) {
  throw new Error("Catalog must contain a characters array.");
}

const filenames = new Set();
for (const character of catalog.characters) {
  for (const filename of [
    character.icon?.filename,
    character.regionalSpecialty?.icon?.filename,
  ]) {
    if (typeof filename !== "string" || !/^[A-Za-z0-9_.-]+$/.test(filename)) {
      throw new Error(`Invalid image filename in catalog: ${filename}`);
    }
    filenames.add(`${filename}.png`);
  }
}

mkdirSync(targetDirectory, { recursive: true });

for (const existingFile of readdirSync(targetDirectory)) {
  if (existingFile.endsWith(".png") && !filenames.has(existingFile)) {
    rmSync(resolve(targetDirectory, existingFile));
  }
}

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
let copiedBytes = 0;
for (const filename of [...filenames].sort()) {
  const sourcePath = resolve(sourceDirectory, filename);
  if (!existsSync(sourcePath)) {
    throw new Error(`Required client image is missing: ${sourcePath}`);
  }

  const contents = readFileSync(sourcePath);
  if (contents.length < pngSignature.length || !contents.subarray(0, 8).equals(pngSignature)) {
    throw new Error(`Required client image is not a valid PNG: ${sourcePath}`);
  }

  copyFileSync(sourcePath, resolve(targetDirectory, filename));
  copiedBytes += contents.length;
}

console.log(
  `Synced ${filenames.size} original PNG files (${copiedBytes} bytes) to ${targetDirectory}`,
);
