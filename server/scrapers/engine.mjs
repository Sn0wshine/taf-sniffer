import { SOURCE_COOLDOWN_MS } from "../config.mjs";
import { safeLogText, writeDiagnostic } from "../diagnostics.mjs";
import { configured, fetchOfficialFranceTravailRaw } from "../services/france-travail.mjs";
import { isNetworkError, shortNetworkError, sourceCooldownUntil } from "./network.mjs";
import { PUBLIC_SOURCES, searchPublicSource } from "./sources.mjs";
import {
  buildKeywordVariants,
  buildLocationVariants,
  buildQueryPairs,
  compact,
  expandRequiredTerms,
  interleave,
  jobFingerprint,
  matchesRequiredSignals,
  normalized,
  sourceReportMessageClean,
  unique,
} from "./utils.mjs";

export async function searchPublicJobs(requestUrl) {
  const startedAt = Date.now();
  const keywords = compact(requestUrl.searchParams.get("keywords") || "diagnostiqueur immobilier");
  const location = compact(requestUrl.searchParams.get("location") || "");
  const smartSearch = requestUrl.searchParams.get("smartSearch") !== "0";
  const smartLocation = requestUrl.searchParams.get("smartLocation") !== "0";
  const experienceLevel = compact(requestUrl.searchParams.get("experienceLevel") || "debutant_reconversion");
  const requiredPoei = requestUrl.searchParams.get("requiredPoei") === "1";
  const requiredAudit = requestUrl.searchParams.get("requiredAudit") === "1";
  const limit = Math.max(1, Math.min(80, Number(requestUrl.searchParams.get("limit") || 25)));
  const perSourceLimit = Math.max(12, Math.ceil(limit / 4));
  const aiKeywords = unique(requestUrl.searchParams.getAll("aiKeyword").map((keyword) => compact(keyword)).filter(Boolean)).slice(0, 8);
  const localKeywordVariants = unique(
    buildKeywordVariants(keywords, smartSearch, experienceLevel).flatMap((keyword) =>
      expandRequiredTerms(keyword, requiredPoei, requiredAudit, smartSearch),
    ),
  );
  const aiKeywordVariants = unique(
    aiKeywords.flatMap((keyword) => expandRequiredTerms(keyword, requiredPoei, requiredAudit, smartSearch)),
  );
  const keywordVariants = unique(interleave(aiKeywordVariants, localKeywordVariants));
  const locationVariants = buildLocationVariants(location, smartLocation);
  const queryPairs = buildQueryPairs(keywordVariants, locationVariants);
  const useOfficial = configured();
  const scrapeSources = useOfficial
    ? PUBLIC_SOURCES.filter((source) => !normalized(source.name).includes("france travail"))
    : PUBLIC_SOURCES;
  const now = Date.now();
  const eligibleSources = scrapeSources.filter((source) => (sourceCooldownUntil.get(source.name) || 0) <= now);
  const activeSources = eligibleSources.length ? eligibleSources : scrapeSources;
  const skippedForCooldown = scrapeSources.length - activeSources.length;
  console.log(`[search] "${keywords}"${location ? ` @ ${location}` : ""} — ${queryPairs.length} paires de requêtes, limit=${limit}, perSource=${perSourceLimit}, FT_API=${useOfficial ? "on" : "off (credentials manquants)"}${skippedForCooldown ? `, ${skippedForCooldown} source(s) en cooldown` : ""}`);

  const [officialRaw, reports] = await Promise.all([
    useOfficial ? fetchOfficialFranceTravailRaw(keywords, location, limit, experienceLevel) : Promise.resolve(null),
    Promise.allSettled(activeSources.map((source) => searchPublicSource(source, queryPairs, perSourceLimit))),
  ]);
  const rawValues = [];
  if (officialRaw) rawValues.push(officialRaw);
  reports.forEach((report, index) => {
    const value = report.status === "fulfilled"
      ? report.value
      : {
          source: activeSources[index].name,
          jobs: [],
          skippedCount: 0,
          foundCount: 0,
          detailLinkCount: 0,
          missingDetailCount: 0,
          poorQualityCount: 0,
          networkErrorCount: isNetworkError(report.reason) ? 1 : 0,
          status: "blocked",
          message: `${activeSources[index].name} : ${isNetworkError(report.reason) ? shortNetworkError(report.reason) : "lecture impossible"}.`,
        };
    if (value.status === "blocked") sourceCooldownUntil.set(value.source, now + SOURCE_COOLDOWN_MS);
    else sourceCooldownUntil.delete(value.source);
    rawValues.push(value);
  });
  const sourceReports = rawValues.map((value) => {
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
  for (const r of sourceReports) {
    const flag = r.status === "blocked" ? "✗" : r.jobs.length ? "✓" : "—";
    const parts = [
      r.jobs.length ? `${r.jobs.length} ok` : null,
      r.foundCount ? `${r.foundCount} trouvées` : null,
      Number(r.skippedCount) ? `${r.skippedCount} écartées` : null,
      Number(r.poorQualityCount) ? `${r.poorQualityCount} basse qualité` : null,
      Number(r.missingDetailCount) ? `${r.missingDetailCount} sans détail` : null,
      Number(r.networkErrorCount) ? `RÉSEAU ERR` : null,
    ].filter(Boolean).join(" · ");
    console.log(`  ${flag} ${r.source.padEnd(22)} ${parts || r.status}`);
  }
  const urlSeen = new Set();
  const fpMap = new Map();
  for (const report of sourceReports) {
    for (const job of report.jobs) {
      const urlKey = job.sourceUrl || job.sourceId;
      if (urlKey && urlSeen.has(urlKey)) continue;
      if (urlKey) urlSeen.add(urlKey);
      const fp = jobFingerprint(job.rawText || "");
      const mapKey = fp || `_${urlKey || Math.random().toString(36)}`;
      if (fp && fpMap.has(fp)) {
        const primary = fpMap.get(fp);
        if (!primary.alsoFoundOn) primary.alsoFoundOn = [];
        primary.alsoFoundOn.push(job.source || "autre source");
      } else {
        fpMap.set(mapKey, job);
      }
    }
  }
  const jobs = [...fpMap.values()].slice(0, limit);
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
  console.log(`[search] => ${jobs.length} offres au total en ${Date.now() - startedAt}ms (réseau: ${result.networkStatus || "ok"})`);
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
