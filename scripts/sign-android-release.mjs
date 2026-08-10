import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const signingFile = resolve("src-tauri", "keys", "android-release.properties");
const unsignedApk = resolve(
  "src-tauri",
  "gen",
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "universal",
  "release",
  "app-universal-release-unsigned.apk",
);
const outputDir = resolve("dist-tauri", "android");
const alignedApk = join(outputDir, "app-arm64-release-aligned.apk");
const signedApk = join(outputDir, "特产采集手账_0.1.0_arm64-v8a.apk");

function readProperties(file) {
  const properties = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/);
    if (match) properties[match[1]] = match[2];
  }
  return properties;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32" && command.endsWith(".bat"),
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync(signingFile)) {
  console.error(`未找到 Android 签名配置：${signingFile}`);
  process.exit(1);
}
if (!existsSync(unsignedApk)) {
  console.error(`未找到 arm64 Release APK：${unsignedApk}`);
  process.exit(1);
}

const signing = readProperties(signingFile);
for (const key of ["keystore", "storePassword", "keyAlias", "keyPassword"]) {
  if (!signing[key]) {
    console.error(`签名配置缺少 ${key}`);
    process.exit(1);
  }
}

const keystore = resolve(signing.keystore);
if (!existsSync(keystore)) {
  console.error(`未找到 Android keystore：${keystore}`);
  process.exit(1);
}

const sdk =
  process.env.ANDROID_HOME ??
  process.env.ANDROID_SDK_ROOT ??
  (process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Android", "Sdk"));
const buildToolsDir = sdk && join(sdk, "build-tools");
if (!buildToolsDir || !existsSync(buildToolsDir)) {
  console.error("未找到 Android SDK Build Tools。");
  process.exit(1);
}

const buildTools = readdirSync(buildToolsDir)
  .filter((entry) => existsSync(join(buildToolsDir, entry, "apksigner.bat")))
  .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))[0];
if (!buildTools) {
  console.error("未找到 apksigner。");
  process.exit(1);
}

const zipalign = join(buildToolsDir, buildTools, "zipalign.exe");
const apksigner = join(buildToolsDir, buildTools, "apksigner.bat");
mkdirSync(outputDir, { recursive: true });
rmSync(alignedApk, { force: true });
rmSync(signedApk, { force: true });

run(zipalign, ["-f", "-p", "4", unsignedApk, alignedApk]);
run(apksigner, [
  "sign",
  "--ks",
  keystore,
  "--ks-key-alias",
  signing.keyAlias,
  "--ks-pass",
  `pass:${signing.storePassword}`,
  "--key-pass",
  `pass:${signing.keyPassword}`,
  "--out",
  signedApk,
  alignedApk,
]);
run(apksigner, ["verify", "--verbose", "--print-certs", signedApk]);
rmSync(alignedApk, { force: true });
console.log(`已签名：${basename(signedApk)}`);
