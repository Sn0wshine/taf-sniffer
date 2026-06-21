import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const apkPath = join("android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const localJdk21 = join(".jdk", "jdk-21.0.11+10");
const quote = (value) => (/[ \t"&|<>]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value);
const spawnRead = (command, args = []) => {
  if (isWindows) {
    return spawnSync([quote(command), ...args.map(quote)].join(" "), { encoding: "utf8", shell: true });
  }
  return spawnSync(command, args, { encoding: "utf8" });
};

const commandExists = (command) => {
  const lookup = isWindows ? "where.exe" : "which";
  const result = spawnRead(lookup, [command]);
  return {
    ok: result.status === 0,
    value: result.stdout.trim().split(/\r?\n/).filter(Boolean).join(" | "),
  };
};

const runVersion = (command, args = ["--version"]) => {
  const result = spawnRead(command, args);
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim().split(/\r?\n/).filter(Boolean);
  return {
    ok: result.status === 0,
    value: output.slice(0, 3).join(" | "),
  };
};

const line = (label, ok, value) => {
  const status = ok ? "OK" : "MANQUANT";
  console.log(`${status.padEnd(8)} ${label}${value ? ` - ${value}` : ""}`);
};

const readLocalSdk = () => {
  const file = join("android", "local.properties");
  if (!existsSync(file)) return "";
  const content = readFileSync(file, "utf8");
  const match = content.match(/^sdk\.dir=(.+)$/m);
  if (!match) return "";
  return match[1].trim().replace(/\\:/g, ":").replace(/\\\\/g, "\\");
};

console.log("Taf Sniffer - diagnostic Android / Capacitor");
console.log("");

line("capacitor.config.ts", existsSync("capacitor.config.ts"));
line("dossier android", existsSync("android"));
line("build web dist", existsSync("dist"));
line("android/local.properties", existsSync(join("android", "local.properties")));
line("Gradle wrapper", existsSync(join("android", isWindows ? "gradlew.bat" : "gradlew")));
line("APK debug", existsSync(apkPath), existsSync(apkPath) ? apkPath : `attendu : ${apkPath}`);

const npxCommand = isWindows ? "npx.cmd" : "npx";
const capVersion = runVersion(npxCommand, ["cap", "--version"]);
line("Capacitor CLI", capVersion.ok, capVersion.value);

const javaVersion = runVersion("java", ["-version"]);
line("Java", javaVersion.ok, javaVersion.value);

const gradleVersion = runVersion("gradle");
line("Gradle", gradleVersion.ok, gradleVersion.value);

const adb = commandExists("adb");
line("adb", adb.ok, adb.value);

const androidHome = process.env.ANDROID_HOME || "";
const androidSdkRoot = process.env.ANDROID_SDK_ROOT || "";
const localSdk = readLocalSdk();
const javaHome = process.env.JAVA_HOME || "";
line("ANDROID_HOME", Boolean(androidHome), androidHome);
line("ANDROID_SDK_ROOT", Boolean(androidSdkRoot), androidSdkRoot);
line("SDK local.properties", Boolean(localSdk), localSdk ? resolve(localSdk) : "");
line("JAVA_HOME", Boolean(javaHome), javaHome);
line("JDK 21 local", existsSync(localJdk21), existsSync(localJdk21) ? resolve(localJdk21) : "");

console.log("");
if (!androidHome && !androidSdkRoot && !localSdk) {
  console.log("Android SDK non configure : le projet Capacitor est pret, mais le build APK/AAB demandera Android Studio ou le SDK Android.");
  console.log("Installe Android Studio ou configure ANDROID_HOME / ANDROID_SDK_ROOT, ou cree android/local.properties avec sdk.dir=...");
} else if (!adb.ok) {
  console.log("Build APK possible avec le SDK detecte. adb est manquant : l'installation automatique sur telephone ne sera pas disponible.");
} else {
  console.log("Environnement Android detecte : tu peux tenter npm.cmd run android:build:debug.");
}
