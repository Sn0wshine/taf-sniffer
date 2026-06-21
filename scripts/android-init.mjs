import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const npxCommand = isWindows ? "npx.cmd" : "npx";
const quote = (value) => (/[ \t"&|<>]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value);

const run = (command, args) => {
  const result = isWindows
    ? spawnSync([quote(command), ...args.map(quote)].join(" "), { stdio: "inherit", shell: true })
    : spawnSync(command, args, { stdio: "inherit" });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run(npmCommand, ["run", "build"]);

if (!existsSync("android")) {
  run(npxCommand, ["cap", "add", "android"]);
}

run(npxCommand, ["cap", "sync", "android"]);
