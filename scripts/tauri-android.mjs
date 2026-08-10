import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const env = { ...process.env };
const localAppData = env.LOCALAPPDATA;
const programFiles = env.ProgramFiles ?? "C:\\Program Files";

const sdk =
  env.ANDROID_HOME ??
  env.ANDROID_SDK_ROOT ??
  (localAppData ? join(localAppData, "Android", "Sdk") : undefined);

if (!sdk || !existsSync(sdk)) {
  console.error("未找到 Android SDK，请设置 ANDROID_HOME。");
  process.exit(1);
}

const bundledJdk = join(programFiles, "Android", "Android Studio", "jbr");
const javaHome = env.JAVA_HOME ?? (existsSync(bundledJdk) ? bundledJdk : undefined);

if (!javaHome || !existsSync(javaHome)) {
  console.error("未找到 JDK，请设置 JAVA_HOME，或安装带 JBR 的 Android Studio。");
  process.exit(1);
}

const ndkRoot = join(sdk, "ndk");
const installedNdks = existsSync(ndkRoot)
  ? readdirSync(ndkRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) =>
        right.localeCompare(left, undefined, { numeric: true }),
      )
  : [];
const ndkHome =
  env.NDK_HOME ??
  env.ANDROID_NDK_HOME ??
  (installedNdks[0] ? join(ndkRoot, installedNdks[0]) : undefined);

if (!ndkHome || !existsSync(ndkHome)) {
  console.error("未找到 Android NDK，请设置 NDK_HOME 或通过 Android Studio 安装 NDK。");
  process.exit(1);
}

env.JAVA_HOME = javaHome;
env.ANDROID_HOME = sdk;
env.ANDROID_SDK_ROOT = sdk;
env.NDK_HOME = ndkHome;
env.ANDROID_NDK_HOME = ndkHome;
env.Path = [
  join(javaHome, "bin"),
  join(sdk, "platform-tools"),
  join(sdk, "cmdline-tools", "latest", "bin"),
  join(sdk, "emulator"),
  env.Path,
]
  .filter(Boolean)
  .join(";");

const tauriCli = resolve("node_modules", "@tauri-apps", "cli", "tauri.js");
const androidCommand = process.argv[2];
const iconSyncScript = resolve("scripts", "sync-android-icons.mjs");

function syncAndroidIcons() {
  const syncResult = spawnSync(process.execPath, [iconSyncScript], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
  if (syncResult.status !== 0) {
    process.exit(syncResult.status ?? 1);
  }
}

if (androidCommand !== "init") {
  syncAndroidIcons();
}

const result = spawnSync(
  process.execPath,
  [tauriCli, "android", ...process.argv.slice(2)],
  { cwd: process.cwd(), env, stdio: "inherit" },
);

if (result.error) {
  console.error(result.error.message);
}

if (result.status === 0 && androidCommand === "init") {
  syncAndroidIcons();
}

process.exit(result.status ?? 1);
