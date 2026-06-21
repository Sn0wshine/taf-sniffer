import http from "node:http";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { URL } from "node:url";

const env = { ...readEnvFile(".env"), ...process.env };
const PORT = Number(env.PORT || env.TAF_SNIFFER_PROXY_PORT || 8787);
const HOST = env.TAF_SNIFFER_PROXY_HOST || (env.RENDER ? "0.0.0.0" : "127.0.0.1");
const TOKEN_URL =
  env.FRANCE_TRAVAIL_TOKEN_URL ||
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire";
const API_BASE = env.FRANCE_TRAVAIL_API_BASE || "https://api.francetravail.io/partenaire/offresdemploi/v2";
const SEARCH_PATH = env.FRANCE_TRAVAIL_SEARCH_PATH || "/offres/search";
const SCOPE = env.FRANCE_TRAVAIL_SCOPE || "api_offresdemploiv2 o2dsoffre";
const GEMINI_MODEL = env.GEMINI_MODEL || "gemini-3.5-flash";
const GEMINI_RATE_LIMITS = {
  "gemini-3.5-flash": { perMinute: 5, perDay: 20 },
  "gemini-3.1-flash-lite": { perMinute: 15, perDay: 500 },
  "gemini-2.5-flash-lite": { perMinute: 10, perDay: 20 },
};
const geminiUsage = new Map();
const ROOT = process.cwd();
const DIAGNOSTICS_DIR = join(ROOT, "diagnostics");
const DIAGNOSTICS_RETENTION_DAYS = Number(env.TAF_SNIFFER_LOG_RETENTION_DAYS || 14);
const DIAGNOSTICS_ENABLED = env.TAF_SNIFFER_LOGS !== "off";
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};
const USER_AGENT =
  env.TAF_SNIFFER_USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 TafSniffer/0.1";
const PUBLIC_SOURCES = [
  {
    name: "France Travail",
    searchUrl: (keywords, location) =>
      `https://candidat.francetravail.fr/offres/recherche?motsCles=${encodeURIComponent(keywords)}&lieux=${encodeURIComponent(location)}`,
    linkPatterns: [/href="([^"]*\/offres\/recherche\/detail\/[^"]+)"/gi],
  },
  {
    name: "Hellowork",
    searchUrl: (keywords, location) =>
      `https://www.hellowork.com/fr-fr/emploi/recherche.html?k=${encodeURIComponent(keywords)}&l=${encodeURIComponent(location)}`,
    linkPatterns: [/href="([^"]*\/fr-fr\/emplois\/[^"]+\.html[^"]*)"/gi],
  },
  {
    name: "Indeed",
    searchUrl: (keywords, location) =>
      `https://fr.indeed.com/jobs?q=${encodeURIComponent(keywords)}&l=${encodeURIComponent(location)}`,
    linkPatterns: [/href="([^"]*(?:viewjob\?jk=|rc\/clk\?jk=)[^"]+)"/gi, /data-jk="([^"]+)"/gi],
  },
  {
    name: "LinkedIn",
    searchUrl: (keywords, location) =>
      `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&start=0`,
    linkPatterns: [/href="([^"]*\/jobs\/view\/[^"?]+[^"]*)"/gi, /data-entity-urn="urn:li:jobPosting:(\d+)"/gi],
  },
  {
    name: "Jooble",
    searchUrl: (keywords, location) =>
      `https://fr.jooble.org/SearchResult?ukw=${encodeURIComponent(keywords)}${location ? `&rgns=${encodeURIComponent(location)}` : ""}`,
    linkPatterns: [/href="([^"]*\/desc\/[^"]+)"/gi, /href="([^"]*\/emploi-[^"]+)"/gi],
  },
  {
    name: "Apec",
    searchUrl: (keywords, location) =>
      `https://www.apec.fr/candidat/recherche-emploi.html/emploi?motsCles=${encodeURIComponent(keywords)}${location ? `&lieux=${encodeURIComponent(location)}` : ""}`,
    linkPatterns: [/href="([^"]*\/candidat\/recherche-emploi\.html\/emploi\/detail-offre\/[^"]+)"/gi],
  },
  {
    name: "Meteojob",
    searchUrl: (keywords, location) =>
      `https://www.meteojob.com/jobs?what=${encodeURIComponent(keywords)}${location ? `&where=${encodeURIComponent(location)}` : ""}`,
    linkPatterns: [/href="([^"]*\/candidat\/offres\/offre-d-emploi[^"]+)"/gi, /href="([^"]*\/jobs\/[^"]+)"/gi],
  },
  {
    name: "Welcome to the Jungle",
    searchUrl: (keywords, location) =>
      `https://www.welcometothejungle.com/fr/jobs?query=${encodeURIComponent(keywords)}${location ? `&aroundQuery=${encodeURIComponent(location)}` : ""}`,
    linkPatterns: [/href="([^"]*\/fr\/companies\/[^"]+\/jobs\/[^"]+)"/gi],
  },
  {
    name: "Jobijoba",
    searchUrl: (keywords, location) =>
      `https://www.jobijoba.com/fr/query/?what=${encodeURIComponent(keywords)}${location ? `&where=${encodeURIComponent(location)}` : ""}`,
    linkPatterns: [/href="([^"]*\/fr\/annonce\/[^"]+)"/gi],
  },
  {
    name: "Talent.com",
    searchUrl: (keywords, location) =>
      `https://fr.talent.com/jobs?k=${encodeURIComponent(keywords)}${location ? `&l=${encodeURIComponent(location)}` : ""}`,
    linkPatterns: [/href="([^"]*\/view\?id=[^"]+)"/gi, /href="([^"]*\/jobs\?id=[^"]+)"/gi],
  },
  {
    name: "Optioncarriere",
    searchUrl: (keywords, location) =>
      `https://www.optioncarriere.com/recherche/emplois?s=${encodeURIComponent(keywords)}${location ? `&l=${encodeURIComponent(location)}` : ""}`,
    linkPatterns: [/href="([^"]*\/jobad\/[^"]+)"/gi, /href="([^"]*\/emploi\/[^"]+)"/gi],
  },
];

let tokenCache = null;

function readEnvFile(path) {
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

function safeLogText(value, max = 280) {
  return String(value || "")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted-gemini-key]")
    .replace(/Bearer\s+[0-9A-Za-z._-]+/gi, "Bearer [redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function logDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function pruneDiagnostics() {
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

function writeDiagnostic(kind, payload = {}) {
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

function diagnosticsFiles() {
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

function diagnosticsSummary() {
  return {
    ok: true,
    enabled: DIAGNOSTICS_ENABLED,
    directory: DIAGNOSTICS_DIR,
    retentionDays: DIAGNOSTICS_RETENTION_DAYS,
    files: diagnosticsFiles(),
    gemini: {
      configured: Boolean(env.GEMINI_API_KEY),
      modelChain: geminiModelChain(),
      searchPlanModelChain: searchPlanModelChain(),
      usage: [...geminiUsage.entries()].map(([model, usage]) => ({
        model,
        dayKey: usage.dayKey,
        dailyCount: usage.dayCount,
        minuteCount: Array.isArray(usage.minuteCalls) ? usage.minuteCalls.length : 0,
        limits: geminiLimitFor(model),
      })),
    },
  };
}

function json(res, status, payload) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

async function readRequestJson(req, limit = 1_500_000) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > limit) {
      const error = new Error("Requête trop volumineuse.");
      error.status = 413;
      throw error;
    }
  }
  if (!body.trim()) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("JSON invalide.");
    error.status = 400;
    throw error;
  }
}

function sendText(res, status, contentType, body) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": contentType,
  });
  res.end(body);
}

function configured() {
  return Boolean(env.FRANCE_TRAVAIL_CLIENT_ID && env.FRANCE_TRAVAIL_CLIENT_SECRET);
}

async function getAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.accessToken;

  if (!configured()) {
    const error = new Error("Recherche officielle France Travail indisponible pour l’instant. Taf Sniffer reste utilisable avec l’import manuel.");
    error.code = "missing_credentials";
    throw error;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.FRANCE_TRAVAIL_CLIENT_ID,
    client_secret: env.FRANCE_TRAVAIL_CLIENT_SECRET,
    scope: SCOPE,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Authentification France Travail refusée (${response.status}).`);
    error.code = "auth_failed";
    error.details = text.slice(0, 300);
    throw error;
  }

  const payload = await response.json();
  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Math.max(60, Number(payload.expires_in || 300)) * 1000,
  };
  return tokenCache.accessToken;
}

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function unique(items) {
  return [...new Set(items.map((item) => compact(item)).filter(Boolean))];
}

function geminiModelChain() {
  const fallbackText = env.GEMINI_FALLBACK_MODELS || env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite,gemini-2.5-flash-lite";
  return unique([GEMINI_MODEL, ...String(fallbackText).split(/[,;\s]+/)]);
}

function geminiDayKey(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function geminiUsageFor(model) {
  const dayKey = geminiDayKey();
  const current = geminiUsage.get(model);
  if (current && current.dayKey === dayKey) return current;
  const fresh = { dayKey, dayCount: 0, minuteCalls: [] };
  geminiUsage.set(model, fresh);
  return fresh;
}

function geminiLimitFor(model) {
  return GEMINI_RATE_LIMITS[model] || {
    perMinute: Number(env.GEMINI_DEFAULT_RPM || 5),
    perDay: Number(env.GEMINI_DEFAULT_RPD || 20),
  };
}

function geminiRateLimitError(model, reason, retryAfterSeconds = null) {
  const error = new Error(
    reason === "day"
      ? `Quota quotidien local Gemini atteint pour ${model}. Passage au modèle suivant.`
      : `Limite minute locale Gemini atteinte pour ${model}. Passage au modèle suivant.`,
  );
  error.status = 429;
  error.model = model;
  error.localRateLimit = true;
  error.retryAfterSeconds = retryAfterSeconds;
  return error;
}

function checkGeminiQuota(model) {
  const limit = geminiLimitFor(model);
  const usage = geminiUsageFor(model);
  const now = Date.now();
  usage.minuteCalls = usage.minuteCalls.filter((timestamp) => now - timestamp < 60_000);

  if (usage.dayCount >= limit.perDay) {
    throw geminiRateLimitError(model, "day");
  }
  if (usage.minuteCalls.length >= limit.perMinute) {
    const oldest = Math.min(...usage.minuteCalls);
    const retryAfterSeconds = Math.max(1, Math.ceil((60_000 - (now - oldest)) / 1000));
    throw geminiRateLimitError(model, "minute", retryAfterSeconds);
  }
}

function recordGeminiCall(model) {
  const usage = geminiUsageFor(model);
  usage.dayCount += 1;
  usage.minuteCalls.push(Date.now());
}

function shouldTryNextGeminiModel(error) {
  const status = Number(error?.status || 0);
  const message = String(error?.message || "");
  return (
    status === 429 ||
    status === 404 ||
    status === 503 ||
    /quota|rate|resource_exhausted|not found|not supported|unavailable/i.test(message)
  );
}

function stripAccents(value) {
  return compact(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function normalized(value) {
  return stripAccents(value).toLowerCase();
}

function experienceVariants(target, experienceLevel = "debutant_reconversion") {
  if (experienceLevel === "indifferent") return [];
  if (experienceLevel === "confirme") {
    return [`${target} confirmé`, `${target} senior`, "diagnostiqueur immobilier confirmé", "auditeur énergétique confirmé"];
  }
  if (experienceLevel === "junior") {
    return [
      `${target} junior`,
      `${target} première expérience`,
      "diagnostiqueur immobilier junior",
      "technicien DPE junior",
      "audit énergétique junior",
      "auditeur énergétique junior",
    ];
  }
  return [
    `${target} débutant`,
    `${target} junior`,
    `${target} sans expérience`,
    `${target} reconversion`,
    `${target} formation`,
    `${target} POEI`,
    "diagnostiqueur immobilier débutant",
    "diagnostiqueur immobilier junior",
    "formation diagnostiqueur immobilier",
    "POEI diagnostiqueur immobilier",
    "POE diagnostiqueur immobilier",
    "AFPR diagnostiqueur immobilier",
    "audit énergétique junior",
    "auditeur énergétique junior",
    "rénovation énergétique junior",
  ];
}

function buildKeywordVariants(targetJob, smartSearch = true, experienceLevel = "debutant_reconversion") {
  const target = compact(targetJob) || "diagnostiqueur immobilier";
  const base = [target, stripAccents(target)];
  const text = normalized(target);
  if (!smartSearch) return unique(base);

  const genericVariants = [
    target.replace(/\bimmobilier\b/i, "immo"),
    target.replace(/\bimmo\b/i, "immobilier"),
  ];

  const diagnosticVariants =
    text.includes("diagnost") || text.includes("dpe") || text.includes("immo")
      ? [
          "diagnostiqueur immobilier",
          "diagnostiqueur imobilier",
          "diagnostiqueur immobiliers",
          "diagnostiqueur immo",
          "diagnostic immobilier",
          "technicien diagnostic immobilier",
          "technicien diagnostiqueur immobilier",
          "technicien DPE",
          "DPE",
          "opérateur diagnostic immobilier",
          "operateur diagnostic immobilier",
          "diagnostiqueur immobilier DPE",
          "technicien audit énergétique",
          "conseiller rénovation énergétique",
        ]
      : [];

  const xpVariants = experienceVariants(target, experienceLevel);
  return unique([...base, ...xpVariants, ...genericVariants, ...diagnosticVariants, ...xpVariants.map(stripAccents), ...diagnosticVariants.map(stripAccents)]).slice(0, 28);
}

function buildLocationVariants(location, smartLocation = true) {
  const value = compact(location);
  const text = normalized(value);
  if (!value || text === "toute la france" || text === "france entiere") return [""];
  if (!smartLocation) return unique([value]);

  const idfAliases = ["ile-de-france", "ile de france", "idf", "region parisienne", "paris", "75"];
  if (idfAliases.some((alias) => text.includes(normalized(alias)))) {
    return unique([
      value,
      "Île-de-France",
      "Région parisienne",
      "Paris",
      "75",
      "Hauts-de-Seine",
      "92",
      "Seine-Saint-Denis",
      "93",
      "Val-de-Marne",
      "94",
      "Yvelines",
      "78",
      "Essonne",
      "91",
      "Val-d'Oise",
      "95",
      "Seine-et-Marne",
      "77",
    ]);
  }

  return unique([value, stripAccents(value)]);
}

function buildQueryPairs(keywords, locations) {
  const mainLocation = locations[0] || "";
  const pairs = [
    ...keywords.slice(0, 4).map((keyword) => ({ keywords: keyword, location: mainLocation })),
    ...locations.slice(1, 5).map((location) => ({ keywords: keywords[0], location })),
  ];
  return pairs.filter((pair, index, list) =>
    list.findIndex((item) => item.keywords === pair.keywords && item.location === pair.location) === index,
  );
}

function hasPoeiSignal(value) {
  const text = normalized(value);
  return (
    /\bpoei\b/.test(text) ||
    /\bpoec\b/.test(text) ||
    /\bpoeic\b/.test(text) ||
    /\bpoe\b/.test(text) ||
    /\bafpr\b/.test(text) ||
    /\bpoei\s+individuelle\b/.test(text) ||
    /\bpoe\s+collective\b/.test(text) ||
    /\bpoei\s+collective\b/.test(text) ||
    /\bpreparations?\s+operationnelles?\s+(?:(?:a|pour)\s+l(?:'|’|\s)?)?emploi\b/.test(text) ||
    /\bpreparations?\s+operationnelles?\s+(?:a\s+)?l(?:'|’|\s)?emploi\s+individuelles?\b/.test(text) ||
    /\bactions?\s+de\s+formations?\s+prealables?\s+au\s+recrutement\b/.test(text) ||
    /\bformations?\s+prealables?\s+au\s+recrutement\b/.test(text) ||
    /\bformations?\s+de\s+preparations?\b/.test(text) ||
    /\bformations?\s+(?:avant|prealables?\s+avant)\s+(?:embauche|recrutement)\b/.test(text)
  );
}

function hasPoeiEquivalentSignal(value) {
  const text = normalized(value);
  return (
    text.includes("formation assuree par nos soins") ||
    text.includes("formation assuree") ||
    text.includes("formation prise en charge") ||
    text.includes("formation financee") ||
    text.includes("formation payee") ||
    text.includes("formation gratuite") ||
    text.includes("formation offerte") ||
    text.includes("formation interne") ||
    text.includes("parcours certifiant") ||
    text.includes("parcours qualifiant") ||
    text.includes("financement opco") ||
    text.includes("financement france travail") ||
    text.includes("financement pole emploi") ||
    text.includes("abondement cpf") ||
    text.includes("certification prise en charge") ||
    text.includes("certifications prises en charge") ||
    text.includes("nous vous formons") ||
    text.includes("nous formons") ||
    text.includes("debutant accepte formation") ||
    text.includes("formation debutant") ||
    text.includes("formation employeur")
  );
}

function hasPoeiOrEquivalentSignal(value) {
  return hasPoeiSignal(value) || hasPoeiEquivalentSignal(value);
}

function hasAuditSignal(value) {
  const text = normalized(value);
  return (
    text.includes("audit energetique") ||
    text.includes("auditeur energetique") ||
    text.includes("renovation energetique") ||
    text.includes("conseil travaux") ||
    text.includes("dpe avec mention")
  );
}

function applyRequiredTerms(keyword, requiredPoei, requiredAudit) {
  const terms = [];
  if (requiredPoei && !hasPoeiOrEquivalentSignal(keyword)) terms.push("POEI");
  if (requiredAudit && !hasAuditSignal(keyword)) terms.push("audit énergétique");
  return compact([keyword, ...terms].join(" "));
}

function expandRequiredTerms(keyword, requiredPoei, requiredAudit, smartSearch) {
  let variants = [compact(keyword)];
  if (requiredPoei && !hasPoeiOrEquivalentSignal(keyword)) {
    const poeiTerms = smartSearch
      ? [
          "POEI",
          "POEI individuelle",
          "POEC",
          "POE collective",
          "POEIC",
          "POE",
          "AFPR",
          "preparation operationnelle emploi",
          "preparation operationnelle collective",
          "formation prealable recrutement",
          "formation avant embauche",
          "formation de preparation",
          "formation prise en charge",
          "formation financee",
          "financement France Travail",
          "financement OPCO",
          "certification prise en charge",
          "formation assurée",
          "formation assuree",
          "formation assurée par nos soins",
          "formation interne",
          "débutant accepté formation",
          "nous vous formons",
        ]
      : ["POEI"];
    variants = variants.flatMap((variant) => poeiTerms.map((term) => compact(`${variant} ${term}`)));
  }
  if (requiredAudit && !hasAuditSignal(keyword)) {
    const auditTerms = smartSearch ? ["audit energetique", "renovation energetique", "DPE mention"] : ["audit energetique"];
    variants = variants.flatMap((variant) => auditTerms.map((term) => compact(`${variant} ${term}`)));
  }
  return variants.map((variant) => applyRequiredTerms(variant, requiredPoei, requiredAudit));
}

function matchesRequiredSignals(job, requiredPoei, requiredAudit) {
  const text = job?.rawText || "";
  if (requiredPoei && !hasPoeiOrEquivalentSignal(text)) return false;
  if (requiredAudit && !hasAuditSignal(text)) return false;
  return true;
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(value) {
  return decodeHtml(
    String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return compact(decodeHtml(match[1]));
  }
  return "";
}

function cleanExtractedValue(value) {
  return compact(
    stripHtml(value)
      .replace(/\\u002F/g, "/")
      .replace(/\\"/g, '"')
      .replace(/\s+["']?\s*(?:name|content|class|id|property|data-[\w-]+)=["'][^"']*["'].*$/i, " ")
      .replace(/["']\s*>?\s*$/g, "")
      .replace(/\b(\d+)\.0\b/g, "$1"),
  );
}

function looksLikeJobBoardDomain(value) {
  const text = normalized(value);
  return (
    /\b(?:www\.)?[\w-]+\.(?:com|fr|net|org)\b/i.test(value) ||
    ["hellowork", "indeed", "linkedin", "france travail", "pole emploi", "pôle emploi", "apec"].some((term) => text.includes(normalized(term)))
  );
}

function cleanCompanyValue(value) {
  const clean = cleanExtractedValue(value)
    .replace(/^chez\s+/i, "")
    .replace(/\s*[-|]\s*(?:recrutement|emploi|jobs?).*$/i, "")
    .replace(/\s+(?:\d+\s*(?:à|a|-|\?)\s*\d+|\d+)\s+salari\S*s?.*$/i, "")
    .slice(0, 90);
  const text = normalized(clean);
  if (!clean || looksLikeJobBoardDomain(clean) || text.includes("entreprise non precise") || /^employeur$/.test(text) || /^(?:\d+\s*(?:a|-|\?)\s*\d+|\d+)\s+salar/.test(text)) return "";
  return clean;
}

function companyFromEmployerBlock(value) {
  const lines = String(value || "")
    .split(/\r?\n/)
    .map((line) => cleanExtractedValue(line))
    .filter(Boolean);

  for (let index = 0; index < lines.length; index += 1) {
    if (normalized(lines[index]) === "employeur") {
      const candidate = cleanCompanyValue(lines[index + 1] || "");
      if (candidate) return candidate;
    }
  }

  const compact = cleanExtractedValue(value);
  const match = compact.match(
    /(?:^|\b)Employeur\s+(.+?)(?=\s+(?:\d+\s*(?:à|a|-|\?)\s*\d+|\d+)\s+salari\S*s?\b|\s+Postuler\b|\s+Contacter\b|\s+Informations?\b|\s+Actualis[ée]\b|$)/i,
  );
  return match ? cleanCompanyValue(match[1]) : "";
}

function companyFromNarrative(value) {
  const clean = cleanExtractedValue(value);
  const match = clean.match(
    /(?:Pourquoi rejoindre|rejoindre)\s+([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ0-9&' .-]{2,70})\s*\?|Depuis\s+plus\s+de\s+\d+\s+ans,\s+([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ0-9&' .-]{2,70})\s+s['’]impose/i,
  );
  return match ? cleanCompanyValue(match[1] || match[2]) : "";
}

function featureValueAfterIcon(html, iconClass) {
  const escapedIcon = iconClass.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const direct = firstMatch(html, [
    new RegExp(`<div[^>]+class=["'][^"']*permalink-info[^"']*["'][^>]*>[\\s\\S]{0,240}<span[^>]+class=["'][^"']*${escapedIcon}[^"']*["'][^>]*><\\/span>([\\s\\S]{1,180}?)<\\/div>`, "i"),
    new RegExp(`<span[^>]+class=["'][^"']*feature[^"']*["'][^>]*>[\\s\\S]{0,260}<span[^>]+class=["'][^"']*${escapedIcon}[^"']*["'][^>]*><\\/span>[\\s\\S]{0,140}<span[^>]*>([\\s\\S]{1,180}?)<\\/span>`, "i"),
  ]);
  return cleanExtractedValue(direct);
}

