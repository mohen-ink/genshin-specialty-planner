import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDirectory, "..");
const sourceRoot = resolve(appRoot, "src-tauri/icons/android");
const targetRoot = resolve(appRoot, "src-tauri/gen/android/app/src/main/res");

if (!existsSync(sourceRoot)) {
  throw new Error(`Generated Tauri Android icons were not found: ${sourceRoot}`);
}
if (!existsSync(targetRoot)) {
  throw new Error(`Android project was not initialized: ${targetRoot}`);
}

let copiedFiles = 0;
function copyDirectory(sourceDirectory, targetDirectory) {
  mkdirSync(targetDirectory, { recursive: true });
  for (const entry of readdirSync(sourceDirectory, { withFileTypes: true })) {
    const sourcePath = resolve(sourceDirectory, entry.name);
    const targetPath = resolve(targetDirectory, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      copyFileSync(sourcePath, targetPath);
      copiedFiles += 1;
    }
  }
}

copyDirectory(sourceRoot, targetRoot);
console.log(`Synced ${copiedFiles} Android launcher icon resources.`);
