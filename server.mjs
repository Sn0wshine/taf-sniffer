import http from "node:http";
import { URL } from "node:url";
import { DIAGNOSTICS_DIR, DIAGNOSTICS_ENABLED, HOST, PORT } from "./server/config.mjs";
import { buildDiagnosticsSummary, pruneDiagnostics, safeLogText, writeDiagnostic } from "./server/diagnostics.mjs";
import { json } from "./server/http.mjs";
import { searchPublicJobs } from "./server/scrapers/engine.mjs";
import { networkDiagnostics } from "./server/scrapers/network.mjs";
import { PUBLIC_SOURCES } from "./server/scrapers/sources.mjs";
import { cleanCompanyValue } from "./server/scrapers/utils.mjs";
import { buildCompanyProfile, buildEmployerRating, searchCompanyGouv } from "./server/services/company.mjs";
import { configured, searchOfficialJobs } from "./server/services/france-travail.mjs";
import {
  analyzeJobsWithGemini,
  buildAiSearchPlan,
  geminiLimitFor,
  geminiModelChain,
  geminiUsage,
  searchPlanModelChain,
} from "./server/services/gemini.mjs";
import { serveStatic } from "./server/static.mjs";

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
      return json(res, 200, {
        ok: true,
        configured: configured(),
        source: "Sites publics",
        sources: PUBLIC_SOURCES.map((source) => source.name),
      });
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/diagnostics") {
      pruneDiagnostics();
      return json(
        res,
        200,
        buildDiagnosticsSummary({
          geminiModelChain,
          searchPlanModelChain,
          geminiUsage,
          geminiLimitFor,
        }),
      );
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

    if (req.method === "GET" && requestUrl.pathname === "/api/company-info") {
      const q = (requestUrl.searchParams.get("q") || "").trim();
      if (!q) return json(res, 400, { error: { code: "missing_q", message: "Paramètre q requis." } });
      try {
        const data = await searchCompanyGouv(q);
        return json(res, 200, data);
      } catch (err) {
        const status = err.status || 503;
        return json(res, status, { error: { code: err.code || "api_error", message: err.message || "API entreprises non joignable." } });
      }
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