function companyFromSourceHtml(source, html) {
  if (normalized(source).includes("jobijoba")) {
    return cleanCompanyValue(featureValueAfterIcon(html, "icon-apartment")) || companyFromNarrative(html);
  }
  return "";
}

function departmentCityFrom(value) {
  const clean = cleanExtractedValue(value);
  const match = clean.match(/\b(\d{2,3})\s*-\s*([A-Z\u00C0-\u017F][A-Za-z\u00C0-\u017F0-9' -]{2,80}?)(?=\s*(?:-\s*(?:Localiser|[A-Z0-9]{5,})|\||Actualis|CDI|CDD|Alternance|Int[\u00E9e]rim|Contrat|Temps|Salaire|$))/i);
  return match ? `${match[1]} - ${compact(match[2])}` : "";
}

function postalCityFrom(value) {
  const clean = cleanExtractedValue(value);
  const match = clean.match(/\b(\d{5})\s+([A-Z\u00C0-\u017F][A-Za-z\u00C0-\u017F0-9' -]{2,80}?)(?=\s*(?:-\s*Localiser|\||Actualis|CDI|CDD|Alternance|Int[\u00E9e]rim|Contrat|Temps|Salaire|$))/i);
  return match ? `${match[1]} ${compact(match[2])}` : "";
}

function cleanSalaryValue(value) {
  const cleaned = cleanExtractedValue(value)
    .replace(/\s+-\s+\d{2,3}\s+-\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ' -]{2,60}(?:\s+-\s+[\w-]+)?$/i, "")
    .replace(/\s+-\s+\d{2,3}\s+-\s+.+$/i, "");
  const compacted = compact(cleaned).slice(0, 160);
  const text = normalized(compacted);
  const technicalNoise = [
    '","',
    '":',
    "{",
    "}",
    "permis-et-certifications",
    "profil recherche",
    "infos entreprise",
    "infos complementaires",
    "étape",
    "etape",
    "renseigne",
  ];
  if (!compacted || text.includes("non indique")) return "";
  if (technicalNoise.some((term) => text.includes(normalized(term)))) return "";
  if (!/\d/.test(compacted) && !["selon profil", "a negocier", "à négocier", "smic", "non plafonne", "non plafonnée"].some((term) => text.includes(normalized(term)))) {
    return "";
  }
  if (!/\d/.test(compacted) && !hasSalaryWords(text)) return "";
  return compacted;
}

function salaryKindFromText(value) {
  const text = normalized(cleanExtractedValue(value));
  if (!text || text.includes("brut/net non precise")) return "";
  if (/(?:salaire|remuneration)\s+brut\b|\bbrut\s*:\s*(?:mensuel|annuel|horaire|\d)|\bbrut\s+(?:annuel|mensuel|horaire)\b|\b\d[\d\s.,]*(?:k\s*)?(?:€|eur|euros?)?\s*brut\b|\bk\s*(?:€|eur|euros?)?\s*brut\b|\b(?:mensuel|annuel|horaire)\b.{0,80}\bbrut\b/i.test(text)) {
    return "brut";
  }
  if (/(?:salaire|remuneration)\s+net\b|\bnet\s*:\s*(?:mensuel|annuel|horaire|\d)|\bnet\s+(?:annuel|mensuel|horaire)\b|\b\d[\d\s.,]*(?:k\s*)?(?:€|eur|euros?)?\s*net\b|\bk\s*(?:€|eur|euros?)?\s*net\b|\b(?:mensuel|annuel|horaire)\b.{0,80}\bnet\b/i.test(text)) {
    return "net";
  }
  return "";
}

function hasSalaryWords(text) {
  return ["selon profil", "a negocier", "à négocier", "brut", "net", "annuel", "mensuel", "horaire", "euros", "eur", "€", "k"].some((term) =>
    text.includes(normalized(term)),
  );
}

const technicalExtractionNoise = [
  '","',
  '":',
  "{",
  "}",
  "permis-et-certifications",
  "profil recherche",
  "infos entreprise",
  "infos complementaires",
  "étape",
  "etape",
  "renseigne",
];

function cleanInfoValue(value, maxLength = 180) {
  const clean = cleanExtractedValue(value)
    .replace(/^(?:primes?|variable|commissions?|avantages?|expérience demandée|experience demandee|expérience|experience)\s*:?\s*/i, "")
    .replace(/^[\s:;,+-]+/, "")
    .replace(/\s+(?:Source|URL|Qualité extraction|À vérifier|A verifier)\s*:.*$/i, "")
    .slice(0, maxLength);
  const text = normalized(clean);
  if (!clean || technicalExtractionNoise.some((term) => text.includes(normalized(term)))) return "";
  return compact(clean);
}

function splitInfoSegments(rawText) {
  return String(rawText || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\\u002F/g, "/")
    .replace(/\r/g, "\n")
    .split(/\n+|[•*]\s*|\s+\+\s+|;|\.\s+/)
    .map((segment) => cleanInfoValue(segment, 220))
    .filter(Boolean);
}

function findBonus(rawText) {
  const text = normalized(rawText);
  const bonusTerms = [
    "prime",
    "primes",
    "variable",
    "commission",
    "commissions",
    "13eme mois",
    "13e mois",
    "treizieme mois",
    "prime annuelle",
    "prime de partage",
    "sur objectifs",
    "non plafonne",
    "non plafonnée",
  ];
  if (!bonusTerms.some((term) => text.includes(normalized(term)))) return "Non mentionnées";
  const explicit = cleanInfoValue(firstMatch(rawText, [
    /^(?:primes?|variable|commissions?|rémunération variable|remuneration variable)\s*:\s*(.+)$/im,
  ]));
  const segments = splitInfoSegments(rawText)
    .filter((segment) => bonusTerms.some((term) => normalized(segment).includes(normalized(term))))
    .filter((segment) => !["tickets restaurant", "titres restaurant", "panier repas", "paniers repas", "mutuelle", "chèques vacances", "cheques vacances"].some((term) => normalized(segment).includes(normalized(term))));
  const values = unique([explicit, ...segments]).slice(0, 3);
  return values.length ? values.join(" ; ") : "Primes / variable mentionnés";
}

function findBenefits(rawText) {
  const text = normalized(rawText);
  const benefits = [];
  const add = (terms, label) => {
    if (terms.some((term) => text.includes(normalized(term))) && !benefits.includes(label)) benefits.push(label);
  };

  add(["vehicule de service", "vehicule fourni", "voiture de service", "véhicule de service", "véhicule fourni"], "Véhicule");
  add(["telephone", "téléphone", "smartphone"], "Téléphone");
  add(["ordinateur", "pc portable", "tablette"], "Ordinateur / tablette");
  add(["tickets restaurant", "ticket restaurant", "titres restaurant", "titre restaurant", "restaurant"], "Titres restaurant");
  add(["panier repas", "paniers repas"], "Paniers repas");
  add(["mutuelle", "prevoyance", "prévoyance"], "Mutuelle / prévoyance");
  add(["cheques vacances", "chèques vacances"], "Chèques vacances");
  add(["cse", "ce ", "comite d'entreprise", "comité d'entreprise"], "CSE / CE");
  add(["frais pris en charge", "frais rembourses", "frais remboursés", "indemnites kilometriques", "indemnités kilométriques"], "Frais pris en charge");
  add(["outils fournis", "outillage", "equipements fournis", "équipements fournis", "pack vetements", "pack vêtements"], "Outils / équipements");
  add(["teletravail", "télétravail"], "Télétravail");
  add(["formation interne", "formation assuree", "formation assurée", "parcours d'integration", "parcours d'intégration", "accompagnement terrain", "tutorat"], "Formation / accompagnement");

  return benefits.length ? benefits.slice(0, 8).join(", ") : "Non mentionnés";
}

function findRequiredExperience(rawText) {
  const explicit = cleanInfoValue(firstMatch(rawText, [
    /^(?:expérience demandée|experience demandee|expérience|experience|profil souhaité|profil souhaite)\s*:\s*(.+)$/im,
  ]), 120);
  const text = normalized(`${explicit} ${rawText}`);

  if (["debutant accepte", "débutant accepté", "debutant bienvenu", "sans experience", "sans expérience", "sans experience exigee", "premiere experience acceptee", "première expérience acceptée", "reconversion"].some((term) => text.includes(normalized(term)))) {
    return "Débutant accepté";
  }
  if (["junior", "profil debutant", "profil débutant", "premiere experience", "première expérience"].some((term) => text.includes(normalized(term)))) return "Junior";

  const yearMatch = text.match(/\b(\d{1,2})\s*(?:an|ans)\b.{0,40}(?:experience|expérience)|(?:experience|expérience).{0,40}\b(\d{1,2})\s*(?:an|ans)\b/);
  if (yearMatch) {
    const years = Number(yearMatch[1] || yearMatch[2]);
    if (years >= 3) return `${years} ans+`;
    if (years === 1) return "1 an";
    if (years === 2) return "2 ans";
  }

  if (["profil confirme", "profil confirmé", "senior", "experience exigee", "expérience exigée", "experimente", "expérimenté"].some((term) => text.includes(normalized(term)))) return "Profil confirmé";
  return explicit || "Non précisée";
}

function cleanLocationValue(value, fallbackText = "") {
  const normalizeCandidate = (candidate) =>
    cleanExtractedValue(candidate)
      .replace(/\s*-\s*Localiser\b.*$/i, "")
      .replace(/\s+Localiser\s+avec\s+Mappy\b.*$/i, "")
      .replace(/\s*-\s+[A-Z0-9]{5,}\b.*$/i, "")
      .replace(/\s+\|\s+.*$/i, "")
      .replace(/\s+Actualis\S*\s+le\b.*$/i, "")
      .replace(/\s+(?:Contrat|Temps de travail|Salaire)\b.*$/i, "")
      .slice(0, 120);

  const clean = normalizeCandidate(value);
  const recovered = departmentCityFrom(clean) || postalCityFrom(clean) || departmentCityFrom(fallbackText) || postalCityFrom(fallbackText);
  const noisy = normalized(clean);
  if (recovered) return recovered;
  if (!clean || noisy.includes("salaire") || noisy.includes("remuneration") || noisy.includes("euros") || noisy.includes("brut") || noisy.includes("net")) return "";
  if (/^\d+(?:[.,]\d+)?\s*(?:euros?|eur|k|h|heures?)\b/i.test(clean)) return "";
  return clean.slice(0, 80);
}

function locationFromHtml(html) {
  const itempropName = cleanLocationValue(
    firstMatch(html, [
      /itemprop=["']jobLocation["'][\s\S]{0,1400}?itemprop=["']name["'][^>]*>\s*([^<]{2,140})</i,
      /<span[^>]+itemprop=["']name["'][^>]*>\s*(\d{2,3}\s*-\s*[^<]{2,140})</i,
    ]),
  );
  if (itempropName) return itempropName;

  const locality = firstMatch(html, [
    /content=["']([^"']{2,100})["'][^>]+itemprop=["']addressLocality["']/i,
    /itemprop=["']addressLocality["'][^>]+content=["']([^"']{2,100})["']/i,
    /"addressLocality"\s*:\s*"([^"]{2,100})"/i,
  ]);
  const postalCode = firstMatch(html, [
    /content=["'](\d{5})["'][^>]+itemprop=["']postalCode["']/i,
    /itemprop=["']postalCode["'][^>]+content=["'](\d{5})["']/i,
    /"postalCode"\s*:\s*"(\d{5})"/i,
  ]);
  const fromStructuredAddress = cleanLocationValue(postalCode && locality ? `${postalCode} ${locality}` : locality);
  if (fromStructuredAddress) return fromStructuredAddress;

  return cleanLocationValue(
    firstMatch(stripHtml(html), [
      /\b(\d{2,3}\s*-\s*[A-Z\u00C0-\u017F][A-Za-z\u00C0-\u017F0-9' -]{2,80}?)(?=\s*(?:-\s*Localiser|\s+Localiser|\s+-\s+[A-Z0-9]{5,}\b|\s+\|))/i,
    ]),
  );
}

function locationFromSourceHtml(source, html) {
  if (normalized(source).includes("jobijoba")) {
    return cleanLocationValue(featureValueAfterIcon(html, "icon-map-marker"));
  }
  return "";
}

function cleanWorkTimeValue(value) {
  const clean = cleanExtractedValue(value)
    .replace(/\s+Salaire\b.*$/i, "")
    .replace(/\s+Profil souhait\S*\b.*$/i, "")
    .replace(/\s+Type de contrat\b.*$/i, "")
    .replace(/\s+Contrat travail\b.*$/i, "")
    .replace(/\s+Actualis\S*\s+le\b.*$/i, "")
    .slice(0, 140);
  const text = normalized(clean);
  if (!clean || text.includes("salaire") || text.includes("remuneration") || text.includes("euros")) return "";

  const precise = clean.match(
    /\b(?:Temps\s+(?:plein|partiel)\s*-\s*)?\d{1,2}(?:[,.]\d{1,2})?\s*h(?:eures?)?(?:\s*\/\s*(?:semaine|hebdo|mois|jour))?(?:\s+Travail\s+[^.;\n-]{2,50})?/i,
  );
  if (precise) return compact(precise[0]);

  const broad = clean.match(/\bTemps\s+(?:plein|partiel)\b(?:\s*-\s*[^.;\n]{2,80})?/i);
  return broad ? compact(broad[0]) : "";
}

function workTimeFromHtml(html, fallbackText = "") {
  const fromStructuredHtml = cleanWorkTimeValue(
    firstMatch(html, [
      /<dd[^>]+itemprop=["']workHours["'][^>]*>([\s\S]{2,260}?)<\/dd>/i,
      /Dur[ée]e du travail[\s\S]{0,360}<dd[^>]*>([\s\S]{2,260}?)<\/dd>/i,
    ]),
  );
  if (fromStructuredHtml) return fromStructuredHtml;

  return cleanWorkTimeValue(
    firstMatch(fallbackText, [
      /((?:Temps\s+(?:plein|partiel)\s*-\s*)?\d{1,2}(?:[,.]\d{1,2})?\s*h(?:eures?)?(?:\s*\/\s*(?:semaine|hebdo|mois|jour))?(?:\s+Travail\s+[^-]{2,50})?)/i,
      /(Temps\s+(?:plein|partiel)(?:\s*-\s*[^-]{2,100})?)(?=\s*-\s*(?:Salaire|[0-9]{2,3}\s*-)|$)/i,
    ]),
  );
}

function extractContractFromText(value) {
  const match = cleanExtractedValue(value).match(/\b(CDI|CDD|Alternance|Intérim|Interim|Indépendant|Independant)\b/i);
  return match ? match[1] : "";
}

function contractFromSourceHtml(source, html) {
  if (normalized(source).includes("jobijoba")) {
    return extractContractFromText(featureValueAfterIcon(html, "icon-file-text2"));
  }
  return "";
}

function apecContractLabel(value) {
  const code = Number(value || 0);
  const labels = {
    101887: "CDD",
    101888: "CDI",
    101889: "Intérim",
    101930: "Intérim",
    20053: "Alternance",
    597137: "Alternance",
    597138: "Alternance",
    597139: "Alternance",
    597140: "Alternance",
    597141: "CDI intérimaire",
    597171: "Stage",
  };
  return labels[code] || "";
}

function apecOfferNumberFromUrl(url) {
  return firstMatch(url, [/\/detail-offre\/([0-9]+[A-Z]?)/i, /numeroOffre=([0-9]+[A-Z]?)/i]);
}

function apecLocationFrom(detail, withLieu, fallback) {
  const fromWithLieu = Array.isArray(withLieu?.lieux)
    ? withLieu.lieux.map((lieu) => compact(lieu.libelleLieu || lieu.libelleLieuConfidentiel || lieu.adresse || "")).filter(Boolean)
    : [];
  const fromDetail = Array.isArray(detail?.lieux)
    ? detail.lieux.map((lieu) => compact(lieu.libelleLieu || lieu.libelleLieuConfidentiel || lieu.adresse || "")).filter(Boolean)
    : [];
  return compact([...fromWithLieu, ...fromDetail, fallback?.lieuTexte || ""].find(Boolean) || "");
}

function mapApecApiOffer(offer, withLieu, sourceUrl) {
  const now = new Date().toISOString();
  const title = compact(offer?.intitule || "Offre Apec");
  const company = cleanCompanyValue(compact(offer?.enseigne || offer?.nomCommercial || "")) || "Entreprise non précisée";
  const location = cleanLocationValue(apecLocationFrom(offer, withLieu, offer)) || "Lieu non précisé";
  const contract = apecContractLabel(offer?.idNomTypeContrat || offer?.typeContrat) || "Contrat non précisé";
  const workTime = cleanWorkTimeValue(stripHtml(offer?.textePresentation || "")) || (offer?.tempsPartiel ? "Temps partiel" : "Temps plein");
  const salary = cleanSalaryValue(offer?.salaireTexte || `${offer?.salaireMinimum || ""} - ${offer?.salaireMaximum || ""} k€ brut annuel`) || "Non indiqué";
  const salaryKind = salaryKindFromText(offer?.salaireTexte || salary) || "non précisé";
  const description = [
    stripHtml(offer?.texteHtml || offer?.texteOffre || ""),
    stripHtml(offer?.texteHtmlProfil || ""),
    stripHtml(offer?.textePresentation || ""),
    stripHtml(offer?.texteHtmlEntreprise || ""),
    stripHtml(offer?.texteProcessRecrutement || ""),
  ]
    .map(compact)
    .filter(Boolean)
    .join("\n\n");
  const requiredExperience = findRequiredExperience(description);
  const bonus = findBonus([offer?.salaireTexte || salary, description].filter(Boolean).join("\n"));
  const benefits = findBenefits(description);
  const quality = extractionQuality({ title, company, location, contract, salary, description });
  const rawText = [
    `Poste : ${title}`,
    `Entreprise : ${company}`,
    `Lieu : ${location}`,
    `Contrat : ${contract}`,
    `Temps de travail : ${workTime || "Non précisé"}`,
    `Salaire : ${salary}`,
    `Brut / net : ${salaryKind}`,
    `Primes : ${bonus}`,
    `Avantages : ${benefits}`,
    `Expérience demandée : ${requiredExperience}`,
    "Source : Apec",
    `URL : ${sourceUrl}`,
    `Qualité extraction : ${quality.label}`,
    quality.notes.length ? `À vérifier : ${quality.notes.join(", ")}` : "",
    "",
    description || compact(offer?.texteOffre || ""),
  ].filter(Boolean).join("\n");

  return {
    id: `apec-${offer?.numeroOffre || offer?.id || hashString(sourceUrl)}`,
    sourceId: compact(offer?.numeroOffre || offer?.id || hashString(sourceUrl)),
    rawText,
    createdAt: offer?.datePublication || now,
    updatedAt: now,
    favorite: false,
    ignored: false,
    reviewStatus: "a_traiter",
    source: "Apec",
    sourceUrl,
    datasetLabel: "jeu réel",
    extractionQuality: quality.label,
    extractionNotes: quality.notes,
  };
}

async function fetchApecOffer(numeroOffre, fallback = {}) {
  const detailUrl = `https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/${encodeURIComponent(numeroOffre)}`;
  const referer = detailUrl;
  const detail = await fetchJson(`https://www.apec.fr/cms/webservices/offre/existe?numeroOffre=${encodeURIComponent(numeroOffre)}`, { referer });
  let withLieu = null;
  try {
    withLieu = await fetchJson(`https://www.apec.fr/cms/webservices/offre/withLieu?numeroOffre=${encodeURIComponent(numeroOffre)}`, { referer });
  } catch {
    withLieu = null;
  }
  return mapApecApiOffer({ ...fallback, ...detail }, withLieu, detailUrl);
}

async function searchApecSourceOnce(source, keywords, perSourceLimit) {
  const searchUrl = source.searchUrl(keywords, "");
  const body = {
    motsCles: keywords,
    typeClient: "CADRE",
    pagination: { range: Math.max(1, perSourceLimit), startIndex: 0 },
    activeFiltre: true,
    pointGeolocDeReference: {},
    sorts: [{ type: "DATE", direction: "DESCENDING" }],
  };

  const payload = await fetchJson("https://www.apec.fr/cms/webservices/rechercheOffre", {
    method: "POST",
    body,
    referer: searchUrl,
  });
  const results = Array.isArray(payload?.resultats) ? payload.resultats : [];
  const jobs = [];
  let skippedCount = 0;

  for (const offer of results.slice(0, perSourceLimit)) {
    const numeroOffre = compact(offer.numeroOffre || "");
    if (!numeroOffre) {
      skippedCount += 1;
      continue;
    }
    try {
      const job = await fetchApecOffer(numeroOffre, offer);
      if (isImportable(job)) jobs.push(job);
      else skippedCount += 1;
    } catch {
      const fallbackUrl = `https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/${encodeURIComponent(numeroOffre)}`;
      const job = mapApecApiOffer(offer, null, fallbackUrl);
      if (isImportable(job)) jobs.push(job);
      else skippedCount += 1;
    }
  }

  const foundCount = results.length;
  const detailLinkCount = jobs.length;
  const missingDetailCount = 0;
  const poorQualityCount = skippedCount;

  return {
    source: source.name,
    jobs,
    foundCount,
    detailLinkCount,
    missingDetailCount,
    poorQualityCount,
    skippedCount,
    status: jobs.length ? "ok" : "empty",
    message: jobs.length ? `${source.name} : ${jobs.length} offre${jobs.length > 1 ? "s" : ""} via API publique.` : `${source.name} : aucune offre assez complète.`,
  };
}

function flattenJsonLd(value) {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (!value || typeof value !== "object") return [];
  const graph = Array.isArray(value["@graph"]) ? value["@graph"].flatMap(flattenJsonLd) : [];
  return [value, ...graph];
}

function jsonLdItems(html) {
  const items = [];
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    try {
      const parsed = JSON.parse(decodeHtml(match[1]).trim());
      items.push(...flattenJsonLd(parsed));
    } catch {
      // Some job boards inject invalid JSON-LD; the generic HTML parser remains the fallback.
    }
  }
  return items;
}

function jsonLdJobPosting(html) {
  return jsonLdItems(html).find((item) => normalized(String(item["@type"] || "")).includes("jobposting")) || null;
}

function nestedValue(value, path) {
  return path.reduce((current, key) => (current && typeof current === "object" ? current[key] : undefined), value);
}

function salaryFromJsonLd(baseSalary) {
  if (!baseSalary) return "";
  if (typeof baseSalary === "string") return cleanSalaryValue(baseSalary);
  const value = baseSalary.value && typeof baseSalary.value === "object" ? baseSalary.value : baseSalary;
  const min = value.minValue || value.value || value["@value"] || "";
  const max = value.maxValue || "";
  const unit = value.unitText || value.unit || "";
  const currency = baseSalary.currency || value.currency || "EUR";
  const label = max ? `${min} - ${max} ${currency} ${unit}` : `${min} ${currency} ${unit}`;
  return cleanSalaryValue(label);
}

function hashString(value) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

const AI_REVIEW_SCHEMA = {
  type: "object",
  properties: {
    extraction: {
      type: "object",
      properties: {
        title: { type: "string" },
        company: { type: "string" },
        location: { type: "string" },
        contract: { type: "string" },
        workTime: { type: "string" },
        salary: { type: "string" },
        salaryKind: { type: "string", enum: ["brut", "net", "non précisé"] },
        bonus: { type: "string" },
        bonusEstimate: { type: "string" },
        requiredExperience: { type: "string" },
        benefits: { type: "string" },
        poeiSignal: { type: "boolean" },
        auditSignal: { type: "boolean" },
        independentSignal: { type: "boolean" },
      },
      required: [
        "title",
        "company",
        "location",
        "contract",
        "workTime",
        "salary",
        "salaryKind",
        "bonus",
        "bonusEstimate",
        "requiredExperience",
        "benefits",
        "poeiSignal",
        "auditSignal",
        "independentSignal",
      ],
    },
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    blockers: { type: "array", items: { type: "string" } },
    uncertainties: { type: "array", items: { type: "string" } },
    questions: { type: "array", items: { type: "string" } },
    decisionVerdict: { type: "string", enum: ["bonne_piste", "a_creuser", "risque", "hors_cible"] },
    decisionReasons: { type: "array", items: { type: "string" } },
    recruiterQuestions: { type: "array", items: { type: "string" } },
    applicationPrep: {
      type: "object",
      properties: {
        callAngle: { type: "string" },
        message: { type: "string" },
        checkpoints: { type: "array", items: { type: "string" } },
      },
      required: ["callAngle", "message", "checkpoints"],
    },
    aiRankScore: { type: "integer", minimum: 0, maximum: 100 },
    aiRankReasons: { type: "array", items: { type: "string" } },
    salaryRankScore: { type: "integer", minimum: 0, maximum: 100 },
    salaryRankReasons: { type: "array", items: { type: "string" } },
    salaryComparableLabel: { type: "string" },
    salaryWarnings: { type: "array", items: { type: "string" } },
    scoreAdjustment: { type: "integer", minimum: -12, maximum: 12 },
    scoreReasons: { type: "array", items: { type: "string" } },
    confidence: { type: "string", enum: ["faible", "moyenne", "bonne"] },
    qualityCheck: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["ok", "verify", "conflict"] },
        confidence: { type: "string", enum: ["faible", "moyenne", "bonne"] },
        fieldChecks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string" },
              status: { type: "string", enum: ["ok", "verify", "conflict"] },
              currentValue: { type: "string" },
              suggestedValue: { type: "string" },
              reason: { type: "string" },
            },
            required: ["field", "status", "currentValue", "suggestedValue", "reason"],
          },
        },
        warnings: { type: "array", items: { type: "string" } },
        suggestedCorrections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string" },
              status: { type: "string", enum: ["ok", "verify", "conflict"] },
              currentValue: { type: "string" },
              suggestedValue: { type: "string" },
              reason: { type: "string" },
            },
            required: ["field", "status", "currentValue", "suggestedValue", "reason"],
          },
        },
      },
      required: ["status", "confidence", "fieldChecks", "warnings", "suggestedCorrections"],
    },
  },
  required: [
    "extraction",
    "summary",
    "strengths",
    "blockers",
    "uncertainties",
    "questions",
    "decisionVerdict",
    "decisionReasons",
    "recruiterQuestions",
    "applicationPrep",
    "aiRankScore",
    "aiRankReasons",
    "salaryRankScore",
    "salaryRankReasons",
    "salaryComparableLabel",
    "salaryWarnings",
    "scoreAdjustment",
    "scoreReasons",
    "confidence",
    "qualityCheck",
  ],
};

const AI_BATCH_REVIEW_SCHEMA = {
  type: "object",
  properties: {
    reviews: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          ...AI_REVIEW_SCHEMA.properties,
        },
        required: ["id", ...AI_REVIEW_SCHEMA.required],
      },
    },
    top3Comparison: {
      type: "object",
      properties: {
        whyFirst: { type: "string" },
        riskierOffer: { type: "string" },
        callFirst: { type: "string" },
        actionSummary: { type: "string" },
      },
      required: ["whyFirst", "riskierOffer", "callFirst", "actionSummary"],
    },
  },
  required: ["reviews", "top3Comparison"],
};

const AI_SEARCH_PLAN_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    queries: { type: "array", items: { type: "string" } },
    reasons: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "queries", "reasons"],
};

