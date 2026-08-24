import { fetchText } from "../scrapers/network.mjs";
import { compact, decodeHtml, normalized, stripHtml, unique } from "../scrapers/utils.mjs";

export function companySignalsFor(company, text = "") {
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

export function estimatedCompanyTypeFor(company, text = "") {
  const signals = companySignalsFor(company, text);
  if (signals.includes("recruteur / intérim")) return "recruteur / intérim";
  if (signals.includes("groupe technique")) return "grand groupe technique";
  if (signals.includes("franchise / réseau")) return "réseau / franchise";
  if (signals.includes("public / bailleur")) return "public / bailleur";
  if (signals.includes("cabinet / ingénierie") || signals.includes("métier diagnostic")) return "cabinet / PME métier";
  return "à vérifier";
}

export function decodeSearchUrl(href) {
  const value = decodeHtml(href || "");
  try {
    const url = new URL(value.startsWith("//") ? `https:${value}` : value, "https://duckduckgo.com");
    const redirected = url.searchParams.get("uddg");
    return redirected ? decodeHtml(decodeURIComponent(redirected)) : url.toString();
  } catch {
    return "";
  }
}

export function extractSearchUrls(html) {
  const urls = [];
  const hrefPattern = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = hrefPattern.exec(html)) && urls.length < 20) {
    const url = decodeSearchUrl(match[1]);
    if (url && /^https?:\/\//i.test(url) && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

export function officialWebsiteCandidate(company, urls) {
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

export async function buildCompanyProfile(company) {
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

export function ratingSourceLabel(url) {
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

export function extractEmployerRatingFromText(text) {
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

export async function buildEmployerRating(company) {
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

export async function searchCompanyGouv(q) {
  const apiUrl = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&per_page=3`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  let r;
  try {
    r = await fetch(apiUrl, { signal: controller.signal, headers: { Accept: "application/json" } });
  } finally {
    clearTimeout(timer);
  }
  if (!r.ok) {
    const error = new Error("API entreprises indisponible.");
    error.status = 502;
    error.code = "upstream_error";
    throw error;
  }
  const data = await r.json().catch(() => null);
  const TRANCHE_LABELS = {
    "00": "0 salarié", "01": "1-2 sal.", "02": "3-5 sal.", "03": "6-9 sal.",
    "11": "10-19 sal.", "12": "20-49 sal.", "21": "50-99 sal.", "22": "100-199 sal.",
    "31": "200-249 sal.", "32": "250-499 sal.", "41": "500-999 sal.",
    "42": "1 000-1 999 sal.", "51": "2 000-4 999 sal.", "52": "5 000-9 999 sal.", "53": "10 000+ sal.",
  };
  const SECTOR_LABELS = {
    A: "Agriculture", B: "Industries extractives", C: "Industrie manufacturière", D: "Énergie",
    E: "Eau / déchets", F: "Construction", G: "Commerce / auto", H: "Transports",
    I: "Hôtellerie / restauration", J: "Info / communication", K: "Finance / assurance",
    L: "Immobilier", M: "Activités spécialisées / scientifiques", N: "Services admin",
    O: "Admin publique", P: "Enseignement", Q: "Santé / action sociale", R: "Arts / spectacles",
    S: "Autres services", T: "Ménages employeurs", U: "Extraterritorial",
  };
  const results = (data?.results || []).slice(0, 3).map((e) => ({
    siren: e.siren,
    name: e.nom_complet || e.nom_raison_sociale,
    sigle: e.sigle,
    employeesLabel: TRANCHE_LABELS[e.tranche_effectif_salarie] || e.categorie_entreprise || null,
    createdAt: e.date_creation,
    naf: e.activite_principale,
    sector: SECTOR_LABELS[e.section_activite_principale] || null,
    legalForm: e.categorie_entreprise || null,
    city: e.siege?.libelle_commune,
    postalCode: e.siege?.code_postal,
  }));
  return { results };
}
