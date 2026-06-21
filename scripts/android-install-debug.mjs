import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const apkPath = join("android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const quote = (value) => (/[ \t"&|<>]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value);

const commandExists = (command) => {
  const lookup = isWindows ? "where.exe" : "which";
  const result = isWindows
    ? spawnSync(`${quote(lookup)} ${quote(command)}`, { encoding: "utf8", shell: true })
    : spawnSync(lookup, [command], { encoding: "utf8" });
  return result.status === 0;
};

if (!existsSync(apkPath)) {
  console.error(`APK debug introuvable : ${apkPath}`);
  console.error("Lance d'abord npm.cmd run android:build:debug apres configuration du SDK Android.");
  process.exit(1);
}

if (!commandExists("adb")) {
  console.error("adb introuvable. Installe Android SDK Platform-Tools et verifie que adb est dans le PATH.");
  process.exit(1);
}

const result = isWindows
  ? spawnSync(`${quote("adb")} install -r ${quote(apkPath)}`, { stdio: "inherit", shell: true })
  : spawnSync("adb", ["install", "-r", apkPath], { stdio: "inherit" });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