function boundedString(value, fallback = "") {
  return compact(typeof value === "string" ? value : fallback).slice(0, 500);
}

function boundedList(value, limit = 5) {
  return Array.isArray(value)
    ? value.map((item) => boundedString(item)).filter(Boolean).slice(0, limit)
    : [];
}

function boundedStringList(value, limit = 8, itemLimit = 120) {
  return Array.isArray(value)
    ? unique(value.map((item) => boundedString(item).slice(0, itemLimit))).slice(0, limit)
    : [];
}

function clampAiAdjustment(value) {
  const number = Math.round(Number(value || 0));
  if (!Number.isFinite(number)) return 0;
  return Math.max(-12, Math.min(12, number));
}

function clampAiRankScore(value) {
  const number = Math.round(Number(value || 0));
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

function normalizeQualityStatus(value) {
  const text = normalized(value);
  if (text === "conflict" || text.includes("incoherent") || text.includes("contradiction")) return "conflict";
  if (text === "verify" || text.includes("verifier") || text.includes("doute")) return "verify";
  return "ok";
}

function normalizeQualityField(value) {
  const item = value && typeof value === "object" ? value : {};
  return {
    field: boundedString(item.field),
    status: normalizeQualityStatus(item.status),
    currentValue: boundedString(item.currentValue),
    suggestedValue: boundedString(item.suggestedValue),
    reason: boundedString(item.reason),
  };
}

function normalizeQualityCheck(value) {
  const quality = value && typeof value === "object" ? value : {};
  const fieldChecks = Array.isArray(quality.fieldChecks)
    ? quality.fieldChecks.map(normalizeQualityField).filter((item) => item.field).slice(0, 12)
    : [];
  const suggestedCorrections = Array.isArray(quality.suggestedCorrections)
    ? quality.suggestedCorrections.map(normalizeQualityField).filter((item) => item.field && item.suggestedValue).slice(0, 8)
    : fieldChecks.filter((item) => item.status !== "ok" && item.suggestedValue).slice(0, 8);
  const fallbackStatus = fieldChecks.some((item) => item.status === "conflict")
    ? "conflict"
    : fieldChecks.some((item) => item.status === "verify")
      ? "verify"
      : "ok";
  return {
    status: normalizeQualityStatus(quality.status || fallbackStatus),
    confidence: ["faible", "moyenne", "bonne"].includes(quality.confidence) ? quality.confidence : "faible",
    fieldChecks,
    warnings: boundedList(quality.warnings, 6),
    suggestedCorrections,
  };
}

function normalizeDecisionVerdict(value) {
  const text = normalized(value);
  if (text.includes("bonne") || text.includes("prioritaire")) return "bonne_piste";
  if (text.includes("risque") || text.includes("piege")) return "risque";
  if (text.includes("hors")) return "hors_cible";
  return "a_creuser";
}

function normalizeApplicationPrep(value) {
  const prep = value && typeof value === "object" ? value : {};
  return {
    callAngle: boundedString(prep.callAngle),
    message: boundedString(prep.message, "").slice(0, 900),
    checkpoints: boundedList(prep.checkpoints, 5),
  };
}

function normalizeTop3Comparison(value) {
  const item = value && typeof value === "object" ? value : {};
  return {
    whyFirst: boundedString(item.whyFirst),
    riskierOffer: boundedString(item.riskierOffer),
    callFirst: boundedString(item.callFirst),
    actionSummary: boundedString(item.actionSummary),
  };
}

function normalizeAiPayload(value) {
  const extraction = value && typeof value.extraction === "object" ? value.extraction : {};
  const salaryKind = ["brut", "net", "non précisé"].includes(extraction.salaryKind) ? extraction.salaryKind : "non précisé";
  const confidence = ["faible", "moyenne", "bonne"].includes(value?.confidence) ? value.confidence : "faible";
  return {
    extraction: {
      title: boundedString(extraction.title),
      company: boundedString(extraction.company),
      location: boundedString(extraction.location),
      contract: boundedString(extraction.contract),
      workTime: boundedString(extraction.workTime),
      salary: boundedString(extraction.salary),
      salaryKind,
      bonus: boundedString(extraction.bonus || "Non mentionnées"),
      bonusEstimate: boundedString(extraction.bonusEstimate),
      requiredExperience: boundedString(extraction.requiredExperience),
      benefits: boundedString(extraction.benefits),
      poeiSignal: Boolean(extraction.poeiSignal),
      auditSignal: Boolean(extraction.auditSignal),
      independentSignal: Boolean(extraction.independentSignal),
    },
    summary: boundedString(value?.summary, "Avis intelligent à vérifier."),
    strengths: boundedList(value?.strengths, 5),
    blockers: boundedList(value?.blockers, 5),
    uncertainties: boundedList(value?.uncertainties, 5),
    questions: boundedList(value?.questions, 5),
    decisionVerdict: normalizeDecisionVerdict(value?.decisionVerdict),
    decisionReasons: boundedList(value?.decisionReasons, 3),
    recruiterQuestions: boundedList(value?.recruiterQuestions, 5),
    applicationPrep: normalizeApplicationPrep(value?.applicationPrep),
    aiRankScore: clampAiRankScore(value?.aiRankScore),
    aiRankReasons: boundedList(value?.aiRankReasons, 4),
    salaryRankScore: clampAiRankScore(value?.salaryRankScore),
    salaryRankReasons: boundedList(value?.salaryRankReasons, 4),
    salaryComparableLabel: boundedString(value?.salaryComparableLabel),
    salaryWarnings: boundedList(value?.salaryWarnings, 5),
    scoreAdjustment: clampAiAdjustment(value?.scoreAdjustment),
    scoreReasons: boundedList(value?.scoreReasons, 4),
    confidence,
    qualityCheck: normalizeQualityCheck(value?.qualityCheck),
  };
}

function aiPromptFor(job, strategy) {
  const strategyText = [
    `Métier cible : ${boundedString(strategy?.targetJob || "diagnostiqueur immobilier")}`,
    `Zone : ${boundedString(strategy?.location || "Toute la France")}`,
    `Salaire net mini : ${boundedString(String(strategy?.salaryMin || ""))}`,
    `Expérience : ${boundedString(strategy?.experienceLevel || "")}`,
    `Contrat souhaité : ${boundedString(strategy?.contractPreference || "")}`,
    `Objectif : ${boundedString(strategy?.objective || "")}`,
    `Intention assistant : ${boundedString(strategy?.assistantIntent || "")}`,
    `Resume assistant : ${boundedString(strategy?.assistantSummary || "")}`,
    `Formation facilitee / prise en charge formation : ${boundedString(strategy?.poeiRequirement || "")}`,
    `Audit : ${boundedString(strategy?.auditRequirement || "")}`,
    `Indépendant : ${boundedString(strategy?.independentRequirement || "")}`,
  ].join("\n");

  return `Tu analyses une annonce d'emploi pour Taf Sniffer, une application de reconversion vers le diagnostic immobilier et l'audit énergétique.
Retourne uniquement un JSON conforme au schéma demandé.
N'invente pas les informations absentes : utilise une chaîne vide ou "Non détecté".
aiRankScore doit etre un score de classement de 0 a 100 pour ordonner l'offre selon la strategie utilisateur.
aiRankReasons doit donner 2 a 4 raisons concretes qui justifient ce classement.
salaryRankScore doit etre un score salaire de 0 a 100 a parametres egaux : brut/net, annuel/mensuel, 35h/39h, fixe/variable, primes, avantages, statut salarie/independant, frais et formation.
Compare d'abord le fixe sans primes. Mentionne ensuite le package avec primes et le taux horaire seulement si localAnalysis les fournit ou si l'annonce les rend estimables.
salaryComparableLabel doit resumer le fixe comparable estime, puis le package separement si pertinent, par exemple "fixe 1900-2100 EUR net/mois, package a verifier".
salaryRankReasons explique les points qui rendent ce salaire bon ou faible.
salaryWarnings liste les incertitudes qui empechent une comparaison parfaite.
Le scoreAdjustment doit rester entre -12 et +12 et représenter seulement ce que les règles locales pourraient mal lire.
Ne remplace pas les règles obligatoires : formation facilitee obligatoire, audit obligatoire ou refus indépendant restent décidés par Taf Sniffer.
Ajoute une couche décisionnelle courte : decisionVerdict, 3 decisionReasons maximum, 4 ou 5 recruiterQuestions concrètes, et applicationPrep exploitable.
Les questions recruteur doivent viser cette annonce : formation prise en charge, salaire fixe/variable, POEI/POEC/POEIC/AFPR si pertinent, rythme terrain, véhicule, certifications si ces sujets apparaissent ou manquent.

Stratégie utilisateur :
${strategyText}

Controle qualite obligatoire :
- Ta section extraction doit etre une fiche propre reecrite depuis le texte brut et localAnalysis. Ne recopie pas les erreurs locales si le texte brut les contredit.
- Si localAnalysis est douteuse mais le texte brut donne une valeur exploitable, renseigne la valeur propre dans extraction et marque le champ verify.
- Si le texte brut contredit clairement localAnalysis, suis le texte brut dans extraction et marque le champ conflict avec une correction proposee.
- Ne mets pas "Non detecte" si le texte brut contient une information exploitable, meme placee dans un bloc lateral ou en fin d'annonce.
- Ajoute qualityCheck en comparant texte brut, localAnalysis si fournie et ton extraction.
- Utilise uniquement les statuts ok, verify, conflict.
- Controle surtout entreprise, lieu, contrat, temps de travail, salaire, brut/net, primes, formation facilitee/POEI/POEC/POEIC/AFPR, audit, independant.
- Ne corrige rien automatiquement : propose seulement suggestedValue et reason.

Extraction locale Taf Sniffer :
${JSON.stringify(job.localAnalysis || null, null, 2)}

Annonce :
${String(job.rawText || "").slice(0, 9000)}`;
}

function aiBatchPromptFor(jobs, strategy, preferenceMemory) {
  const strategyText = [
    `Métier cible : ${boundedString(strategy?.targetJob || "diagnostiqueur immobilier")}`,
    `Zone : ${boundedString(strategy?.location || "Toute la France")}`,
    `Salaire net mini : ${boundedString(String(strategy?.salaryMin || ""))}`,
    `Expérience : ${boundedString(strategy?.experienceLevel || "")}`,
    `Contrat souhaité : ${boundedString(strategy?.contractPreference || "")}`,
    `Objectif : ${boundedString(strategy?.objective || "")}`,
    `Intention assistant : ${boundedString(strategy?.assistantIntent || "")}`,
    `Resume assistant : ${boundedString(strategy?.assistantSummary || "")}`,
    `Formation facilitee / prise en charge formation : ${boundedString(strategy?.poeiRequirement || "")}`,
    `Audit : ${boundedString(strategy?.auditRequirement || "")}`,
    `Indépendant : ${boundedString(strategy?.independentRequirement || "")}`,
  ].join("\n");
  const offers = jobs.map((job) => ({
    id: boundedString(job.id),
    source: boundedString(job.source),
    sourceUrl: boundedString(job.sourceUrl),
    topContext: job.topContext || null,
    localAnalysis: job.localAnalysis || null,
    rawText: String(job.rawText || "").slice(0, 6500),
  }));

  return `Tu analyses plusieurs annonces d'emploi pour Taf Sniffer, une application de reconversion vers le diagnostic immobilier et l'audit énergétique.
Retourne uniquement un JSON conforme au schéma demandé.
Retourne exactement un objet reviews par annonce, avec le même id que l'entrée.
Retourne aussi top3Comparison pour comparer les annonces du lot.
N'invente pas les informations absentes : utilise une chaîne vide ou "Non détecté".
aiRankScore doit etre un score de classement de 0 a 100 pour ordonner chaque offre selon la strategie utilisateur et departager le lot.
aiRankReasons doit donner 2 a 4 raisons concretes qui justifient ce classement.
salaryRankScore doit etre un score salaire de 0 a 100 a parametres egaux : brut/net, annuel/mensuel, 35h/39h, fixe/variable, primes, avantages, statut salarie/independant, frais et formation.
Compare d'abord le fixe sans primes. Mentionne ensuite le package avec primes et le taux horaire seulement si localAnalysis les fournit ou si l'annonce les rend estimables.
salaryComparableLabel doit resumer le fixe comparable estime, puis le package separement si pertinent, par exemple "fixe 1900-2100 EUR net/mois, package a verifier".
salaryRankReasons explique les points qui rendent ce salaire bon ou faible.
salaryWarnings liste les incertitudes qui empechent une comparaison parfaite.
Le scoreAdjustment doit rester entre -12 et +12 et représenter seulement ce que les règles locales pourraient mal lire.
Ne remplace pas les règles obligatoires : formation facilitee obligatoire, audit obligatoire ou refus indépendant restent décidés par Taf Sniffer.
Ajoute une couche décisionnelle courte pour chaque annonce : decisionVerdict, 3 decisionReasons maximum, 4 ou 5 recruiterQuestions concrètes, et applicationPrep exploitable.
Les questions recruteur doivent viser cette annonce : formation prise en charge, salaire fixe/variable, POEI/POEC/POEIC/AFPR si pertinent, rythme terrain, véhicule, certifications si ces sujets apparaissent ou manquent.

Stratégie utilisateur :
${strategyText}

Mémoire locale des préférences utilisateur :
${JSON.stringify(preferenceMemory || null, null, 2)}

Comparaison Top 3 attendue :
- whyFirst : pourquoi l'offre #1 du lot passe devant.
- riskierOffer : quelle offre est la plus risquée et pourquoi.
- callFirst : laquelle appeler en premier et avec quel angle.
- actionSummary : décision courte et actionnable.

Controle qualite obligatoire :
- La section extraction de chaque review doit etre une fiche propre reecrite depuis le texte brut et localAnalysis. Ne recopie pas les erreurs locales si le texte brut les contredit.
- Si localAnalysis est douteuse mais le texte brut donne une valeur exploitable, renseigne la valeur propre dans extraction et marque le champ verify.
- Si le texte brut contredit clairement localAnalysis, suis le texte brut dans extraction et marque le champ conflict avec une correction proposee.
- Ne mets pas "Non detecte" si le texte brut contient une information exploitable, meme placee dans un bloc lateral ou en fin d'annonce.
- Ajoute qualityCheck pour chaque annonce en comparant texte brut, localAnalysis et ton extraction.
- Utilise uniquement les statuts ok, verify, conflict.
- Controle surtout entreprise, lieu, contrat, temps de travail, salaire, brut/net, primes, formation facilitee/POEI/POEC/POEIC/AFPR, audit, independant.
- Ne corrige rien automatiquement : propose seulement suggestedValue et reason.

Annonces :
${JSON.stringify(offers, null, 2)}`;
}

function parseGeminiJson(payload) {
  const text = (payload?.candidates?.[0]?.content?.parts || [])
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
  const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  if (!clean) throw new Error("Réponse Gemini vide.");
  return JSON.parse(clean);
}

async function callGeminiForJobWithModel(job, strategy, strategyHash, model) {
  checkGeminiQuota(model);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: aiPromptFor(job, strategy) }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseJsonSchema: AI_REVIEW_SCHEMA,
      },
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `Gemini indisponible (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  recordGeminiCall(model);

  const parsed = normalizeAiPayload(parseGeminiJson(payload));
  return {
    id: job.id,
    status: "done",
    provider: "Gemini",
    model,
    checkedAt: new Date().toISOString(),
    rawTextHash: boundedString(job.rawTextHash) || hashString(String(job.rawText || "")),
    strategyHash,
    ...parsed,
  };
}

async function callGeminiForJob(job, strategy, strategyHash) {
  const models = geminiModelChain();
  let lastError = null;

  for (const model of models) {
    try {
      return await callGeminiForJobWithModel(job, strategy, strategyHash, model);
    } catch (error) {
      lastError = error;
      error.model = model;
      if (!shouldTryNextGeminiModel(error)) break;
    }
  }

  throw lastError || new Error("Gemini indisponible.");
}

function retryDelayFromGemini(message) {
  const match = String(message || "").match(/retry\s+in\s+([\d.]+)s/i);
  return match ? Math.ceil(Number(match[1])) : null;
}

async function callGeminiForJobsWithModel(jobs, strategy, strategyHash, model, preferenceMemory) {
  checkGeminiQuota(model);
  const startedAt = Date.now();
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: aiBatchPromptFor(jobs, strategy, preferenceMemory) }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseJsonSchema: AI_BATCH_REVIEW_SCHEMA,
      },
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `Gemini indisponible (${response.status}).`;
    writeDiagnostic("ai", {
      action: "analyze-jobs",
      model,
      status: "error",
      httpStatus: response.status,
      durationMs: Date.now() - startedAt,
      jobCount: jobs.length,
      message: safeLogText(message),
    });
    const error = new Error(message);
    error.status = response.status;
    error.retryAfterSeconds = retryDelayFromGemini(message);
    throw error;
  }
  recordGeminiCall(model);

  const parsed = parseGeminiJson(payload);
  const rawReviews = Array.isArray(parsed?.reviews) ? parsed.reviews : [];
  const byId = new Map(jobs.map((job) => [job.id, job]));
  const returned = new Set();
  const reviews = rawReviews
    .filter((review) => review && typeof review.id === "string" && byId.has(review.id))
    .map((review) => {
      const job = byId.get(review.id);
      returned.add(review.id);
      return {
        id: review.id,
        status: "done",
        provider: "Gemini",
        model,
        checkedAt: new Date().toISOString(),
        rawTextHash: boundedString(job.rawTextHash) || hashString(String(job.rawText || "")),
        strategyHash,
        ...normalizeAiPayload(review),
      };
    });

  for (const job of jobs) {
    if (!returned.has(job.id)) {
      reviews.push({
        id: job.id,
        status: "error",
        provider: "Gemini",
        model,
        checkedAt: new Date().toISOString(),
        rawTextHash: boundedString(job.rawTextHash) || hashString(String(job.rawText || "")),
        strategyHash,
        errorMessage: "Gemini n'a pas retourné d'avis pour cette offre.",
      });
    }
  }

  writeDiagnostic("ai", {
    action: "analyze-jobs",
    model,
    status: "ok",
    durationMs: Date.now() - startedAt,
    jobCount: jobs.length,
    reviewCount: reviews.length,
    doneCount: reviews.filter((review) => review.status === "done").length,
  });

  return {
    reviews,
    top3Comparison: normalizeTop3Comparison(parsed?.top3Comparison),
  };
}

async function callGeminiForJobs(jobs, strategy, strategyHash, preferenceMemory) {
  const models = geminiModelChain();
  let lastError = null;

  for (const model of models) {
    try {
      const result = await callGeminiForJobsWithModel(jobs, strategy, strategyHash, model, preferenceMemory);
      return { ...result, model };
    } catch (error) {
      lastError = error;
      error.model = model;
      writeDiagnostic("ai", {
        action: "analyze-jobs-fallback",
        model,
        status: "fallback",
        jobCount: jobs.length,
        httpStatus: error?.status || null,
        retryAfterSeconds: error?.retryAfterSeconds || null,
        willTryNext: shouldTryNextGeminiModel(error),
        message: safeLogText(error?.message || error),
      });
      if (!shouldTryNextGeminiModel(error)) break;
    }
  }

  throw lastError || new Error("Gemini indisponible.");
}

function searchPlanModelChain() {
  return unique(["gemini-3.1-flash-lite", "gemini-2.5-flash-lite"]);
}

function aiSearchPlanPromptFor(strategy) {
  const constraints = [
    strategy?.poeiRequirement === "required" ? "formation facilitee ou prise en charge formation obligatoire" : "",
    strategy?.auditRequirement === "required" ? "audit energetique obligatoire" : "",
    strategy?.independentRequirement === "required" ? "refuser statut independant impose" : "",
  ].filter(Boolean).join(", ") || "aucune contrainte stricte";

  return `Tu aides Taf Sniffer a transformer une intention metier en requetes de recherche d'emploi.
