import type { JobRecord, JobSearchProvider, SearchProviderResult, Strategy } from "./types";
import { androidProxyBase, isAndroidRuntime } from "./buildFlags";
import { generateSearchQueries } from "./searchQueries";
import { fetchWithTimeout } from "./fetchWithTimeout";

const splitDraftOffers = (text: string) =>
  text
    .split(/\n\s*(?:---|###)\s*\n/g)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 40);

export const runPreparedSearch = (
  strategy: Strategy,
  existingJobs: JobRecord[],
  draftText: string,
): SearchProviderResult => {
  const queryPlan = generateSearchQueries(strategy);
  const sourceQuery = queryPlan.keywords.slice(0, 5).join(" · ");
  const offers = splitDraftOffers(draftText);

  if (offers.length > 0) {
    return {
      source: "Taf Sniffer local",
      sourceQuery,
      status: "readyWithLocalOffers",
      offers,
      message: `${offers.length} offre${offers.length > 1 ? "s" : ""} prête${offers.length > 1 ? "s" : ""} pour analyse locale.`,
    };
  }

  if (existingJobs.length > 0) {
    return {
      source: "Taf Sniffer local",
      sourceQuery,
      status: "readyWithLocalOffers",
      offers: [],
      message: "Recherche relancée dans l’app : classement et Top 3 recalculés.",
    };
  }

  return {
    source: "Recherche prête",
    sourceQuery,
    status: "needsConnector",
    offers: [],
    message: "Taf Sniffer ne charge pas encore les offres automatiquement.",
  };
};

export const preparedConnectorProvider: JobSearchProvider = {
  search: runPreparedSearch,
};

export const proxyBase = () => {
  if (isAndroidRuntime()) return androidProxyBase;
  const currentHost = window.location.host;
  if (window.location.protocol === "file:" || !/^(127\.0\.0\.1|localhost):8787$/.test(currentHost)) {
    return "http://127.0.0.1:8787";
  }
  return "";
};

export const shouldTryProxy = () => !isAndroidRuntime() || Boolean(androidProxyBase);

const androidNoProxyResult = (localResult: SearchProviderResult, existingJobs: JobRecord[]): SearchProviderResult => {
  if (existingJobs.length > 0) {
    return {
      ...localResult,
      status: "readyWithLocalOffers",
      networkStatus: "blocked",
      message: "Mode Android : le proxy local du PC n'est pas joignable. Les offres déjà présentes ont été reclassées.",
    };
  }

  return {
    ...localResult,
    status: "needsConnector",
    networkStatus: "blocked",
    message: "Mode Android : Gemini peut préparer et analyser, mais l'import automatique d'offres demande un proxy distant. Colle une annonce dans Analyse express ou configure VITE_ANDROID_PROXY_BASE.",
  };
};

export const franceTravailProxyProvider: JobSearchProvider = {
  async search(strategy, existingJobs, draftText) {
    const localResult = runPreparedSearch(strategy, existingJobs, draftText);
    if (localResult.offers.length > 0) return localResult;
    if (!shouldTryProxy()) return androidNoProxyResult(localResult, existingJobs);

    try {
      const params = new URLSearchParams({
        keywords: strategy.targetJob || "diagnostiqueur immobilier",
        location: strategy.location || "",
        limit: "25",
        smartSearch: strategy.smartSearch === false ? "0" : "1",
        smartLocation: strategy.smartLocation === false ? "0" : "1",
        experienceLevel: strategy.experienceLevel || "debutant_reconversion",
        requiredPoei: strategy.poeiRequirement === "required" ? "1" : "0",
        requiredAudit: strategy.auditRequirement === "required" ? "1" : "0",
      });
      (strategy.aiSearchQueries || []).slice(0, 8).forEach((query) => {
        if (query.trim()) params.append("aiKeyword", query.trim());
      });
      const response = await fetchWithTimeout(`${proxyBase()}/api/search-jobs?${params}`, {}, 5000);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (existingJobs.length > 0) {
          return {
            ...localResult,
            status: "readyWithLocalOffers",
            message: "Recherche automatique indisponible pour l’instant. Les offres déjà présentes ont été reclassées.",
          };
        }

        return {
          ...localResult,
          status: "needsConnector",
          message: payload?.error?.message || "Recherche officielle indisponible pour l’instant. Tu peux coller une annonce dans Analyse express.",
        };
      }

      const providerMessage = payload.networkStatus === "blocked"
        ? (payload.networkMessage || "Le serveur local n'arrive pas à joindre les sites d'emploi.")
        : payload.networkStatus === "partial" && payload.networkMessage
          ? payload.networkMessage
        : payload.message || "Offres publiques chargées.";

      return {
        source: payload.source || "France Travail",
        sourceQuery: payload.sourceQuery || localResult.sourceQuery,
        status: payload.status || "readyWithLocalOffers",
        offers: Array.isArray(payload.offers) ? payload.offers : [],
        jobs: Array.isArray(payload.jobs) ? payload.jobs : [],
        sourceReports: Array.isArray(payload.sourceReports) ? payload.sourceReports : [],
        skippedCount: Number(payload.skippedCount || 0),
        networkStatus: payload.networkStatus,
        networkMessage: payload.networkMessage,
        message: providerMessage,
      };
    } catch {
      if (existingJobs.length > 0) {
        return {
          ...localResult,
          status: "readyWithLocalOffers",
          message: "Recherche automatique indisponible pour l’instant. Les offres déjà présentes ont été reclassées.",
        };
      }

      return {
        ...localResult,
        status: "needsConnector",
        message: "Recherche officielle indisponible pour l’instant. Tu peux coller une annonce dans Analyse express.",
      };
    }
  },
};
