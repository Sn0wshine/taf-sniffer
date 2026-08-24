import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { MIME_TYPES, ROOT } from "./config.mjs";
import { sendText } from "./http.mjs";

export function serveStatic(pathname, res) {
  const requestPath = (pathname === "/" || pathname === "/index.html") && existsSync(join(ROOT, "dist", "index.html"))
    ? "/dist/index.html"
    : pathname.startsWith("/assets/")
      ? `/dist${pathname}`
      : pathname;
  if (requestPath.includes("..") || requestPath.startsWith("/.") || requestPath.includes("/node_modules/")) {
    return false;
  }

  const filePath = normalize(join(ROOT, requestPath));
  if (!filePath.startsWith(ROOT) || !existsSync(filePath)) return false;

  const extension = extname(filePath) || (filePath.endsWith(".webmanifest") ? ".webmanifest" : "");
  const contentType = MIME_TYPES[extension];
  if (!contentType) return false;

  sendText(res, 200, contentType, readFileSync(filePath));
  return true;
}
