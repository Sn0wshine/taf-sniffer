import type { ExperienceLevel, Strategy } from "./types";
import { getActiveProfile } from "./jobProfiles";

export type SearchLink = {
  label: string;
  source: string;
  url: string;
};

export type SearchQueryPlan = {
  keywords: string[];
  locationVariants: string[];
  links: SearchLink[];
};

const uniq = (items: string[]) => [...new Set(items.map((item) => item.trim()).filter(Boolean))];

const encode = (value: string) => encodeURIComponent(value);

export const zoneSuggestions = [
  "Toute la France",
  "Île-de-France",
  "Région parisienne",
  "Paris",
  "Hauts-de-Seine",
  "Seine-Saint-Denis",
  "Val-de-Marne",
  "Yvelines",
  "Essonne",
  "Val-d'Oise",
  "Seine-et-Marne",
  "Lyon",
  "Marseille",
  "Lille",
  "Bordeaux",
  "Nantes",
  "Toulouse",
  "Rennes",
];

const stripAccents = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const normalized = (value: string) => stripAccents(value).toLowerCase();

const hasPoeiSignal = (value: string) => {
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
};

const hasPoeiEquivalentSignal = (value: string) => {
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
};

const hasPoeiOrEquivalentSignal = (value: string) => hasPoeiSignal(value) || hasPoeiEquivalentSignal(value);

const hasAuditSignal = (value: string, strategy?: Partial<Pick<Strategy, "profileId" | "targetJob">>) => {
  const text = normalized(value);
  const profile = getActiveProfile(strategy);
  return [...profile.analysis.strategicTerms, ...profile.analysis.trajectoryTerms].some((term) => text.includes(normalized(term)));
};

const applyRequiredTerms = (keyword: string, strategy: Strategy) => {
  const profile = getActiveProfile(strategy);
  const terms = [];
  if (strategy.poeiRequirement === "required" && !hasPoeiOrEquivalentSignal(keyword)) terms.push("POEI");
  if (strategy.auditRequirement === "required" && !hasAuditSignal(keyword, strategy)) terms.push(profile.search.requiredStrategicFallback);
  return [keyword, ...terms].join(" ").trim();
};

const expandRequiredTerms = (keyword: string, strategy: Strategy) => {
  const profile = getActiveProfile(strategy);
  let variants = [keyword.trim()];
  const smartSearch = strategy.smartSearch !== false;
  if (strategy.poeiRequirement === "required" && !hasPoeiOrEquivalentSignal(keyword)) {
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
    variants = variants.flatMap((variant) => poeiTerms.map((term) => `${variant} ${term}`.trim()));
  }
  if (strategy.auditRequirement === "required" && !hasAuditSignal(keyword, strategy)) {
    const auditTerms = smartSearch ? profile.search.requiredStrategicTerms : [profile.search.requiredStrategicFallback];
    variants = variants.flatMap((variant) => auditTerms.map((term) => `${variant} ${term}`.trim()));
  }
  return variants.map((variant) => applyRequiredTerms(variant, strategy));
};

const experienceVariants = (
  target: string,
  experienceLevel: ExperienceLevel = "debutant_reconversion",
  strategy?: Partial<Pick<Strategy, "profileId" | "targetJob">>,
) => {
  const profile = getActiveProfile({ ...strategy, targetJob: target });
  if (experienceLevel === "indifferent") return [];
  if (experienceLevel === "confirme") {
    return [`${target} confirmé`, `${target} senior`, ...profile.search.confirmedVariants];
  }
  if (experienceLevel === "junior") {
    return [
      `${target} junior`,
      `${target} première expérience`,
      ...profile.search.juniorVariants,
    ];
  }
  return [
    `${target} débutant`,
    `${target} junior`,
    `${target} sans expérience`,
    `${target} reconversion`,
    `${target} formation`,
    `${target} POEI`,
    ...profile.search.beginnerVariants,
  ];
};

export const buildKeywordVariants = (
  targetJob: string,
  smartSearch = true,
  experienceLevel: ExperienceLevel = "debutant_reconversion",
  strategy?: Partial<Pick<Strategy, "profileId" | "targetJob">>,
) => {
  const profile = getActiveProfile({ ...strategy, targetJob });
  const target = targetJob.trim();
  if (!target) return [];
  const base = [target, stripAccents(target)];
  const text = normalized(target);

  if (!smartSearch) return uniq(base);

  const genericVariants = profile.search.shortReplacements.map((replacement) => target.replace(replacement.from, replacement.to));

  const diagnosticVariants =
    profile.search.triggerTerms.some((term) => text.includes(normalized(term)))
      ? profile.search.smartVariants
      : [];

  const xpVariants = experienceVariants(target, experienceLevel, strategy);
  return uniq([...base, ...xpVariants, ...genericVariants, ...diagnosticVariants, ...xpVariants.map(stripAccents), ...diagnosticVariants.map(stripAccents)]).slice(0, 28);
};