Retourne uniquement un JSON conforme au schema.
Genere 5 a 8 requetes courtes, concretes, utiles sur des sites d'emploi francais.
Ne fais pas une liste de synonymes brute : combine metier, niveau, reconversion et signaux utiles.
Evite les requetes trop longues. Ne mets pas la zone dans les requetes.
Garde les garde-fous utilisateur, mais ne rends pas les requetes impossibles.

Metier/preset : ${boundedString(strategy?.targetJob || "diagnostiqueur immobilier")}
Intention libre : ${boundedString(strategy?.assistantIntent || "")}
Resume assistant : ${boundedString(strategy?.assistantSummary || "")}
Objectif : ${boundedString(strategy?.objective || "")}
Experience : ${boundedString(strategy?.experienceLevel || "")}
Contrat : ${boundedString(strategy?.contractPreference || "")}
Salaire net mini : ${boundedString(String(strategy?.salaryMin || ""))}
Contraintes : ${constraints}

Le champ summary doit etre une synthese courte en francais, modifiable par l'utilisateur.
Le champ reasons liste 2 a 4 raisons expliquant les choix de requetes.`;
}

function normalizeSearchPlanPayload(value) {
  const queries = boundedStringList(value?.queries, 8, 90)
    .map((query) => query.replace(/[.;]+$/g, "").trim())
    .filter((query) => query.length >= 3);
  return {
    summary: boundedString(value?.summary, ""),
    queries,
    reasons: boundedStringList(value?.reasons, 4, 160),
  };
}

async function callGeminiForSearchPlanWithModel(strategy, model) {
  checkGeminiQuota(model);
  const startedAt = Date.now();
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: aiSearchPlanPromptFor(strategy) }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseJsonSchema: AI_SEARCH_PLAN_SCHEMA,
      },
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `Gemini indisponible (${response.status}).`;
    writeDiagnostic("ai", {
      action: "search-plan",
      model,
      status: "error",
      httpStatus: response.status,
      durationMs: Date.now() - startedAt,
      message: safeLogText(message),
    });
    const error = new Error(message);
    error.status = response.status;
    error.retryAfterSeconds = retryDelayFromGemini(message);
    throw error;
  }
  recordGeminiCall(model);
  const plan = normalizeSearchPlanPayload(parseGeminiJson(payload));
  writeDiagnostic("ai", {
    action: "search-plan",
    model,
    status: "ok",
    durationMs: Date.now() - startedAt,
    queryCount: plan.queries.length,
  });
  return plan;
}

async function callGeminiForSearchPlan(strategy) {
  let lastError = null;
  for (const model of searchPlanModelChain()) {
    try {
      const plan = await callGeminiForSearchPlanWithModel(strategy, model);
      return { ...plan, model };
    } catch (error) {
      lastError = error;
      error.model = model;
      writeDiagnostic("ai", {
        action: "search-plan-fallback",
        model,
        status: "fallback",
        httpStatus: error?.status || null,
        retryAfterSeconds: error?.retryAfterSeconds || null,
        willTryNext: shouldTryNextGeminiModel(error),
        message: safeLogText(error?.message || error),
      });
      if (!shouldTryNextGeminiModel(error)) break;
    }
  }
  throw lastError || new Error("Plan de recherche Gemini indisponible.");
}

async function buildAiSearchPlan(req) {
  const payload = await readRequestJson(req, 120_000);
  const strategy = payload.strategy && typeof payload.strategy === "object" ? payload.strategy : {};
  const model = searchPlanModelChain()[0];

  if (!env.GEMINI_API_KEY) {
    writeDiagnostic("ai", {
      action: "search-plan",
      model,
      status: "skipped",
      reason: "missing_gemini_api_key",
    });
    return {
      configured: false,
      provider: "Gemini",
      model,
      summary: "",
      queries: [],
      reasons: [],
      message: "Plan de recherche IA non configure. Recherche locale utilisee.",
    };
  }

  try {
    const plan = await callGeminiForSearchPlan(strategy);
    return {
      configured: true,
      provider: "Gemini",
      model: plan.model,
      summary: plan.summary,
      queries: plan.queries,
      reasons: plan.reasons,
      message: plan.queries.length
        ? `Plan de recherche IA pret avec ${plan.queries.length} requetes.`
        : "Plan IA sans requete exploitable. Recherche locale utilisee.",
    };
  } catch (error) {
    const retry = error?.retryAfterSeconds ? ` Reessaie dans environ ${error.retryAfterSeconds}s.` : "";
    const isRateLimit = Number(error?.status) === 429 || /quota|rate|limite/i.test(String(error?.message || ""));
    return {
      configured: true,
      provider: "Gemini",
      model: error?.model || model,
      summary: "",
      queries: [],
      reasons: [],
      message: isRateLimit
        ? `Quota Gemini atteint pour le plan de recherche.${retry} Recherche locale utilisee.`
        : boundedString(error?.message || "Plan de recherche IA indisponible. Recherche locale utilisee."),
    };
  }
}

async function analyzeJobsWithGemini(req) {
  const payload = await readRequestJson(req);
  const jobs = Array.isArray(payload.jobs) ? payload.jobs.slice(0, 25) : [];
  const strategy = payload.strategy && typeof payload.strategy === "object" ? payload.strategy : {};
  const preferenceMemory = payload.preferenceMemory && typeof payload.preferenceMemory === "object" ? payload.preferenceMemory : null;
  const strategyHash = boundedString(payload.strategyHash) || hashString(JSON.stringify(strategy));
  const model = geminiModelChain()[0] || GEMINI_MODEL;

  if (!env.GEMINI_API_KEY) {
    writeDiagnostic("ai", {
      action: "analyze-jobs",
      model,
      status: "skipped",
      reason: "missing_gemini_api_key",
      jobCount: jobs.length,
    });
    return {
      configured: false,
      provider: "Gemini",
      model,
      message: "Analyse intelligente non configurée. Ajoute GEMINI_API_KEY dans .env.",
      reviews: jobs.map((job) => ({
        id: job.id,
        status: "skipped",
        provider: "Gemini",
        model,
        checkedAt: new Date().toISOString(),
        rawTextHash: boundedString(job.rawTextHash) || hashString(String(job.rawText || "")),
        strategyHash,
        errorMessage: "Analyse intelligente non configurée.",
      })),
    };
  }

  const invalidReviews = [];
  const validJobs = [];
  for (const job of jobs) {
    if (!job || typeof job.id !== "string" || typeof job.rawText !== "string") {
      invalidReviews.push({
        id: boundedString(job?.id || hashString(JSON.stringify(job || {}))),
        status: "skipped",
        provider: "Gemini",
        model,
        checkedAt: new Date().toISOString(),
        rawTextHash: "",
        strategyHash,
        errorMessage: "Annonce invalide pour l'analyse intelligente.",
      });
    } else {
      validJobs.push(job);
    }
  }

  let reviews = invalidReviews;
  let top3Comparison = null;
  let usedModel = model;
  if (validJobs.length) {
    try {
      const result = await callGeminiForJobs(validJobs, strategy, strategyHash, preferenceMemory);
      reviews = reviews.concat(result.reviews);
      top3Comparison = result.top3Comparison;
      usedModel = result.model || result.reviews.find((review) => review.status === "done")?.model || model;
    } catch (error) {
      const retry = error?.retryAfterSeconds ? ` Réessaie dans environ ${error.retryAfterSeconds}s.` : "";
      const isRateLimit = Number(error?.status) === 429 || /quota|rate/i.test(String(error?.message || ""));
      const message = isRateLimit
        ? `Quota Gemini temporairement atteint.${retry}`
        : boundedString(error?.message || "Analyse intelligente indisponible.");
      reviews = reviews.concat(validJobs.map((job) => ({
        id: job.id,
        status: "error",
        provider: "Gemini",
        model: error?.model || model,
        checkedAt: new Date().toISOString(),
        rawTextHash: boundedString(job.rawTextHash) || hashString(String(job.rawText || "")),
        strategyHash,
        errorMessage: message,
      })));
    }
  }

  return {
    configured: true,
    provider: "Gemini",
    model: usedModel,
    message: reviews.some((review) => review.status === "done")
      ? "Analyse intelligente terminée."
      : (reviews[0]?.errorMessage || "Analyse intelligente indisponible pour cette recherche."),
    reviews,
    top3Comparison,
  };
}

function absoluteUrl(url, base) {
  try {
    return new URL(decodeHtml(url), base).toString();
  } catch {
    return "";
  }
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
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

function shortNetworkError(error) {
  const raw = String(error?.cause?.code || error?.code || error?.cause || error?.message || error || "erreur réseau");
  if (/EACCES|EPERM|permission|forbidden/i.test(raw)) return "Accès réseau refusé";
  if (/ENOTFOUND|DNS|getaddrinfo/i.test(raw)) return "DNS introuvable";
  if (/ECONNREFUSED/i.test(raw)) return "Connexion refusée";
  if (/ETIMEDOUT|timeout|aborted|AbortError/i.test(raw)) return "Délai dépassé";
  if (/fetch failed/i.test(raw)) return "Connexion impossible";
  return raw.slice(0, 120);
}

function isNetworkError(error) {
  const raw = String(error?.cause?.code || error?.code || error?.cause || error?.message || error || "");
  return /EACCES|EPERM|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET|AbortError|fetch failed|network|socket|TLS|SSL/i.test(raw);
}

async function probeUrl(source, url) {
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

async function networkDiagnostics() {
  const representativeNames = new Set(["France Travail", "Hellowork", "Apec", "Jobijoba"]);
  const probes = PUBLIC_SOURCES
    .filter((source) => representativeNames.has(source.name))
    .map((source) => probeUrl(source.name, source.searchUrl("diagnostiqueur immobilier", "")));
  const sources = await Promise.all(probes);
  const okCount = sources.filter((source) => source.ok).length;
  const status = okCount === sources.length ? "ok" : okCount > 0 ? "partial" : "blocked";
  return {
    status,
    checkedAt: new Date().toISOString(),
    message:
      status === "ok"
        ? "Le serveur local arrive à joindre les sources testées."
        : status === "partial"
          ? "Le serveur local joint certaines sources, mais pas toutes."
          : "Le serveur local n’arrive pas à joindre les sites d’emploi. Vérifie le réseau, pare-feu, VPN ou proxy Windows.",
    sources,
  };
}

async function fetchJson(url, options = {}) {
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

function companySignalsFor(company, text = "") {
  const haystack = normalized(`${company} ${text}`);
  const signals = [];
  const add = (condition, label) => {
    if (condition && !signals.includes(label)) signals.push(label);
  };

  add(["franchise", "réseau de franchise", "reseau de franchise", "agent commercial", "licence de marque"].some((term) => haystack.includes(normalized(term))), "franchise / réseau");
  add(["intérim", "interim", "recrutement", "cabinet de recrutement", "travail temporaire"].some((term) => haystack.includes(normalized(term))), "recruteur / intérim");
  add(["bureau veritas", "socotec", "apave", "dekra", "qualiconsult", "groupe", "filiale"].some((term) => haystack.includes(normalized(term))), "groupe technique");
  add(["diagnostic immobilier", "dpe", "amiante", "audit énergétique", "audit energetique"].some((term) => haystack.includes(normalized(term))), "métier diagnostic");
  add(["bailleur", "habitat", "hlm", "office public", "collectivité", "collectivite", "centre hospitalier"].some((term) => haystack.includes(normalized(term))), "public / bailleur");
  add(["bureau d'études", "bureau d'etudes", "ingénierie", "ingenierie", "cabinet"].some((term) => haystack.includes(normalized(term))), "cabinet / ingénierie");
  return signals.slice(0, 8);
}

function estimatedCompanyTypeFor(company, text = "") {
  const signals = companySignalsFor(company, text);
  if (signals.includes("recruteur / intérim")) return "recruteur / intérim";
  if (signals.includes("groupe technique")) return "grand groupe technique";
  if (signals.includes("franchise / réseau")) return "réseau / franchise";
  if (signals.includes("public / bailleur")) return "public / bailleur";
  if (signals.includes("cabinet / ingénierie") || signals.includes("métier diagnostic")) return "cabinet / PME métier";
  return "à vérifier";
}

function decodeSearchUrl(href) {
  const value = decodeHtml(href || "");
  try {
    const url = new URL(value.startsWith("//") ? `https:${value}` : value, "https://duckduckgo.com");
    const redirected = url.searchParams.get("uddg");
    return redirected ? decodeHtml(decodeURIComponent(redirected)) : url.toString();
  } catch {
    return "";
  }
}

function extractSearchUrls(html) {
  const urls = [];
  const hrefPattern = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = hrefPattern.exec(html)) && urls.length < 20) {
    const url = decodeSearchUrl(match[1]);
    if (url && /^https?:\/\//i.test(url) && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

function officialWebsiteCandidate(company, urls) {
  const tokens = normalized(company)
    .replace(/\b(sas|sarl|sa|groupe|france|cabinet|entreprise)\b/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4);
  const excluded = [
    "duckduckgo.",
    "google.",
    "bing.",
    "linkedin.",
    "facebook.",
    "instagram.",
    "wikipedia.",
    "societe.com",
    "pappers.fr",
    "verif.com",
    "francetravail.",
    "hellowork.",
    "indeed.",
  ];
  const candidates = urls.filter((url) => {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return !excluded.some((item) => host.includes(item));
    } catch {
      return false;
    }
  });
  return candidates.find((url) => {
    const host = normalized(new URL(url).hostname.replace(/^www\./, ""));
    return tokens.some((token) => host.includes(token));
  }) || candidates[0] || "";
}

async function buildCompanyProfile(company) {
  const companyName = compact(company);
  const checkedAt = new Date().toISOString();
  const fallbackType = estimatedCompanyTypeFor(companyName);
  const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(`${companyName} entreprise site officiel activité`)}`;
  let searchText = "";
  let website = "";
  let sources = [searchUrl];

  try {
    const search = await fetchText(searchUrl);
    if (search.ok) {
      searchText = stripHtml(search.text).slice(0, 4000);
      const urls = extractSearchUrls(search.text);
      const externalUrls = urls.filter((url) => {
        try {
          const host = new URL(url).hostname;
          return !host.includes("duckduckgo.") && !url.includes("favicon") && !url.includes("/assets/");
        } catch {
          return false;
        }
      });
      website = officialWebsiteCandidate(companyName, externalUrls);
      sources = unique([searchUrl, website, ...externalUrls.slice(0, 4)].filter(Boolean));

      if (website) {
        try {
          const site = await fetchText(website);
          if (site.ok) searchText = `${searchText} ${stripHtml(site.text).slice(0, 2500)}`;
        } catch {
          // The probable site is only a bonus; search result snippets are enough for a partial profile.
        }
      }
    }
  } catch {
    // Keep a local fallback profile if public search is blocked.
  }

  const signals = companySignalsFor(companyName, searchText);
  const estimatedType = estimatedCompanyTypeFor(companyName, searchText) || fallbackType;
  const confidence = website && estimatedType !== "à vérifier" ? "bonne" : website || signals.length || estimatedType !== "à vérifier" ? "moyenne" : "faible";
  const status = website ? "found" : signals.length || estimatedType !== "à vérifier" ? "partial" : "not_found";
  const summary =
    status === "found"
      ? `Entreprise identifiée comme ${estimatedType}. Site probable trouvé.`
      : status === "partial"
        ? `Entreprise estimée comme ${estimatedType}. Vérification manuelle conseillée.`
        : "Aucune fiche fiable trouvée. À vérifier manuellement.";

  return {
    status,
    companyName,
    estimatedType,
    website,
    signals,
    confidence,
    summary,
    checkedAt,
    sources,
  };
}

