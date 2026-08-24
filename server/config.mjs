import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function readEnvFile(path) {
  if (!existsSync(path)) return {};
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .reduce((acc, line) => {
      const index = line.indexOf("=");
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      acc[key] = value;
      return acc;
    }, {});
}

export const env = { ...readEnvFile(".env"), ...process.env };
export const PORT = Number(env.PORT || env.TAF_SNIFFER_PROXY_PORT || 8787);
export const HOST = env.TAF_SNIFFER_PROXY_HOST || (env.RENDER ? "0.0.0.0" : "127.0.0.1");

export const TOKEN_URL =
  env.FRANCE_TRAVAIL_TOKEN_URL ||
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire";
export const API_BASE = env.FRANCE_TRAVAIL_API_BASE || "https://api.francetravail.io/partenaire/offresdemploi/v2";
export const SEARCH_PATH = env.FRANCE_TRAVAIL_SEARCH_PATH || "/offres/search";
export const SCOPE = env.FRANCE_TRAVAIL_SCOPE || "api_offresdemploiv2 o2dsoffre";

export const GEMINI_MODEL = env.GEMINI_MODEL || "gemini-3.5-flash";
export const GEMINI_RATE_LIMITS = {
  "gemini-3.5-flash": { perMinute: 5, perDay: 20 },
  "gemini-3.1-flash-lite": { perMinute: 15, perDay: 500 },
  "gemini-2.5-flash-lite": { perMinute: 10, perDay: 20 },
};

export const ROOT = process.cwd();
export const DIAGNOSTICS_DIR = join(ROOT, "diagnostics");
export const DIAGNOSTICS_RETENTION_DAYS = Number(env.TAF_SNIFFER_LOG_RETENTION_DAYS || 14);
export const DIAGNOSTICS_ENABLED = env.TAF_SNIFFER_LOGS !== "off";

export const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

export const USER_AGENT =
  env.TAF_SNIFFER_USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 TafSniffer/0.1";

export const USER_AGENTS = [
  USER_AGENT,
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36",
];

export const SOURCE_COOLDOWN_MS = 5 * 60 * 1000;
