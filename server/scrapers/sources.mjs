import { fetchJson, fetchSearchPage, fetchText } from "./network.mjs";
import {
  absoluteUrl,
  apecContractLabel,
  apecLocationFrom,
  cleanCompanyValue,
  cleanExtractedValue,
  cleanLocationValue,
  cleanSalaryValue,
  cleanWorkTimeValue,
  compact,
  companyFromEmployerBlock,
  companyFromNarrative,
  companyFromSourceHtml,
  contractFromSourceHtml,
  experienceFromJsonLd,
  extractContractFromText,
  extractionQuality,
  findBenefits,
  findBonus,
  findRequiredExperience,
  firstMatch,
  hashString,
  isImportable,
  isLikelyDetailUrlForSource,
  jsonLdJobPosting,
  locationFromHtml,
  locationFromSourceHtml,
  nestedValue,
  normalized,
  salaryFromJsonLd,
  salaryKindFromText,
  sourceReportMessageClean,
  stripHtml,
  workTimeFromHtml,
} from "./utils.mjs";

export const PUBLIC_SOURCES = [
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
      `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location || "France")}&geoId=105015875&start=0`,
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

export function extractLinks(html, source, baseUrl, limit) {
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

export function parseJobPage(source, url, html) {
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
  const requiredExperience = findRequiredExperience([experienceFromJsonLd(jsonJob), metadataText].filter(Boolean).join("\nExpérience : "));
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

export function parseInlineCards(source, html, searchUrl, limit, targetKeywords = "") {
  if (normalized(source).includes("france travail")) return [];

  const titleMatches = [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)]
    .map((match) => {
      const title = stripHtml(match[1]);
      const start = Math.max(0, match.index - 900);
      const end = Math.min(html.length, match.index + 2200);
      const snippet = stripHtml(html.slice(start, end));
      return { title, snippet };
    })
    .filter(({ title, snippet }) => 
      title.length > 8 && 
      title.length < 140 && 
      snippet.length >= 280 &&
      isJobTitleRelevant(title, targetKeywords)
    )
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

export function mapApecApiOffer(offer, withLieu, sourceUrl) {
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

export async function fetchApecOffer(numeroOffre, fallback = {}) {
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

export async function searchApecSourceOnce(source, keywords, perSourceLimit) {
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
      if (isImportable(job, keywords)) jobs.push(job);
      else skippedCount += 1;
    } catch {
      const fallbackUrl = `https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/${encodeURIComponent(numeroOffre)}`;
      const job = mapApecApiOffer(offer, null, fallbackUrl);
      if (isImportable(job, keywords)) jobs.push(job);
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

export async function searchPublicSourceOnceReliable(source, keywords, location, perSourceLimit) {
  if (normalized(source.name).includes("apec")) {
    return searchApecSourceOnce(source, keywords, perSourceLimit);
  }

  const searchUrl = source.searchUrl(keywords, location);
  const searchPage = await fetchSearchPage(searchUrl);
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

  const linkBudget = Math.min(28, perSourceLimit + 8);
  const detailLinks = extractLinks(searchPage.text, source, searchPage.finalUrl || searchUrl, linkBudget);
  const detailJobs = [];
  let skippedCount = 0;
  let poorQualityCount = 0;

  const detailResults = await Promise.allSettled(detailLinks.map((link) => fetchText(link)));
  for (let i = 0; i < detailResults.length; i++) {
    const settled = detailResults[i];
    if (settled.status !== "fulfilled") {
      skippedCount += 1;
      continue;
    }
    const detail = settled.value;
    if (detail.ok) {
      const detailUrl = detail.finalUrl || detailLinks[i];
      const job = parseJobPage(source.name, detailUrl, detail.text);
      if (isLikelyDetailUrlForSource(source.name, job.sourceUrl || detailUrl) && isImportable(job, keywords)) detailJobs.push(job);
      else {
        skippedCount += 1;
        poorQualityCount += 1;
      }
    } else {
      skippedCount += 1;
    }
  }

  const inlineCandidates = detailLinks.length ? [] : parseInlineCards(source.name, searchPage.text, searchUrl, perSourceLimit, keywords);
  const candidates = detailJobs.length ? detailJobs : inlineCandidates;
  const jobs = candidates.filter((job) => {
    const keep = isImportable(job, keywords);
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

export async function searchPublicSource(source, queryPairs, perSourceLimit) {
  const jobs = [];
  const seen = new Set();
  let skippedCount = 0;
  let blockedCount = 0;
  let foundCount = 0;
  let detailLinkCount = 0;
  let missingDetailCount = 0;
  let poorQualityCount = 0;

  const pairsForSource = queryPairs.slice(0, 3);
  let pairsTried = 0;
  for (const pair of pairsForSource) {
    if (jobs.length >= perSourceLimit) break;
    pairsTried += 1;
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

    if (jobs.length === 0 && pairsTried >= 2) break;
  }

  const status = jobs.length ? "ok" : pairsTried > 0 && blockedCount === pairsTried ? "blocked" : "empty";
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