function ratingSourceLabel(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("glassdoor")) return "Glassdoor";
    if (host.includes("indeed")) return "Indeed";
    if (host.includes("choosemycompany")) return "ChooseMyCompany";
    if (host.includes("gowork")) return "GoWork";
    if (host.includes("google")) return "Google";
    return host;
  } catch {
    return "";
  }
}

function extractEmployerRatingFromText(text) {
  const clean = compact(stripHtml(text || "")).slice(0, 6000);
  const patterns = [
    /(\d(?:[,.]\d)?)\s*\/\s*5\b/i,
    /note\s*(?:globale|employeur)?\s*[:\-]?\s*(\d(?:[,.]\d)?)/i,
    /(\d(?:[,.]\d)?)\s*(?:etoiles|étoiles|stars)\b/i,
    /(\d(?:[,.]\d)?)\s*(?:sur|\/)\s*cinq\b/i,
  ];
  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match?.[1]) {
      const score = Number(String(match[1]).replace(",", "."));
      if (Number.isFinite(score) && score >= 0 && score <= 5) return score;
    }
  }
  return null;
}

async function buildEmployerRating(company) {
  const companyName = compact(company);
  const checkedAt = new Date().toISOString();
  const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(`${companyName} avis employeur note salaires avantages glassdoor indeed`)}`;
  const fallback = {
    score: null,
    label: "Note employeur à vérifier",
    source: "",
    sourceUrl: searchUrl,
    confidence: "faible",
    summary: "Aucune notation employeur fiable trouvée automatiquement.",
    checkedAt,
  };

  try {
    const search = await fetchText(searchUrl);
    if (!search.ok) return fallback;
    const searchText = stripHtml(search.text);
    const urls = extractSearchUrls(search.text);
    const preferred = urls.filter((url) => {
      try {
        const host = new URL(url).hostname;
        return ["glassdoor.", "indeed.", "choosemycompany.", "gowork."].some((item) => host.includes(item));
      } catch {
        return false;
      }
    });
    const candidates = unique([...preferred, ...urls]).slice(0, 4);
    const searchScore = extractEmployerRatingFromText(searchText);

    for (const url of candidates) {
      try {
        const page = await fetchText(url);
        const score = page.ok ? extractEmployerRatingFromText(page.text) : null;
        if (score !== null) {
          const source = ratingSourceLabel(page.finalUrl || url);
          return {
            score,
            label: `${score.toFixed(1).replace(".", ",")}/5`,
            source,
            sourceUrl: page.finalUrl || url,
            confidence: source ? "moyenne" : "faible",
            summary: `Notation employeur repérée sur ${source || "une source publique"}. À vérifier avant décision.`,
            checkedAt,
          };
        }
      } catch {
        // Continue with the next public result.
      }
    }

    if (searchScore !== null) {
      return {
        score: searchScore,
        label: `${searchScore.toFixed(1).replace(".", ",")}/5`,
        source: "résultats publics",
        sourceUrl: searchUrl,
        confidence: "faible",
        summary: "Notation repérée dans les résultats publics, à confirmer sur la source.",
        checkedAt,
      };
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function franceTravailDetailUrl(id) {
  const value = compact(id);
  return value ? `https://candidat.francetravail.fr/offres/recherche/detail/${encodeURIComponent(value)}` : "";
}

