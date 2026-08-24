import { USER_AGENT, USER_AGENTS } from "../config.mjs";

export const sourceCooldownUntil = new Map();

export const pickUserAgent = (attempt = 0) => USER_AGENTS[attempt % USER_AGENTS.length];

export async function fetchText(url, { userAgent = USER_AGENT } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.6",
      },
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text, finalUrl: response.url || url };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchSearchPage(url) {
  let last = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      last = await fetchText(url, { userAgent: pickUserAgent(attempt) });
      if (last.ok || (last.status !== 403 && last.status !== 429)) return last;
    } catch (error) {
      last = null;
      if (attempt === 1) throw error;
    }
  }
  return last;
}

export function shortNetworkError(error) {
  const raw = String(error?.cause?.code || error?.code || error?.cause || error?.message || error || "erreur réseau");
  if (/EACCES|EPERM|permission|forbidden/i.test(raw)) return "Accès réseau refusé";
  if (/ENOTFOUND|DNS|getaddrinfo/i.test(raw)) return "DNS introuvable";
  if (/ECONNREFUSED/i.test(raw)) return "Connexion refusée";
  if (/ETIMEDOUT|timeout|aborted|AbortError/i.test(raw)) return "Délai dépassé";
  if (/fetch failed/i.test(raw)) return "Connexion impossible";
  return raw.slice(0, 120);
}

export function isNetworkError(error) {
  const raw = String(error?.cause?.code || error?.code || error?.cause || error?.message || error || "");
  return /EACCES|EPERM|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET|AbortError|fetch failed|network|socket|TLS|SSL/i.test(raw);
}

export async function probeUrl(source, url) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.6",
      },
    });
    if (response.body) await response.body.cancel().catch(() => {});
    const durationMs = Date.now() - startedAt;
    const ok = response.ok || (response.status >= 300 && response.status < 500);
    return {
      source,
      url,
      ok,
      status: response.status,
      durationMs,
      message: ok
        ? `${source} joignable (${response.status}).`
        : `${source} répond, mais refuse la lecture (${response.status}).`,
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const label = shortNetworkError(error);
    return {
      source,
      url,
      ok: false,
      durationMs,
      error: label,
      message: `${source} inaccessible : ${label}.`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9_000);
  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json,text/plain,*/*",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.6",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.referer ? { Referer: options.referer } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const text = await response.text();
    if (!response.ok) {
      const error = new Error(`JSON fetch failed (${response.status}).`);
      error.status = response.status;
      error.details = text.slice(0, 300);
      throw error;
    }
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function networkDiagnostics() {
  const probes = [
    { source: "Apec", url: "https://www.apec.fr" },
    { source: "Hellowork", url: "https://www.hellowork.com" },
    { source: "France Travail", url: "https://candidat.francetravail.fr" },
    { source: "Meteojob", url: "https://www.meteojob.com" },
  ];
  const results = await Promise.all(
    probes.map(async ({ source, url }) => {
      const started = Date.now();
      try {
        const page = await probeUrl(url);
        return {
          source,
          url,
          ok: page.ok,
          status: page.status,
          durationMs: Date.now() - started,
          message: page.ok ? "Accessible" : `Statut HTTP ${page.status}`,
        };
      } catch (err) {
        return {
          source,
          url,
          ok: false,
          status: 0,
          durationMs: Date.now() - started,
          error: isNetworkError(err) ? shortNetworkError(err) : "Erreur de connexion",
          message: isNetworkError(err) ? shortNetworkError(err) : "Erreur de connexion",
        };
      }
    }),
  );
  const okCount = results.filter((r) => r.ok).length;
  const status = okCount === results.length ? "ok" : okCount > 0 ? "partial" : "blocked";
  return {
    status,
    message:
      status === "ok"
        ? "Toutes les sources testées répondent normalement."
        : status === "partial"
          ? "Certaines sources sont bloquées ou lentes, d'autres répondent."
          : "Aucune source d'emploi n'a répondu. Vérifiez votre pare-feu ou connexion.",
    sources: results,
  };
}
