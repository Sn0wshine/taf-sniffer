import { API_BASE, env, SCOPE, SEARCH_PATH, TOKEN_URL } from "../config.mjs";
import {
  cleanCompanyValue,
  cleanSalaryValue,
  cleanWorkTimeValue,
  compact,
  findBenefits,
  findBonus,
  findRequiredExperience,
  matchesRequiredSignals,
  normalized,
  salaryKindFromText,
} from "../scrapers/utils.mjs";

let tokenCache = null;

export function configured() {
  return Boolean(env.FRANCE_TRAVAIL_CLIENT_ID && env.FRANCE_TRAVAIL_CLIENT_SECRET);
}

export async function getAccessToken() {
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

export function franceTravailDetailUrl(id) {
  const value = compact(id);
  return value ? `https://candidat.francetravail.fr/offres/recherche/detail/${encodeURIComponent(value)}` : "";
}

export function buildRawText(offer) {
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

export function mapOffer(offer) {
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

export function franceTravailGeoParams(location) {
  const value = compact(location || "");
  if (!value) return { departement: "", keepInKeywords: "" };
  const flat = normalized(value);
  if (flat === "toute la france" || flat === "france entiere" || flat === "france") return { departement: "", keepInKeywords: "" };
  const postal = value.match(/\b(\d{5})\b/);
  if (postal) {
    const code = postal[1];
    const dept = /^9[78]/.test(code) ? code.slice(0, 3) : code.slice(0, 2);
    return { departement: dept, keepInKeywords: "" };
  }
  const dept = value.match(/\b(2[ab]|\d{2,3})\b/i);
  if (dept && /^(2[ab]|0[1-9]|[1-8]\d|9[0-5]|97[1-6])$/i.test(dept[1])) {
    return { departement: dept[1].toUpperCase(), keepInKeywords: "" };
  }
  return { departement: "", keepInKeywords: value };
}

export function franceTravailExperienceParam(level) {
  if (level === "junior") return "2";
  if (level === "confirme") return "3";
  if (level === "debutant_reconversion") return "1";
  return "";
}

export async function fetchOfficialFranceTravailRaw(keywords, location, limit, experienceLevel = "") {
  const empty = (status, message, networkErrorCount = 0) => ({
    source: "France Travail",
    jobs: [],
    foundCount: 0,
    detailLinkCount: 0,
    missingDetailCount: 0,
    poorQualityCount: 0,
    networkErrorCount,
    skippedCount: 0,
    status,
    message: `France Travail (API) : ${message}`,
  });
  try {
    const token = await getAccessToken();
    const geo = franceTravailGeoParams(location);
    const experience = franceTravailExperienceParam(experienceLevel);
    const params = new URLSearchParams({
      motsCles: geo.keepInKeywords ? `${keywords} ${geo.keepInKeywords}` : keywords,
      range: `0-${Math.max(0, Math.min(149, limit - 1))}`,
    });
    if (geo.departement) params.set("departement", geo.departement);
    if (experience) params.set("experience", experience);
    const response = await fetch(`${API_BASE}${SEARCH_PATH}?${params}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (response.status === 204) return empty("empty", "aucune offre pour ces critères.");
    if (!response.ok) {
      console.log(`[search] France Travail API HTTP ${response.status}`);
      return empty("blocked", `réponse ${response.status}.`, 1);
    }
    const payload = await response.json().catch(() => null);
    const resultats = Array.isArray(payload?.resultats) ? payload.resultats : Array.isArray(payload) ? payload : [];
    const jobs = resultats.map(mapOffer).filter((job) => job.rawText.length > 80);
    return {
      source: "France Travail",
      jobs,
      foundCount: resultats.length,
      detailLinkCount: jobs.length,
      missingDetailCount: 0,
      poorQualityCount: resultats.length - jobs.length,
      networkErrorCount: 0,
      skippedCount: resultats.length - jobs.length,
      status: jobs.length ? "ok" : "empty",
      message: `France Travail (API) : ${jobs.length} offre${jobs.length > 1 ? "s" : ""}.`,
    };
  } catch (error) {
    const message = error?.message || String(error);
    console.log(`[search] France Travail API erreur: ${message}`);
    return empty(error?.code === "missing_credentials" ? "empty" : "blocked", message, error?.code === "missing_credentials" ? 0 : 1);
  }
}

export async function searchOfficialJobs(requestUrl) {
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