function buildRawText(offer) {
  const company = cleanCompanyValue(compact(offer.entreprise?.nom || offer.entreprise?.entrepriseAdaptee || "")) || "Entreprise non précisée";
  const location = compact(offer.lieuTravail?.libelle || offer.lieuTravail?.commune || "Lieu non précisé");
  const contract = compact(offer.typeContratLibelle || offer.typeContrat || "Contrat non précisé");
  const workTime = cleanWorkTimeValue(compact(offer.dureeTravailLibelleConverti || offer.dureeTravailLibelle || offer.dureeTravail || "")) || "Non précisé";
  const salarySource = compact(offer.salaire?.libelle || offer.salaire?.commentaire || "");
  const salary = cleanSalaryValue(salarySource) || "Non indiqué";
  const salaryKind = salaryKindFromText(salarySource) || "non précisé";
  const description = compact(offer.description || "");
  const sourceUrl = compact(offer.origineOffre?.urlOrigine || offer.urlPostulation || franceTravailDetailUrl(offer.id));
  const requiredExperience = findRequiredExperience(
    [offer.experienceLibelle, offer.experienceCommentaire, offer.experienceExige, description].map(compact).filter(Boolean).join("\n"),
  );
  const bonus = findBonus([salarySource, description].filter(Boolean).join("\n"));
  const benefits = findBenefits(description);

  return [
    `Poste : ${compact(offer.intitule || "Offre France Travail")}`,
    `Entreprise : ${company}`,
    `Lieu : ${location}`,
    `Contrat : ${contract}`,
    `Temps de travail : ${workTime}`,
    `Salaire : ${salary}`,
    `Brut / net : ${salaryKind}`,
    `Primes : ${bonus}`,
    `Avantages : ${benefits}`,
    `Expérience demandée : ${requiredExperience}`,
    sourceUrl ? `URL : ${sourceUrl}` : "",
    "",
    description,
  ]
    .filter(Boolean)
    .join("\n");
}

function mapOffer(offer) {
  const now = new Date().toISOString();
  const sourceUrl = compact(offer.origineOffre?.urlOrigine || offer.urlPostulation || franceTravailDetailUrl(offer.id));
  return {
    id: `france-travail-${offer.id || `${compact(offer.intitule)}-${compact(offer.lieuTravail?.libelle)}`}`,
    rawText: buildRawText(offer),
    createdAt: offer.dateCreation || now,
    updatedAt: now,
    favorite: false,
    ignored: false,
    reviewStatus: "a_traiter",
    source: "France Travail",
    sourceUrl,
    datasetLabel: "jeu réel",
  };
}

function extractLinks(html, source, baseUrl, limit) {
  const found = [];
  for (const pattern of source.linkPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(html)) && found.length < limit * 3) {
      const value = match[1] || "";
      const sourceName = normalized(source.name);
      const href = sourceName.includes("indeed") && /^[a-z0-9]+$/i.test(value) && !value.includes("/")
        ? `https://fr.indeed.com/viewjob?jk=${value}`
        : /^\d+$/.test(value)
        ? `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${value}`
        : value.startsWith("?jk=")
          ? `https://fr.indeed.com/viewjob${value}`
          : value;
      const fullUrl = absoluteUrl(href, baseUrl);
      if (fullUrl && isLikelyDetailUrlForSource(source.name, fullUrl) && !found.includes(fullUrl)) found.push(fullUrl);
    }
  }
  return found.slice(0, limit);
}

