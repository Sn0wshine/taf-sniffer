import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { DIAGNOSTICS_DIR, DIAGNOSTICS_ENABLED, DIAGNOSTICS_RETENTION_DAYS, env, GEMINI_MODEL } from "./config.mjs";

export function safeLogText(value, max = 280) {
  return String(value || "")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted-gemini-key]")
    .replace(/Bearer\s+[0-9A-Za-z._-]+/gi, "Bearer [redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function logDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function pruneDiagnostics() {
  if (!DIAGNOSTICS_ENABLED || !Number.isFinite(DIAGNOSTICS_RETENTION_DAYS) || DIAGNOSTICS_RETENTION_DAYS <= 0) return;
  try {
    if (!existsSync(DIAGNOSTICS_DIR)) return;
    const maxAge = Date.now() - DIAGNOSTICS_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const file of readdirSync(DIAGNOSTICS_DIR)) {
      if (!/\.jsonl$/.test(file)) continue;
      const fullPath = join(DIAGNOSTICS_DIR, file);
      if (statSync(fullPath).mtimeMs < maxAge) unlinkSync(fullPath);
    }
  } catch {
    // Diagnostics should never break the app.
  }
}

export function writeDiagnostic(kind, payload = {}) {
  if (!DIAGNOSTICS_ENABLED) return;
  try {
    mkdirSync(DIAGNOSTICS_DIR, { recursive: true });
    const entry = {
      ts: new Date().toISOString(),
      kind,
      ...payload,
    };
    appendFileSync(join(DIAGNOSTICS_DIR, `${logDateKey()}.${kind}.jsonl`), `${JSON.stringify(entry)}\n`, "utf8");
  } catch (error) {
    console.warn(`Diagnostic log skipped: ${safeLogText(error?.message || error)}`);
  }
}

export function diagnosticsFiles() {
  try {
    if (!existsSync(DIAGNOSTICS_DIR)) return [];
    return readdirSync(DIAGNOSTICS_DIR)
      .filter((file) => file.endsWith(".jsonl"))
      .map((file) => {
        const stats = statSync(join(DIAGNOSTICS_DIR, file));
        return {
          file,
          bytes: stats.size,
          updatedAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export function buildDiagnosticsSummary({ geminiModelChain, searchPlanModelChain, geminiUsage, geminiLimitFor }) {
  return {
    ok: true,
    timestamp: new Date().toISOString(),
    enabled: DIAGNOSTICS_ENABLED,
    directory: DIAGNOSTICS_DIR,
    retentionDays: DIAGNOSTICS_RETENTION_DAYS,
    files: diagnosticsFiles(),
    gemini: {
      configured: Boolean(env.GEMINI_API_KEY),
      modelChain: geminiModelChain ? geminiModelChain() : [GEMINI_MODEL],
      searchPlanModelChain: searchPlanModelChain ? searchPlanModelChain() : [GEMINI_MODEL],
      usage: geminiUsage
        ? [...geminiUsage.entries()].map(([model, usage]) => ({
            model,
            dayKey: usage.dayKey,
            dailyCount: usage.dayCount,
            minuteCount: Array.isArray(usage.minuteCalls) ? usage.minuteCalls.length : 0,
            limits: geminiLimitFor ? geminiLimitFor(model) : {},
          }))
        : [],
    },
  };
}