export const buildLocationVariants = (location: string, smartLocation = true) => {
  const value = location.trim();
  const text = normalized(value);
  if (!value || text === "toute la france" || text === "france entière" || text === "france entiere") return [""];
  if (!smartLocation) return uniq([value]);

  const idfAliases = [
    "ile-de-france",
    "ile de france",
    "idf",
    "region parisienne",
    "région parisienne",
    "paris",
    "75",
  ];

  if (idfAliases.some((alias) => text.includes(normalized(alias)))) {
    return uniq([
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

  return uniq([value, stripAccents(value)]);
};

export const generateSearchQueries = (strategy: Strategy): SearchQueryPlan => {
  const profile = getActiveProfile(strategy);
  const target = strategy.targetJob || strategy.assistantIntent || profile.defaultTargetJob;
  const location = strategy.location || "";
  const baseKeywords = buildKeywordVariants(target, strategy.smartSearch !== false, strategy.experienceLevel, strategy);
  const aiKeywords = Array.isArray(strategy.aiSearchQueries) ? strategy.aiSearchQueries.slice(0, 8) : [];
  const keywords = uniq([
    ...aiKeywords.flatMap((keyword) => expandRequiredTerms(keyword, strategy)),
    ...baseKeywords.flatMap((keyword) => expandRequiredTerms(keyword, strategy)),
  ]);
  const locationVariants = buildLocationVariants(location, strategy.smartLocation !== false);
  const primaryLocation = locationVariants[0] || "";

  const primary = keywords.slice(0, 8);
  const links: SearchLink[] = primary.flatMap((keyword) => {
    const q = primaryLocation ? `${keyword} ${primaryLocation}` : keyword;
    const encodedLocation = encode(primaryLocation);
    return [
      {
        label: `${keyword} · France Travail`,
        source: "France Travail",
        url: `https://candidat.francetravail.fr/offres/recherche?motsCles=${encode(keyword)}${primaryLocation ? `&lieux=${encodedLocation}` : ""}`,
      },
      {
        label: `${keyword} · Indeed`,
        source: "Indeed",
        url: `https://fr.indeed.com/jobs?q=${encode(keyword)}${primaryLocation ? `&l=${encodedLocation}` : ""}`,
      },
      {
        label: `${keyword} · Hellowork`,
        source: "Hellowork",
        url: `https://www.hellowork.com/fr-fr/emploi/recherche.html?k=${encode(keyword)}${primaryLocation ? `&l=${encodedLocation}` : ""}`,
      },
      {
        label: `${keyword} · LinkedIn`,
        source: "LinkedIn",
        url: `https://www.linkedin.com/jobs/search/?keywords=${encode(keyword)}${primaryLocation ? `&location=${encodedLocation}` : ""}`,
      },
      {
        label: `${keyword} · Jooble`,
        source: "Jooble",
        url: `https://fr.jooble.org/SearchResult?ukw=${encode(keyword)}${primaryLocation ? `&rgns=${encodedLocation}` : ""}`,
      },
      {
        label: `${keyword} · Apec`,
        source: "Apec",
        url: `https://www.apec.fr/candidat/recherche-emploi.html/emploi?motsCles=${encode(keyword)}${primaryLocation ? `&lieux=${encodedLocation}` : ""}`,
      },
      {
        label: `${keyword} · Meteojob`,
        source: "Meteojob",
        url: `https://www.meteojob.com/jobs?what=${encode(keyword)}${primaryLocation ? `&where=${encodedLocation}` : ""}`,
      },
      {
        label: `${keyword} · Welcome to the Jungle`,
        source: "Welcome to the Jungle",
        url: `https://www.welcometothejungle.com/fr/jobs?query=${encode(keyword)}${primaryLocation ? `&aroundQuery=${encodedLocation}` : ""}`,
      },
      {
        label: `${keyword} · Jobijoba`,
        source: "Jobijoba",
        url: `https://www.jobijoba.com/fr/query/?what=${encode(keyword)}${primaryLocation ? `&where=${encodedLocation}` : ""}`,
      },
      {
        label: `${keyword} · Talent.com`,
        source: "Talent.com",
        url: `https://fr.talent.com/jobs?k=${encode(keyword)}${primaryLocation ? `&l=${encodedLocation}` : ""}`,
      },
      {
        label: `${keyword} · Optioncarriere`,
        source: "Optioncarriere",
        url: `https://www.optioncarriere.com/recherche/emplois?s=${encode(keyword)}${primaryLocation ? `&l=${encodedLocation}` : ""}`,
      },
      {
        label: `${keyword} · Google`,
        source: "Google",
        url: `https://www.google.com/search?q=${encode(`${q} offre emploi`)}`,
      },
    ];
  });

  return {
    keywords,
    locationVariants,
    links,
  };
};