function parseJobPage(source, url, html) {
  const jsonJob = jsonLdJobPosting(html);
  const pageTitle = firstMatch(html, [/<title[^>]*>([\s\S]*?)<\/title>/i]);
  const metaDescription = firstMatch(html, [
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["'][^>]*>/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  ]);
  const title =
    firstMatch(html, [
      /<h1[^>]*>([\s\S]*?)<\/h1>/i,
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<title[^>]*>([\s\S]*?)<\/title>/i,
    ]) || "Offre importée";
  const bodyDescription = firstMatch(html, [
      /<section[^>]+(?:description|Description)[^>]*>([\s\S]*?)<\/section>/i,
      /<div[^>]+(?:description|Description|jobsearch-JobComponent-description)[^>]*>([\s\S]*?)<\/div>/i,
    ]);
  const pageText = stripHtml(html);
  const description = bodyDescription || metaDescription || stripHtml(html).slice(0, 1800);
  const metadataText = `${title} ${pageTitle} ${description} ${metaDescription} ${pageText.slice(0, 1800)}`;
  const company = cleanCompanyValue(
    compact(nestedValue(jsonJob, ["hiringOrganization", "name"]) || "") ||
      companyFromEmployerBlock(html) ||
      companyFromSourceHtml(source, html) ||
      companyFromNarrative(html) ||
      firstMatch(html, [
        /"hiringOrganization"[\s\S]{0,500}?"name"\s*:\s*"([^"]+)"/i,
        /(?:Entreprise|Société|Employeur)\s*:?\s*<\/?[^>]*>\s*([^<]{2,80})/i,
      ]),
  );
  const location = cleanLocationValue(
    locationFromHtml(html) ||
      locationFromSourceHtml(source, html) ||
      compact(
        nestedValue(jsonJob, ["jobLocation", "address", "addressLocality"]) ||
          nestedValue(jsonJob, ["jobLocation", 0, "address", "addressLocality"]) ||
          "",
      ) ||
      firstMatch(html, [
        /content=["']([^"']{2,100})["'][^>]+itemprop=["']addressLocality["']/i,
        /itemprop=["']addressLocality["'][^>]+content=["']([^"']{2,100})["']/i,
        /(?:Lieu|Localisation|Ville)\s*:?\s*<\/?[^>]*>\s*([^<]{2,80})/i,
        /"addressLocality"\s*:\s*"([^"]+)"/i,
      ]),
    metadataText,
  );
  const contract =
    cleanExtractedValue(compact(jsonJob?.employmentType || "")) ||
    contractFromSourceHtml(source, html) ||
    cleanExtractedValue(firstMatch(html, [/"employmentType"\s*:\s*"([^"]+)"/i, /\b(CDI|CDD|Alternance|Intérim|Interim|Indépendant|Independant)\b/i])) ||
    extractContractFromText(metadataText);
  const workTime = workTimeFromHtml(html, metadataText);
  const salary = cleanSalaryValue(
    salaryFromJsonLd(jsonJob?.baseSalary) ||
      firstMatch(html, [/"baseSalary"[\s\S]{0,220}?"value"\s*:\s*"([^"]+)"/i, /(?:Salaire|Rémunération)\s*:?\s*([^<]{2,160})/i]) ||
      firstMatch(metadataText, [/(?:Salaire|Rémunération)\s*:?\s*([^\n<]{2,160})/i]),
  );
  const salaryKind = salaryKindFromText(html) || salaryKindFromText(metadataText) || salaryKindFromText(salary) || "non précisé";
  const cleanTitle = stripHtml(title).replace(/\s*-\s*(?:LinkedIn|Indeed|Hellowork|France Travail).*$/i, "");
  const cleanDescription = stripHtml(description);
  const requiredExperience = findRequiredExperience(metadataText);
  const bonus = findBonus([salary, metadataText].filter(Boolean).join("\n"));
  const benefits = findBenefits(metadataText);
  const quality = extractionQuality({ title: cleanTitle, company, location, contract, salary, description: cleanDescription });
  const rawText = [
    `Poste : ${cleanTitle}`,
    `Entreprise : ${company || "Entreprise non précisée"}`,
    `Lieu : ${location || "Lieu non précisé"}`,
    `Contrat : ${contract || "Contrat non précisé"}`,
    `Temps de travail : ${workTime || "Non précisé"}`,
    `Salaire : ${salary || "Non indiqué"}`,
    `Brut / net : ${salaryKind}`,
    `Primes : ${bonus}`,
    `Avantages : ${benefits}`,
    `Expérience demandée : ${requiredExperience}`,
    `Source : ${source}`,
    `URL : ${url}`,
    `Qualité extraction : ${quality.label}`,
    quality.notes.length ? `À vérifier : ${quality.notes.join(", ")}` : "",
    "",
    cleanDescription,
  ].filter(Boolean).join("\n");

  return {
    id: `${source.toLowerCase().replace(/\W+/g, "-")}-${hashString(url)}`,
    sourceId: hashString(url),
    rawText,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    favorite: false,
    ignored: false,
    reviewStatus: "a_traiter",
    source,
    sourceUrl: url,
    datasetLabel: "jeu réel",
    extractionQuality: quality.label,
    extractionNotes: quality.notes,
  };
}

function extractionQuality({ title, company, location, contract, salary, description }) {
  const notes = [];
  if (!title || title.includes("Offre importée")) notes.push("titre incertain");
  if (!company) notes.push("entreprise absente");
  if (!location) notes.push("lieu absent");
  if (!contract) notes.push("contrat absent");
  if (!salary) notes.push("salaire absent");
  if (!description || description.length < 260) notes.push("description courte");

  const strongFields = [title, company, location, contract, description && description.length >= 500].filter(Boolean).length;
  const label = notes.length <= 1 && strongFields >= 4 ? "complète" : notes.length <= 3 && strongFields >= 3 ? "partielle" : "à vérifier";
  return { label, notes };
}

function isImportable(job) {
  if (!job || !job.rawText || job.rawText.length < 220) return false;
  if (isSearchResultUrl(job.sourceUrl || "")) return false;
  const title = firstMatch(job.rawText, [/Poste\s*:\s*(.+)/i, /Titre\s*:\s*(.+)/i, /Intitulé\s*:\s*(.+)/i]);
  const titleText = normalized(title);
  if (!titleText || titleText.length < 4 || ["offre importee", "recherche", "emploi", "annonce"].some((term) => titleText === term || titleText.includes(`${term} sans titre`))) return false;
  if (!compact(job.source || "")) return false;
  if (!job.sourceUrl) {
    return Boolean(job.searchUrl) && job.rawText.length >= 700 && title && !normalized(title).includes("offre importee");
  }
  if (job.extractionQuality === "à vérifier" && (!job.sourceUrl || job.rawText.length < 450)) return false;
  return true;
}

function isSearchResultUrl(url) {
  const value = compact(url);
  if (!value) return false;
  return [
    /candidat\.francetravail\.fr\/offres\/recherche(?:\?|$)/i,
    /hellowork\.com\/fr-fr\/emploi\/recherche/i,
    /indeed\.com\/jobs\?/i,
    /linkedin\.com\/jobs(?:\/search|\?)/i,
    /jooble\.org\/SearchResult/i,
    /apec\.fr\/candidat\/recherche-emploi\.html\/emploi(?:\?|$)/i,
    /meteojob\.com\/jobs\?/i,
    /welcometothejungle\.com\/fr\/jobs\?/i,
    /jobijoba\.com\/fr\/query/i,
    /jobijoba\.com\/fr\/emploi(?:\/|$)/i,
    /talent\.com\/jobs\?/i,
    /optioncarriere\.com\/recherche\/emplois/i,
  ].some((pattern) => pattern.test(value));
}

function isLikelyDetailUrlForSource(source, url) {
  const value = compact(url);
  if (!value || isSearchResultUrl(value)) return false;
  const text = normalized(source);
  const patterns = [
    { source: "france travail", pattern: /candidat\.francetravail\.fr\/offres\/recherche\/detail\//i },
    { source: "hellowork", pattern: /hellowork\.com\/fr-fr\/emplois\/[^?#]+\.html/i },
    { source: "indeed", pattern: /indeed\.[^/]+\/(?:viewjob|rc\/clk)/i },
    { source: "linkedin", pattern: /linkedin\.com\/(?:jobs\/view|jobs-guest\/jobs\/api\/jobPosting)\//i },
    { source: "jooble", pattern: /jooble\.org\/(?:desc\/|emploi-)/i },
    { source: "apec", pattern: /apec\.fr\/candidat\/recherche-emploi\.html\/emploi\/detail-offre\//i },
    { source: "meteojob", pattern: /meteojob\.com\/(?:candidat\/offres\/offre-d-emploi|jobs\/[^?/#]+)/i },
    { source: "welcome", pattern: /welcometothejungle\.com\/fr\/companies\/[^/]+\/jobs\//i },
    { source: "jobijoba", pattern: /jobijoba\.com\/fr\/annonce\//i },
    { source: "talent", pattern: /talent\.com\/(?:view|jobs)\?id=/i },
    { source: "optioncarriere", pattern: /optioncarriere\.com\/(?:jobad|emploi)\//i },
  ];
  const candidate = patterns.find((item) => text.includes(item.source));
  return candidate ? candidate.pattern.test(value) : true;
}

function sourceReportMessage(source, status, stats) {
  const count = Number(stats.count || 0);
  const skipped = Number(stats.skippedCount || 0);
  if (count > 0) {
    const details = [];
    if (skipped) details.push(`${skipped} Ã©cartÃ©e${skipped > 1 ? "s" : ""}`);
    if (stats.poorQualityCount) details.push(`${stats.poorQualityCount} trop pauvre${stats.poorQualityCount > 1 ? "s" : ""}`);
    return `${source} : ${count} offre${count > 1 ? "s" : ""}${details.length ? `, ${details.join(", ")}` : ""}.`;
  }
  if (status === "blocked") return `${source} : lecture bloquÃ©e ou indisponible.`;
  if (stats.detailLinkCount === 0 && stats.foundCount > 0) return `${source} : rÃ©sultats visibles mais aucun lien d'annonce fiable.`;
  if (stats.poorQualityCount > 0) return `${source} : offres trouvÃ©es mais trop pauvres pour un tri fiable.`;
  if (skipped > 0) return `${source} : offres Ã©cartÃ©es par filtres ou qualitÃ©.`;
  return `${source} : aucune offre exploitable.`;
}

function sourceReportMessageClean(source, status, stats) {
  const count = Number(stats.count || 0);
  const skipped = Number(stats.skippedCount || 0);
  if (count > 0) {
    const details = [];
    if (skipped) details.push(`${skipped} ecartée${skipped > 1 ? "s" : ""}`);
    if (stats.poorQualityCount) details.push(`${stats.poorQualityCount} trop pauvre${stats.poorQualityCount > 1 ? "s" : ""}`);
    return `${source} : ${count} offre${count > 1 ? "s" : ""}${details.length ? `, ${details.join(", ")}` : ""}.`;
  }
  if (status === "blocked") return `${source} : lecture bloquée ou indisponible.`;
  if (stats.detailLinkCount === 0 && stats.foundCount > 0) return `${source} : résultats visibles mais aucun lien d'annonce fiable.`;
  if (stats.poorQualityCount > 0) return `${source} : offres trouvées mais trop pauvres pour un tri fiable.`;
  if (skipped > 0) return `${source} : offres écartées par filtres ou qualité.`;
  return `${source} : aucune offre exploitable.`;
}

function parseInlineCards(source, html, searchUrl, limit) {
  if (normalized(source).includes("france travail")) return [];

  const titleMatches = [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)]
    .map((match) => {
      const title = stripHtml(match[1]);
      const start = Math.max(0, match.index - 900);
      const end = Math.min(html.length, match.index + 2200);
      const snippet = stripHtml(html.slice(start, end));
      return { title, snippet };
    })
    .filter(({ title, snippet }) => title.length > 8 && title.length < 140 && snippet.length >= 280)
    .slice(0, limit);

  return titleMatches.map(({ title, snippet }) => {
    const rawText = [
      `Poste : ${title}`,
      "Entreprise : Entreprise non précisée",
      "Lieu : Lieu non précisé",
      "Contrat : Contrat non précisé",
      "Salaire : Non indiqué",
      "Primes : Non mentionnées",
      "Avantages : Non mentionnés",
      "Expérience demandée : Non précisée",
      `Source : ${source}`,
      "Qualité extraction : à vérifier",
      "À vérifier : détails extraits depuis une carte de résultat",
      "",
      snippet.slice(0, 1400),
    ].join("\n");

    return {
      id: `${source.toLowerCase().replace(/\W+/g, "-")}-${hashString(`${title}-${searchUrl}`)}`,
      sourceId: hashString(`${title}-${searchUrl}`),
      rawText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      favorite: false,
      ignored: false,
      reviewStatus: "a_traiter",
      source,
      sourceUrl: "",
      searchUrl,
      datasetLabel: "jeu réel",
      extractionQuality: "à vérifier",
      extractionNotes: ["détails extraits depuis une carte de résultat"],
    };
  });
}

async function searchPublicSourceOnce(source, keywords, location, perSourceLimit) {
  if (normalized(source.name).includes("apec")) {
    return searchApecSourceOnce(source, keywords, perSourceLimit);
  }

  const searchUrl = source.searchUrl(keywords, location);
  const searchPage = await fetchText(searchUrl);
  if (!searchPage.ok) {
    return { source: source.name, jobs: [], skippedCount: 0, status: "blocked", message: `${source.name} indisponible (${searchPage.status}).` };
  }

  const detailLinks = extractLinks(searchPage.text, source, searchPage.finalUrl || searchUrl, perSourceLimit);
  const detailJobs = [];
  let skippedCount = 0;
  for (const link of detailLinks) {
    try {
      const detail = await fetchText(link);
      if (detail.ok) {
        const job = parseJobPage(source.name, detail.finalUrl || link, detail.text);
        if (isImportable(job)) detailJobs.push(job);
        else skippedCount += 1;
      }
    } catch {
      // Public job boards can throttle or block individual detail pages.
    }
  }

  const candidates = detailJobs.length ? detailJobs : parseInlineCards(source.name, searchPage.text, searchUrl, perSourceLimit);
  const jobs = candidates.filter((job) => {
    const keep = isImportable(job);
    if (!keep) skippedCount += 1;
    return keep;
  });
  return {
    source: source.name,
    jobs,
    foundCount: detailLinks.length || candidates.length,
    detailLinkCount: detailLinks.length,
    missingDetailCount: detailLinks.length ? 0 : candidates.length,
    poorQualityCount: skippedCount,
    skippedCount,
    status: jobs.length ? "ok" : "empty",
    message: jobs.length ? `${source.name} : ${jobs.length} offre${jobs.length > 1 ? "s" : ""}.` : `${source.name} : aucune offre assez complète.`,
  };
}

async function searchPublicSourceOnceReliable(source, keywords, location, perSourceLimit) {
  if (normalized(source.name).includes("apec")) {
    return searchApecSourceOnce(source, keywords, perSourceLimit);
  }

  const searchUrl = source.searchUrl(keywords, location);
  const searchPage = await fetchText(searchUrl);
  if (!searchPage.ok) {
    return {
      source: source.name,
      jobs: [],
      foundCount: 0,
      detailLinkCount: 0,
      missingDetailCount: 0,
      poorQualityCount: 0,
      skippedCount: 0,
      status: "blocked",
      message: `${source.name} indisponible (${searchPage.status}).`,
    };
  }

  const detailLinks = extractLinks(searchPage.text, source, searchPage.finalUrl || searchUrl, perSourceLimit);
  const detailJobs = [];
  let skippedCount = 0;
  let poorQualityCount = 0;

  for (const link of detailLinks) {
    try {
      const detail = await fetchText(link);
      if (detail.ok) {
        const detailUrl = detail.finalUrl || link;
        const job = parseJobPage(source.name, detailUrl, detail.text);
        if (isLikelyDetailUrlForSource(source.name, job.sourceUrl || detailUrl) && isImportable(job)) detailJobs.push(job);
        else {
          skippedCount += 1;
          poorQualityCount += 1;
        }
      } else {
        skippedCount += 1;
      }
    } catch {
      skippedCount += 1;
    }
  }

  const inlineCandidates = detailLinks.length ? [] : parseInlineCards(source.name, searchPage.text, searchUrl, perSourceLimit);
  const candidates = detailJobs.length ? detailJobs : inlineCandidates;
  const jobs = candidates.filter((job) => {
    const keep = isImportable(job);
    if (!keep) {
      skippedCount += 1;
      poorQualityCount += 1;
    }
    return keep;
  });
  const foundCount = detailLinks.length || inlineCandidates.length;
  const missingDetailCount = detailLinks.length ? 0 : inlineCandidates.length;
  const status = jobs.length ? "ok" : "empty";
  return {
    source: source.name,
    jobs,
    foundCount,
    detailLinkCount: detailLinks.length,
    missingDetailCount,
    poorQualityCount,
    skippedCount,
    status,
    message: sourceReportMessageClean(source.name, status, {
      count: jobs.length,
      foundCount,
      detailLinkCount: detailLinks.length,
      missingDetailCount,
      poorQualityCount,
      skippedCount,
    }),
  };
}

async function searchPublicSource(source, queryPairs, perSourceLimit) {
  const jobs = [];
  const seen = new Set();
  let skippedCount = 0;
  let blockedCount = 0;
  let foundCount = 0;
  let detailLinkCount = 0;
  let missingDetailCount = 0;
  let poorQualityCount = 0;

  for (const pair of queryPairs) {
    if (jobs.length >= perSourceLimit) break;
    const result = await searchPublicSourceOnceReliable(source, pair.keywords, pair.location, Math.max(1, perSourceLimit - jobs.length));
    skippedCount += Number(result.skippedCount || 0);
    foundCount += Number(result.foundCount || 0);
    detailLinkCount += Number(result.detailLinkCount || 0);
    missingDetailCount += Number(result.missingDetailCount || 0);
    poorQualityCount += Number(result.poorQualityCount || 0);
    if (result.status === "blocked") blockedCount += 1;

    for (const job of result.jobs) {
      const key = job.sourceUrl || job.sourceId || job.rawText.slice(0, 180);
      if (!seen.has(key)) {
        seen.add(key);
        jobs.push(job);
      }
      if (jobs.length >= perSourceLimit) break;
    }
  }

  const status = jobs.length ? "ok" : blockedCount === queryPairs.length ? "blocked" : "empty";
  return {
    source: source.name,
    jobs,
    foundCount,
    detailLinkCount,
    missingDetailCount,
    poorQualityCount,
    skippedCount,
    status,
    message: jobs.length
      ? `${source.name} : ${jobs.length} offre${jobs.length > 1 ? "s" : ""} avec recherche large.`
      : status === "blocked"
        ? `${source.name} : lecture bloquée.`
        : `${source.name} : aucune offre assez complète.`,
  };
}

async function searchPublicJobs(requestUrl) {
  const startedAt = Date.now();
  const keywords = compact(requestUrl.searchParams.get("keywords") || "diagnostiqueur immobilier");
  const location = compact(requestUrl.searchParams.get("location") || "");
  const smartSearch = requestUrl.searchParams.get("smartSearch") !== "0";
  const smartLocation = requestUrl.searchParams.get("smartLocation") !== "0";
  const experienceLevel = compact(requestUrl.searchParams.get("experienceLevel") || "debutant_reconversion");
  const requiredPoei = requestUrl.searchParams.get("requiredPoei") === "1";
  const requiredAudit = requestUrl.searchParams.get("requiredAudit") === "1";
  const limit = Math.max(1, Math.min(50, Number(requestUrl.searchParams.get("limit") || 25)));
  const perSourceLimit = Math.max(1, Math.ceil(limit / PUBLIC_SOURCES.length));
  const aiKeywords = unique(requestUrl.searchParams.getAll("aiKeyword").map((keyword) => compact(keyword)).filter(Boolean)).slice(0, 8);
  const localKeywordVariants = unique(
    buildKeywordVariants(keywords, smartSearch, experienceLevel).flatMap((keyword) =>
      expandRequiredTerms(keyword, requiredPoei, requiredAudit, smartSearch),
    ),
  );
  const aiKeywordVariants = unique(
    aiKeywords.flatMap((keyword) => expandRequiredTerms(keyword, requiredPoei, requiredAudit, smartSearch)),
  );
  const keywordVariants = unique([...aiKeywordVariants, ...localKeywordVariants]);
  const locationVariants = buildLocationVariants(location, smartLocation);
  const queryPairs = buildQueryPairs(keywordVariants, locationVariants);
  const reports = await Promise.allSettled(PUBLIC_SOURCES.map((source) => searchPublicSource(source, queryPairs, perSourceLimit)));
  const sourceReports = reports.map((report, index) => {
    const value = report.status === "fulfilled"
      ? report.value
      : {
          source: PUBLIC_SOURCES[index].name,
          jobs: [],
          skippedCount: 0,
          foundCount: 0,
          detailLinkCount: 0,
          missingDetailCount: 0,
          poorQualityCount: 0,
          networkErrorCount: isNetworkError(report.reason) ? 1 : 0,
          status: "blocked",
          message: `${PUBLIC_SOURCES[index].name} : ${isNetworkError(report.reason) ? shortNetworkError(report.reason) : "lecture impossible"}.`,
        };
    const strictJobs = value.jobs.filter((job) => matchesRequiredSignals(job, requiredPoei, requiredAudit));
    const strictSkipped = value.jobs.length - strictJobs.length;
    const requirementMessage = strictSkipped
      ? ` ${strictSkipped} écartée${strictSkipped > 1 ? "s" : ""} par filtre obligatoire.`
      : "";
    return {
      ...value,
      jobs: strictJobs,
      skippedCount: Number(value.skippedCount || 0) + strictSkipped,
      foundCount: Number(value.foundCount || 0),
      detailLinkCount: Number(value.detailLinkCount || 0),
      missingDetailCount: Number(value.missingDetailCount || 0),
      poorQualityCount: Number(value.poorQualityCount || 0),
      networkErrorCount: Number(value.networkErrorCount || 0),
      requiredFilterCount: strictSkipped,
      status: strictJobs.length ? value.status : value.status === "blocked" ? "blocked" : "empty",
      message: `${sourceReportMessageClean(value.source, strictJobs.length ? value.status : value.status === "blocked" ? "blocked" : "empty", {
        count: strictJobs.length,
        foundCount: Number(value.foundCount || 0),
        detailLinkCount: Number(value.detailLinkCount || 0),
        missingDetailCount: Number(value.missingDetailCount || 0),
        poorQualityCount: Number(value.poorQualityCount || 0),
        skippedCount: Number(value.skippedCount || 0) + strictSkipped,
      })}${requirementMessage}`,
    };
  });
  const seen = new Set();
  const jobs = sourceReports
    .flatMap((report) => report.jobs)
    .filter((job) => {
      const title = firstMatch(job.rawText, [/Poste\s*:\s*(.+)/i]);
      const company = firstMatch(job.rawText, [/Entreprise\s*:\s*(.+)/i]);
      const key = job.sourceUrl || job.sourceId || `${job.source}-${title}-${company}` || job.rawText.slice(0, 180);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
  const networkBlocked =
    !jobs.length &&
    sourceReports.length > 0 &&
    sourceReports.every((report) => report.status === "blocked" && Number(report.networkErrorCount || 0) > 0);
  const networkPartial =
    !networkBlocked &&
    sourceReports.some((report) => Number(report.networkErrorCount || 0) > 0);
  const networkMessage = "Le serveur local n’arrive pas à joindre les sites d’emploi. Vérifie le réseau, pare-feu, VPN ou proxy Windows.";
  const partialNetworkMessage = "Certaines sources sont injoignables depuis le serveur local, la recherche continue avec les autres.";

  const result = {
    source: "Sites publics",
    sourceQuery: [
      keywordVariants.slice(0, 4).join(" · "),
      locationVariants[0] ? locationVariants.slice(0, 4).join(" · ") : "Toute la France",
    ].join(" · "),
    status: jobs.length ? "readyWithLocalOffers" : "needsConnector",
    offers: jobs.map((job) => job.rawText),
    jobs,
    networkStatus: networkBlocked ? "blocked" : networkPartial ? "partial" : jobs.length ? "ok" : undefined,
    networkMessage: networkBlocked ? networkMessage : networkPartial ? partialNetworkMessage : undefined,
    sourceReports: sourceReports.map(({
      source,
      jobs: sourceJobs,
      message,
      status,
      skippedCount,
      foundCount,
      detailLinkCount,
      missingDetailCount,
      poorQualityCount,
      networkErrorCount,
      requiredFilterCount,
    }) => ({
      source,
      count: sourceJobs.length,
      message,
      status,
      skippedCount,
      foundCount,
      detailLinkCount,
      missingDetailCount,
      poorQualityCount,
      networkErrorCount,
      requiredFilterCount,
    })),
    skippedCount: sourceReports.reduce((total, report) => total + Number(report.skippedCount || 0), 0),
    message: networkBlocked
      ? networkMessage
      : jobs.length
        ? `${jobs.length} offre${jobs.length > 1 ? "s" : ""} trouvée${jobs.length > 1 ? "s" : ""} sur les sites publics.`
        : "Aucune offre lisible automatiquement. Les sites peuvent bloquer la lecture automatique ; l’import manuel reste disponible.",
  };
  writeDiagnostic("search", {
    action: "public-search",
    status: result.status,
    networkStatus: result.networkStatus || "none",
    durationMs: Date.now() - startedAt,
    keywords: safeLogText(keywords, 120),
    location: safeLogText(location, 80),
    aiKeywordCount: aiKeywords.length,
    queryPairCount: queryPairs.length,
    sourceCount: sourceReports.length,
    jobCount: jobs.length,
    skippedCount: result.skippedCount,
    blockedSources: sourceReports.filter((report) => report.status === "blocked").map((report) => report.source),
  });
  return result;
}

function serveStatic(pathname, res) {
  const requestPath = pathname === "/" && existsSync(join(ROOT, "dist", "index.html"))
    ? "/dist/index.html"
    : pathname.startsWith("/assets/")
      ? `/dist${pathname}`
      : pathname === "/"
        ? "/taf-sniffer.html"
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

async function searchOfficialJobs(requestUrl) {
  const token = await getAccessToken();
  const keywords = compact(requestUrl.searchParams.get("keywords") || "diagnostiqueur immobilier");
  const location = compact(requestUrl.searchParams.get("location") || "");
  const limit = Math.max(1, Math.min(50, Number(requestUrl.searchParams.get("limit") || 25)));
  const sourceQuery = location ? `${keywords} · ${location}` : keywords;
  const params = new URLSearchParams({
    motsCles: location ? `${keywords} ${location}` : keywords,
    range: `0-${limit - 1}`,
  });

  const department = compact(requestUrl.searchParams.get("department") || "");
  if (/^\d{2,3}$/.test(department)) params.set("departement", department);

  const response = await fetch(`${API_BASE}${SEARCH_PATH}?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Recherche France Travail impossible (${response.status}).`);
    error.code = "search_failed";
    error.details = text.slice(0, 300);
    throw error;
  }

  const payload = await response.json();
  const resultats = Array.isArray(payload.resultats) ? payload.resultats : Array.isArray(payload) ? payload : [];
  const jobs = resultats.map(mapOffer).filter((job) => job.rawText.length > 80);

  return {
    source: "France Travail",
    sourceQuery,
    status: jobs.length ? "readyWithLocalOffers" : "error",
    offers: jobs.map((job) => job.rawText),
    jobs,
    message: jobs.length
      ? `${jobs.length} offre${jobs.length > 1 ? "s" : ""} France Travail chargée${jobs.length > 1 ? "s" : ""}.`
      : "Aucune offre France Travail trouvée pour ces critères.",
  };
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return json(res, 204, {});

  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || `127.0.0.1:${PORT}`}`);
  const startedAt = Date.now();
  res.on("finish", () => {
    const pathname = requestUrl.pathname.startsWith("/assets/") ? "/assets/*" : requestUrl.pathname;
    writeDiagnostic("server", {
      method: req.method,
      path: pathname,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  try {
    if (req.method === "GET" && requestUrl.pathname === "/health") {
      return json(res, 200, { ok: true, configured: configured(), source: "Sites publics", sources: PUBLIC_SOURCES.map((source) => source.name) });
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/diagnostics") {
      pruneDiagnostics();
      return json(res, 200, diagnosticsSummary());
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/network-diagnostics") {
      return json(res, 200, await networkDiagnostics());
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/search-jobs") {
      return json(res, 200, await searchPublicJobs(requestUrl));
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/ai/analyze-jobs") {
      return json(res, 200, await analyzeJobsWithGemini(req));
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/ai/search-plan") {
      return json(res, 200, await buildAiSearchPlan(req));
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/company-profile") {
      const company = cleanCompanyValue(requestUrl.searchParams.get("company") || "");
      if (!company) {
        return json(res, 400, { error: { code: "missing_company", message: "Entreprise non précisée." } });
      }
      return json(res, 200, await buildCompanyProfile(company));
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/employer-rating") {
      const company = cleanCompanyValue(requestUrl.searchParams.get("company") || "");
      if (!company) {
        return json(res, 400, { error: { code: "missing_company", message: "Entreprise non précisée." } });
      }
      return json(res, 200, await buildEmployerRating(company));
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/search-jobs-official") {
      return json(res, 200, await searchOfficialJobs(requestUrl));
    }

    if (req.method === "GET" && serveStatic(decodeURIComponent(requestUrl.pathname), res)) {
      return;
    }

    return json(res, 404, { error: { code: "not_found", message: "Route inconnue." } });
  } catch (error) {
    const status = error.code === "missing_credentials" ? 503 : 502;
    writeDiagnostic("error", {
      method: req.method,
      path: requestUrl.pathname,
      statusCode: status,
      code: error.code || "proxy_error",
      message: safeLogText(error.message || error),
      details: safeLogText(error.details || "", 220),
    });
    return json(res, status, {
      error: {
        code: error.code || "proxy_error",
        message: error.message || "Erreur proxy.",
      },
    });
  }
});

server.listen(PORT, HOST, () => {
  pruneDiagnostics();
  console.log(`Taf Sniffer proxy running on http://${HOST}:${PORT}`);
  if (DIAGNOSTICS_ENABLED) console.log(`Diagnostics logs: ${DIAGNOSTICS_DIR}`);
});
