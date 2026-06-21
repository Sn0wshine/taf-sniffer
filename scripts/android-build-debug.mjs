import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const npxCommand = isWindows ? "npx.cmd" : "npx";
const gradleWrapper = join("android", isWindows ? "gradlew.bat" : "gradlew");
const apkPath = join("android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const localJdk21 = join(".jdk", "jdk-21.0.11+10");

const quote = (value) => (/[ \t"&|<>]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value);
const run = (command, args, options = {}) => {
  const result = isWindows
    ? spawnSync([quote(command), ...args.map(quote)].join(" "), { stdio: "inherit", shell: true, ...options })
    : spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const commandExists = (command) => {
  const lookup = isWindows ? "where.exe" : "which";
  const result = isWindows
    ? spawnSync(`${quote(lookup)} ${quote(command)}`, { encoding: "utf8", shell: true })
    : spawnSync(lookup, [command], { encoding: "utf8" });
  return result.status === 0;
};

const readLocalSdk = () => {
  const file = join("android", "local.properties");
  if (!existsSync(file)) return "";
  const content = readFileSync(file, "utf8");
  const match = content.match(/^sdk\.dir=(.+)$/m);
  if (!match) return "";
  return match[1].trim().replace(/\\:/g, ":").replace(/\\\\/g, "\\");
};

const sdkPath = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || readLocalSdk();
const sdkLooksConfigured = Boolean(sdkPath) && existsSync(resolve(sdkPath));

if (existsSync(localJdk21)) {
  const javaHome = resolve(localJdk21);
  process.env.JAVA_HOME = javaHome;
  process.env.PATH = `${join(javaHome, "bin")}${isWindows ? ";" : ":"}${process.env.PATH || ""}`;
}

console.log("Taf Sniffer - build APK debug Android");
console.log("");

if (!existsSync("android")) {
  console.error("Dossier android manquant. Lance d'abord npm.cmd run android:init.");
  process.exit(1);
}

if (!existsSync(gradleWrapper)) {
  console.error(`Gradle wrapper manquant : ${gradleWrapper}`);
  process.exit(1);
}

if (!sdkLooksConfigured) {
  console.error("Android SDK non configure : impossible de produire un APK debug.");
  console.error("Installe Android Studio ou configure ANDROID_HOME / ANDROID_SDK_ROOT.");
  console.error("Alternative : cree android/local.properties avec sdk.dir=C:\\\\chemin\\\\vers\\\\Android\\\\Sdk");
  console.error(`APK attendu apres configuration : ${apkPath}`);
  process.exit(1);
}

if (!commandExists("java")) {
  console.error("Java est introuvable. Java 21 est requis pour le build Android.");
  process.exit(1);
}

run(npmCommand, ["run", "build"]);
run(npxCommand, ["cap", "sync", "android"]);
run(isWindows ? ".\\gradlew.bat" : "./gradlew", ["assembleDebug"], { cwd: "android" });

console.log("");
if (existsSync(apkPath)) {
  console.log(`APK debug genere : ${apkPath}`);
} else {
  console.log(`Build termine, mais APK non trouve au chemin attendu : ${apkPath}`);
}
