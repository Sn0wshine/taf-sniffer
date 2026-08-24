import type {
  AIQualityFieldCheck,
  AIQualityStatus,
  ControlledExtraction,
  ControlledExtractionField,
  ControlledExtractionValues,
  JobAnalysis,
  JobRecord,
  OfferType,
  RiskLevel,
  ScoreConfidence,
  ScoreLine,
  Strategy,
} from "./types";
import { DIAGNOSTIC_PROFILE_ID, diagnosticImmobilierProfile, getActiveProfile } from "./jobProfiles";

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const GROSS_TO_NET_RATE = 0.78;
const DEFAULT_WEEKLY_HOURS = 35;
const MONTHLY_HOURS = (DEFAULT_WEEKLY_HOURS * 52) / 12;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const hasAny = (text: string, terms: string[]) => terms.some((term) => text.includes(normalize(term)));

const firstMatch = (text: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/[.;,]$/, "");
    }
  }

  return "";
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const compactText = (value: string) => value.replace(/\s+/g, " ").trim();

const cleanExtractedValue = (value: string) =>
  compactText(
    String(value || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\\u002F/g, "/")
      .replace(/\\"/g, '"')
      .replace(/\s+["']?\s*(?:name|content|class|id|property|data-[\w-]+)=["'][^"']*["'].*$/i, " ")
      .replace(/["']\s*>?\s*$/g, "")
      .replace(/\b(\d+)\.0\b/g, "$1"),
  );

const looksLikeJobBoardDomain = (value: string) => {
  const text = normalize(value);
  return (
    /\b(?:www\.)?[\w-]+\.(?:com|fr|net|org)\b/i.test(value) ||
    ["hellowork", "indeed", "linkedin", "france travail", "pole emploi", "pôle emploi", "apec"].some((term) => text.includes(normalize(term)))
  );
};

const cleanCompanyValue = (value: string) => {
  const clean = cleanExtractedValue(value)
    .replace(/^chez\s+/i, "")
    .replace(/\s*[-|]\s*(?:recrutement|emploi|jobs?).*$/i, "")
    .replace(/\s+(?:\d+\s*(?:à|a|-|\?)\s*\d+|\d+)\s+salari\S*s?.*$/i, "")
    .slice(0, 90);
  const text = normalize(clean);
  if (!clean || looksLikeJobBoardDomain(clean) || text.includes("entreprise non precise") || /^employeur$/.test(text) || /^(?:\d+\s*(?:a|-|\?)\s*\d+|\d+)\s+salar/.test(text)) return "";
  return clean;
};

const companyFromEmployerBlock = (value: string) => {
  const lines = String(value || "")
    .split(/\r?\n/)
    .map((line) => cleanExtractedValue(line))
    .filter(Boolean);

  for (let index = 0; index < lines.length; index += 1) {
    if (normalize(lines[index]) === "employeur") {
      const candidate = cleanCompanyValue(lines[index + 1] || "");
      if (candidate) return candidate;
    }
  }

  const compact = cleanExtractedValue(value);
  const match = compact.match(
    /(?:^|\b)Employeur\s+(.+?)(?=\s+(?:\d+\s*(?:à|a|-|\?)\s*\d+|\d+)\s+salari\S*s?\b|\s+Postuler\b|\s+Contacter\b|\s+Informations?\b|\s+Actualis[ée]\b|$)/i,
  );
  return match ? cleanCompanyValue(match[1]) : "";
};

const companyFromNarrative = (value: string) => {
  const clean = cleanExtractedValue(value);
  const match = clean.match(
    /(?:Pourquoi rejoindre|rejoindre)\s+([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ0-9&' .-]{2,70})\s*\?|Depuis\s+plus\s+de\s+\d+\s+ans,\s+([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ0-9&' .-]{2,70})\s+s['’]impose/i,
  );
  return match ? cleanCompanyValue(match[1] || match[2]) : "";
};

const departmentCityFrom = (value: string) => {
  const clean = cleanExtractedValue(value);
  const match = clean.match(/\b(\d{2,3})\s*-\s*([A-Z\u00C0-\u017F][A-Za-z\u00C0-\u017F0-9' -]{2,80}?)(?=\s*(?:-\s*(?:Localiser|[A-Z0-9]{5,})|\||Actualis|CDI|CDD|Alternance|Int[\u00E9e]rim|Contrat|Temps|Salaire|$))/i);
  return match ? `${match[1]} - ${compactText(match[2])}` : "";
};

const postalCityFrom = (value: string) => {
  const clean = cleanExtractedValue(value);
  const match = clean.match(/\b(\d{5})\s+([A-Z\u00C0-\u017F][A-Za-z\u00C0-\u017F0-9' -]{2,80}?)(?=\s*(?:-\s*Localiser|\||Actualis|CDI|CDD|Alternance|Int[\u00E9e]rim|Contrat|Temps|Salaire|$))/i);
  return match ? `${match[1]} ${compactText(match[2])}` : "";
};

const cleanLocationCandidate = (value: string) =>
  cleanExtractedValue(value)
    .replace(/\s*-\s*Localiser\b.*$/i, "")
    .replace(/\s+Localiser\s+avec\s+Mappy\b.*$/i, "")
    .replace(/\s*-\s+[A-Z0-9]{5,}\b.*$/i, "")
    .replace(/\s+\|\s+.*$/i, "")
    .replace(/\s+Actualis\S*\s+le\b.*$/i, "")
    .replace(/\s+(?:Contrat|Temps de travail|Salaire)\b.*$/i, "")
    .slice(0, 120);

const looksLikeSalaryNoise = (value: string) => hasAny(normalize(value), ["salaire", "remuneration", "rémunération", "euros", "brut", "net"]);

const hasSalaryWords = (text: string) =>
  ["selon profil", "a negocier", "à négocier", "brut", "net", "annuel", "mensuel", "horaire", "euros", "eur", "€", "k"].some((term) =>
    text.includes(normalize(term)),
  );

const cleanSalaryValue = (value: string) => {
  const cleaned = cleanExtractedValue(value)
    .replace(/\s+-\s+\d{2,3}\s+-\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ' -]{2,60}(?:\s+-\s+[\w-]+)?$/i, "")
    .replace(/\s+-\s+\d{2,3}\s+-\s+.+$/i, "");
  const compacted = compactText(cleaned).slice(0, 160);
  const text = normalize(compacted);
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
  if (technicalNoise.some((term) => text.includes(normalize(term)))) return "";
  if (!/\d/.test(compacted) && !["selon profil", "a negocier", "à négocier", "smic", "non plafonne", "non plafonnée"].some((term) => text.includes(normalize(term)))) {
    return "";
  }
  if (!/\d/.test(compacted) && !hasSalaryWords(text)) return "";
  return compacted;
};

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

const cleanInfoValue = (value: string, maxLength = 180) => {
  const clean = cleanExtractedValue(value)
    .replace(/^(?:primes?|variable|commissions?|avantages?|expérience demandée|experience demandee|expérience|experience)\s*:?\s*/i, "")
    .replace(/^[\s:;,+-]+/, "")
    .replace(/\s+(?:Source|URL|Qualité extraction|À vérifier|A verifier)\s*:.*$/i, "")
    .slice(0, maxLength);
  const text = normalize(clean);
  if (!clean || technicalExtractionNoise.some((term) => text.includes(normalize(term)))) return "";
  return compactText(clean);
};

const splitInfoSegments = (rawText: string) =>
  String(rawText || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\\u002F/g, "/")
    .replace(/\r/g, "\n")
    .split(/\n+|[•*]\s*|\s+\+\s+|;|\.\s+/)
    .map((segment) => cleanInfoValue(segment, 220))
    .filter(Boolean);

const findTitle = (rawText: string, normalizedText: string, profile = diagnosticImmobilierProfile) => {
  const explicit = firstMatch(rawText, [
    /(?:poste|intitul[eé]|titre)\s*:\s*(.+)/i,
    /(?:recrute|recherche)\s+(?:un|une)?\s*(.+)/i,
  ]);

  if (explicit) {
    return explicit.slice(0, 90);
  }

  const firstLine = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 8);

  if (firstLine) {
    return firstLine.slice(0, 90);
  }

  const fallback = profile.analysis.titleFallbacks.find((item) => item.terms.some((term) => normalizedText.includes(normalize(term))));
  if (fallback) {
    return fallback.title;
  }

  return "Offre importée";
};

const normalizeTitle = (normalizedText: string, profile = diagnosticImmobilierProfile) =>
  profile.analysis.titleFallbacks.find((item) => item.terms.some((term) => normalizedText.includes(normalize(term))))?.title || "Poste à qualifier";

const findCompany = (rawText: string) =>
  companyFromEmployerBlock(rawText) ||
  companyFromNarrative(rawText) ||
  cleanCompanyValue(firstMatch(rawText, [
    /(?:entreprise|societe|société|employeur)\s*:\s*(.+)/i,
    /chez\s+([A-Z][A-Za-zÀ-ÖØ-öø-ÿ0-9&' -]{2,45})/,
  ])) || "Entreprise non précisée";

const hasKnownCompany = (company: string) => {
  return Boolean(cleanCompanyValue(company));
};

const companyTypeFor = (company: string, normalizedText: string) => {
  if (!hasKnownCompany(company)) return "à identifier";
  const combined = `${normalize(company)} ${normalizedText}`;

  if (hasAny(combined, ["adecco", "randstad", "manpower", "temporis", "partnaire", "supplay", "hays", "expectra", "recrutement", "interim", "intérim"])) {
    return "recruteur / intérim";
  }

  if (hasAny(combined, ["bureau veritas", "socotec", "apave", "dekra", "qualiconsult", "ginger", "artelia", "setec"])) {
    return "grand groupe technique";
  }

  if (hasAny(combined, ["franchise", "reseau", "réseau", "agent commercial", "diagamter", "agenda diagnostics", "arliane", "activexpertise", "activ'expertise"])) {
    return "réseau / franchise";
  }

  if (hasAny(combined, ["mairie", "commune", "departement", "département", "region", "région", "collectivite", "collectivité", "habitat", "hlm", "office public", "centre hospitalier", "universite", "université"])) {
    return "public / bailleur";
  }

  if (hasAny(combined, ["cabinet", "bureau d'etudes", "bureau d'études", "bet", "sas", "sarl", "diagnostic", "diag", "ingenierie", "ingénierie"])) {
    return "cabinet / PME métier";
  }

  return "à vérifier";
};

const companySearchUrlFor = (company: string, profile = diagnosticImmobilierProfile) =>
  hasKnownCompany(company)
    ? `https://www.google.com/search?q=${encodeURIComponent(`${company} ${profile.analysis.companySearchContext}`)}`
    : "";

const findLocation = (rawText: string, normalizedText: string) => {
  const explicit = firstMatch(rawText, [
    /(?:lieu|localisation|ville|secteur|poste base|poste basé|adresse|département|departement)\s*:\s*(.+)/i,
    /\b(\d{2,3}\s*-\s*[A-Z\u00C0-\u017F][A-Za-z\u00C0-\u017F0-9' -]{2,80}?)(?=\s*(?:-\s*Localiser|\s+Localiser|\s+-\s+[A-Z0-9]{5,}\b|\s+\|))/i,
    /\b(?:poste|emploi|mission)\s+(?:à|a|sur)\s+([A-Z][A-Za-zÀ-ÖØ-öø-ÿ -]{2,45})/i,
  ]);

  if (explicit) {
    const clean = cleanLocationCandidate(explicit);
    const normalizedExplicit = normalize(clean);
    const recovered = departmentCityFrom(clean) || postalCityFrom(clean);
    if (recovered) return recovered.slice(0, 60);
    if (clean && !normalizedExplicit.includes("lieu non precise") && !looksLikeSalaryNoise(clean)) {
      return clean.slice(0, 60);
    }
  }

  const recoveredDepartmentCity = departmentCityFrom(rawText);
  if (recoveredDepartmentCity) return recoveredDepartmentCity.slice(0, 60);

  const addressLine = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => postalCityFrom(line) && !looksLikeSalaryNoise(line));
  if (addressLine) {
    return postalCityFrom(addressLine).slice(0, 80);
  }

  const knownLocations = [
    "paris",
    "ile-de-france",
    "ile de france",
    "lyon",
    "marseille",
    "lille",
    "bordeaux",
    "nantes",
    "toulouse",
    "rennes",
    "versailles",
    "nanterre",
    "creteil",
  ];

  const found = knownLocations.find((location) => normalizedText.includes(location));
  return found ? found.replace("ile de france", "Île-de-France") : "Lieu non précisé";
};

const findContract = (normalizedText: string) => {
  if (hasAny(normalizedText, ["alternance", "apprentissage", "contrat pro"])) return "Alternance";
  if (hasAny(normalizedText, ["cdi"])) return "CDI";
  if (hasAny(normalizedText, ["cdd"])) return "CDD";
  if (hasAny(normalizedText, ["interim", "intérim"])) return "Interim";
  if (hasAny(normalizedText, ["independant", "auto-entrepreneur", "agent commercial"])) return "Indépendant";
  return "Contrat non précisé";
};

const findSalary = (rawText: string) => {
  const labelledSalary = cleanSalaryValue(firstMatch(rawText, [
    /^Salaire\s+(?:brut|net)\s*:\s*(.+)$/im,
    /^Rémunération\s+(?:brut|net)\s*:\s*(.+)$/im,
    /^Remuneration\s+(?:brut|net)\s*:\s*(.+)$/im,
  ]));
  if (labelledSalary) return labelledSalary;

  const salaryPatterns = [
    /(\d{2,3}\s?[-–]\s?\d{2,3}\s?k\s?(?:€|euros)?(?:\s?brut)?(?:\/an)?)/i,
    /(\d{1,2}\s?\d{3}\s?[-–]\s?\d{1,2}\s?\d{3}\s?(?:€|euros)?)/i,
    /(\d{1,2}\s?\d{3}\s?(?:€|euros)\s?(?:net|brut)?)/i,
    /(?:salaire|remuneration|rémunération)\s*:\s*(.+)/i,
  ];

  const salary = cleanSalaryValue(firstMatch(rawText, salaryPatterns));
  return salary || "Non indiqué";
};

const salaryKindFor = (rawText: string, salary: string): JobAnalysis["salaryKind"] => {
  const salaryLine = firstMatch(rawText, [/^Salaire\s*:\s*(.+)$/im, /^Rémunération\s*:\s*(.+)$/im]);
  const explicitKindLine = firstMatch(rawText, [/^Brut\s*\/\s*net\s*:\s*(.+)$/im]);
  const scopedText = normalize(`${explicitKindLine} ${salaryLine} ${salary}`);
  const fullText = normalize(`${scopedText} ${rawText}`);

  const detect = (text: string): JobAnalysis["salaryKind"] | "" => {
    if (!text || text.includes("brut/net non precise")) return "";
    if (/(?:^|\b)brut(?:\b|$)/.test(text) && /^(?:brut|salaire brut|remuneration brut)|(?:salaire|remuneration)\s+brut\b|\bbrut\s*:\s*(?:mensuel|annuel|horaire|\d)|\bbrut\s+(?:annuel|mensuel|horaire)\b|\b\d[\d\s.,]*(?:k\s*)?(?:€|eur|euros?)?\s*brut\b|\bk\s*(?:€|eur|euros?)?\s*brut\b|\b(?:mensuel|annuel|horaire)\b.{0,80}\bbrut\b/.test(text)) {
      return "brut";
    }
    if (/(?:^|\b)net(?:\b|$)/.test(text) && /^(?:net|salaire net|remuneration net)|(?:salaire|remuneration)\s+net\b|\bnet\s*:\s*(?:mensuel|annuel|horaire|\d)|\bnet\s+(?:annuel|mensuel|horaire)\b|\b\d[\d\s.,]*(?:k\s*)?(?:€|eur|euros?)?\s*net\b|\bk\s*(?:€|eur|euros?)?\s*net\b|\b(?:mensuel|annuel|horaire)\b.{0,80}\bnet\b/.test(text)) {
      return "net";
    }
    return "";
  };

  const scopedKind = detect(scopedText);
  if (scopedKind) return scopedKind;
  const fullKind = detect(fullText);
  if (fullKind) return fullKind;
  return "non précisé";
};

const findBonus = (rawText: string) => {
  const text = normalize(rawText);
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
  if (hasAny(text, bonusTerms)) {
    const explicit = cleanInfoValue(firstMatch(rawText, [
      /^(?:primes?|variable|commissions?|rémunération variable|remuneration variable)\s*:\s*(.+)$/im,
    ]));
    const segments = splitInfoSegments(rawText)
      .filter((segment) => hasAny(normalize(segment), bonusTerms))
      .filter((segment) => !hasAny(normalize(segment), ["tickets restaurant", "titres restaurant", "panier repas", "paniers repas", "mutuelle", "chèques vacances", "cheques vacances"]));
    const values = Array.from(new Set([explicit, ...segments].filter(Boolean))).slice(0, 3);
    return values.length ? values.join(" ; ") : "Primes / variable mentionnés";
  }
  return "Non mentionnées";
};

const moneyFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const hourlyFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

const formatMoney = (value?: number) => {
  if (!Number.isFinite(value)) return "";
  return `${moneyFormatter.format(Math.round(Number(value)))} €`;
};

const moneyRange = (min?: number, max?: number) => {
  if (!Number.isFinite(min)) return "";
  if (!Number.isFinite(max) || Math.abs(Number(max) - Number(min)) < 1) return formatMoney(min);
  return `${formatMoney(min)} - ${formatMoney(max)}`;
};

const formatHourly = (value?: number) => {
  if (!Number.isFinite(value)) return "";
  return `${hourlyFormatter.format(Number(value))} €/h`;
};

const hourlyRange = (min?: number, max?: number) => {
  if (!Number.isFinite(min)) return "";
  if (!Number.isFinite(max) || Math.abs(Number(max) - Number(min)) < 0.05) return formatHourly(min);
  return `${formatHourly(min)} - ${formatHourly(max)}`;
};

const salaryNumbers = (value: string) => {
  const matches = [...String(value || "").matchAll(/(\d{1,3}(?:[\s.]\d{3})+|\d+(?:[,.]\d+)?)\s*(k)?/gi)];
  return matches
    .map((match) => {
      const numeric = Number(match[1].replace(/\s/g, "").replace(",", "."));
      if (!Number.isFinite(numeric)) return null;
      const index = match.index ?? 0;
      const context = normalize(String(value || "").slice(Math.max(0, index - 12), index + match[0].length + 18));
      if (numeric <= 14 && /\bsur\s+\d{1,2}\s+mois\b/.test(context)) return null;
      return match[2] ? numeric * 1000 : numeric;
    })
    .filter((value): value is number => Number.isFinite(value))
    .filter((value) => value >= 8);
};

const monthlyHoursFor = (weeklyHours?: number) =>
  Number.isFinite(weeklyHours) && Number(weeklyHours) > 0
    ? (Number(weeklyHours) * 52) / 12
    : MONTHLY_HOURS;

const detectWeeklyHours = (text: string) => {
  const normalizedText = normalize(text);
  const matches = [...String(text || "").matchAll(/(?:^|[^\d])(\d{1,2}(?:[,.]\d{1,2})?)\s*(?:h|heures?)\b/gi)];
  const explicit = matches
    .map((match) => Number(match[1].replace(",", ".")))
    .find((value) => Number.isFinite(value) && value >= 10 && value <= 45);
  if (explicit) return explicit;
  if (hasAny(normalizedText, ["temps plein", "35h", "35 heures"])) return DEFAULT_WEEKLY_HOURS;
  return DEFAULT_WEEKLY_HOURS;
};

const detectSalaryPeriod = (text: string, values: number[]): JobAnalysis["normalizedSalary"]["period"] => {
  const normalizedText = normalize(text);
  if (hasAny(normalizedText, ["horaire", "/h", "heure"])) return "horaire";
  if (hasAny(normalizedText, ["annuel", "annuelle", "/an", " par an", "k brut/an", "k/an"])) return "annuel";
  if (hasAny(normalizedText, ["mensuel", "mensuelle", "/mois", " par mois"])) return "mensuel";
  const largest = Math.max(...values, 0);
  if (largest >= 10000) return "annuel";
  if (largest >= 900) return "mensuel";
  if (largest > 0 && largest <= 100) return "horaire";
  return "inconnu";
};

const normalizeSalary = (salary: string, salaryKind: string, rawText: string): JobAnalysis["normalizedSalary"] => {
  const source = cleanManualField(salary);
  const normalizedKind = String(salaryKind || "non précisé");
  const values = salaryNumbers(source).filter((value) => value >= 8 && value <= 250000);
  if (!source || source === "Non indiqué" || values.length === 0) {
    return {
      source: source || "Non indiqué",
      period: "inconnu",
      salaryKind: normalizedKind as JobAnalysis["normalizedSalary"]["salaryKind"],
      label: "Salaire comparable non disponible",
      confidence: "faible",
      notes: ["Montant fixe non détecté"],
    };
  }

  const scopedText = `${salary} ${firstMatch(rawText, [/^Salaire\s*:\s*(.+)$/im, /^Rémunération\s*:\s*(.+)$/im, /^RÃ©munÃ©ration\s*:\s*(.+)$/im])}`;
  const period = detectSalaryPeriod(scopedText, values);
  const weeklyHours = detectWeeklyHours(rawText);
  const monthlyHours = monthlyHoursFor(weeklyHours);
  const filtered = values.filter((value) => {
    if (period === "annuel") return value >= 10000;
    if (period === "mensuel") return value >= 700 && value <= 12000;
    if (period === "horaire") return value >= 8 && value <= 100;
    return value >= 700;
  });
  const usable = filtered.length ? filtered : values;
  const fixedMin = Math.min(...usable);
  const fixedMax = Math.max(...usable);
  const toMonthlyNet = (value: number) => {
    if (period === "annuel") return (normalizedKind === "brut" ? value * GROSS_TO_NET_RATE : value) / 12;
    if (period === "mensuel") return normalizedKind === "brut" ? value * GROSS_TO_NET_RATE : value;
    if (period === "horaire") return (normalizedKind === "brut" ? value * GROSS_TO_NET_RATE : value) * monthlyHours;
    return normalizedKind === "brut" ? value * GROSS_TO_NET_RATE : value;
  };
  const toAnnualNet = (value: number) => {
    if (period === "annuel") return normalizedKind === "brut" ? value * GROSS_TO_NET_RATE : value;
    if (period === "mensuel") return (normalizedKind === "brut" ? value * GROSS_TO_NET_RATE : value) * 12;
    if (period === "horaire") return (normalizedKind === "brut" ? value * GROSS_TO_NET_RATE : value) * monthlyHours * 12;
    return undefined;
  };
  const toAnnualGross = (value: number) => {
    if (period === "annuel") return normalizedKind === "net" ? value / GROSS_TO_NET_RATE : value;
    if (period === "mensuel") return (normalizedKind === "net" ? value / GROSS_TO_NET_RATE : value) * 12;
    if (period === "horaire") return (normalizedKind === "net" ? value / GROSS_TO_NET_RATE : value) * monthlyHours * 12;
    return undefined;
  };
  const notes: string[] = [];
  if (salaryKind === "brut") notes.push("Conversion brut vers net estimée à 78 %");
  if (salaryKind === "non précisé") notes.push("Brut/net non précisé : estimation prudente");
  if (period === "inconnu") notes.push("Période salaire non détectée");
  if (weeklyHours !== DEFAULT_WEEKLY_HOURS) notes.push(`Taux horaire normalise sur ${weeklyHours} h/semaine`);
  const monthlyNetMin = toMonthlyNet(fixedMin);
  const monthlyNetMax = toMonthlyNet(fixedMax);
  const annualNetMin = toAnnualNet(fixedMin);
  const annualNetMax = toAnnualNet(fixedMax);
  const annualGrossMin = toAnnualGross(fixedMin);
  const annualGrossMax = toAnnualGross(fixedMax);
  const hourlyNetMin = Number.isFinite(monthlyNetMin) ? Number(monthlyNetMin) / monthlyHours : undefined;
  const hourlyNetMax = Number.isFinite(monthlyNetMax) ? Number(monthlyNetMax) / monthlyHours : undefined;
  const hourlyGrossMin = Number.isFinite(annualGrossMin) ? Number(annualGrossMin) / 12 / monthlyHours : undefined;
  const hourlyGrossMax = Number.isFinite(annualGrossMax) ? Number(annualGrossMax) / 12 / monthlyHours : undefined;
  const fixedLabel = period === "inconnu"
    ? `${moneyRange(monthlyNetMin, monthlyNetMax)} net/mois estime`
    : `${moneyRange(monthlyNetMin, monthlyNetMax)} net/mois fixe estime`;
  const hourlyLabel = Number.isFinite(hourlyNetMin)
    ? `${hourlyRange(hourlyNetMin, hourlyNetMax)} net normalise${Number.isFinite(hourlyGrossMin) ? ` · ${hourlyRange(hourlyGrossMin, hourlyGrossMax)} brut` : ""}`
    : "";
  const label = period === "inconnu"
    ? `${moneyRange(monthlyNetMin, monthlyNetMax)} net/mois estimé`
    : `${moneyRange(monthlyNetMin, monthlyNetMax)} net/mois estimé · ${moneyRange(annualGrossMin, annualGrossMax)} brut/an`;

  return {
    source,
    period,
    salaryKind: normalizedKind as JobAnalysis["normalizedSalary"]["salaryKind"],
    fixedMin,
    fixedMax,
    weeklyHours,
    monthlyNetMin,
    monthlyNetMax,
    annualNetMin,
    annualNetMax,
    annualGrossMin,
    annualGrossMax,
    hourlyNetMin,
    hourlyNetMax,
    hourlyGrossMin,
    hourlyGrossMax,
    fixedLabel,
    hourlyLabel,
    label,
    confidence: salaryKind !== "non précisé" && period !== "inconnu" ? "bonne" : "moyenne",
    notes,
  };
};

const estimateBonus = (bonus: string, normalizedSalary: JobAnalysis["normalizedSalary"], aiEstimate?: string) => {
  const source = cleanManualField(bonus);
  const ai = cleanManualField(aiEstimate);
  if (ai) return ai;
  if (!source || source === "Non mentionnées") return "Non estimées";
  const text = normalize(source);
  const values = salaryNumbers(source).filter((value) => value >= 50 && value <= 50000);
  if (values.length) return `${moneyRange(Math.min(...values), Math.max(...values))} mentionnés`;
  const month = normalizedSalary.monthlyNetMin && normalizedSalary.monthlyNetMax
    ? (normalizedSalary.monthlyNetMin + normalizedSalary.monthlyNetMax) / 2
    : undefined;
  if (month && hasAny(text, ["13e mois", "13eme mois", "treizieme mois"])) {
    return `environ ${formatMoney(month)} net/an estimé (13e mois)`;
  }
  if (hasAny(text, ["commission", "commissions", "variable", "sur objectifs", "non plafonne"])) return "Variable mentionné, montant à confirmer";
  return "Primes mentionnées, montant à confirmer";
};

const bonusAnnualNetRange = (
  bonus: string,
  bonusEstimate: string,
  normalizedSalary: JobAnalysis["normalizedSalary"],
) => {
  const source = [cleanManualField(bonus), cleanManualField(bonusEstimate)].filter(Boolean).join(" ");
  const text = normalize(source);
  if (!source || hasAny(text, ["non mentionnees", "non estimees"])) return null;

  const values = salaryNumbers(source).filter((value) => value >= 50 && value <= 50000);
  const bonusKind = text.includes(" net") ? "net" : "brut";
  const toAnnual = (value: number) => {
    const annual = hasAny(text, ["/mois", "par mois", "mensuel", "mensuelle"]) ? value * 12 : value;
    return bonusKind === "net" ? annual : annual * GROSS_TO_NET_RATE;
  };

  if (values.length) {
    const annualValues = values.map(toAnnual).filter((value) => Number.isFinite(value) && value > 0);
    if (annualValues.length) {
      return {
        min: Math.min(...annualValues),
        max: Math.max(...annualValues),
        note: bonusKind === "net" ? "Prime chiffree en net" : "Prime chiffree traitee en brut par prudence",
      };
    }
  }

  if (hasAny(text, ["13e mois", "13eme mois", "treizieme mois"])) {
    const monthMin = normalizedSalary.monthlyNetMin;
    const monthMax = normalizedSalary.monthlyNetMax;
    if (Number.isFinite(monthMin)) {
      return {
        min: Number(monthMin),
        max: Number.isFinite(monthMax) ? Number(monthMax) : Number(monthMin),
        note: "13e mois estime depuis le fixe net",
      };
    }
  }

  return null;
};

const withSalaryPackage = (
  normalizedSalary: JobAnalysis["normalizedSalary"],
  bonus: string,
  bonusEstimate: string,
): JobAnalysis["normalizedSalary"] => {
  const monthlyNetMin = normalizedSalary.monthlyNetMin;
  const monthlyNetMax = normalizedSalary.monthlyNetMax;
  const monthlyHours = monthlyHoursFor(normalizedSalary.weeklyHours);
  const parsedBonus = bonusAnnualNetRange(bonus, bonusEstimate, normalizedSalary);
  if (!parsedBonus || !Number.isFinite(monthlyNetMin)) {
    return {
      ...normalizedSalary,
      bonusLabel: cleanManualField(bonusEstimate) || (cleanManualField(bonus) ? "Primes mentionnees, montant a confirmer" : ""),
    };
  }

  const fixedMin = Number(monthlyNetMin);
  const fixedMax = Number.isFinite(monthlyNetMax) ? Number(monthlyNetMax) : fixedMin;
  const packageMonthlyNetMin = fixedMin + parsedBonus.min / 12;
  const packageMonthlyNetMax = fixedMax + parsedBonus.max / 12;
  const packageHourlyNetMin = packageMonthlyNetMin / monthlyHours;
  const packageHourlyNetMax = packageMonthlyNetMax / monthlyHours;
  const bonusLabel = `${moneyRange(parsedBonus.min, parsedBonus.max)} net/an estime`;
  const packageLabel = `${moneyRange(packageMonthlyNetMin, packageMonthlyNetMax)} net/mois package estime`;

  return {
    ...normalizedSalary,
    bonusAnnualNetMin: parsedBonus.min,
    bonusAnnualNetMax: parsedBonus.max,
    packageMonthlyNetMin,
    packageMonthlyNetMax,
    packageHourlyNetMin,
    packageHourlyNetMax,
    bonusLabel,
    packageLabel,
    notes: [...normalizedSalary.notes, parsedBonus.note],
  };
};

const findBenefits = (rawText: string, normalizedText: string) => {
  const sourceText = `${normalizedText} ${normalize(rawText)}`;
  const benefits: string[] = [];
  const add = (condition: boolean, label: string) => {
    if (condition && !benefits.includes(label)) benefits.push(label);
  };

  add(hasAny(sourceText, ["vehicule de service", "vehicule fourni", "voiture de service", "véhicule de service", "véhicule fourni"]), "Véhicule");
  add(hasAny(sourceText, ["telephone", "téléphone", "smartphone"]), "Téléphone");
  add(hasAny(sourceText, ["ordinateur", "pc portable", "tablette"]), "Ordinateur / tablette");
  add(hasAny(sourceText, ["tickets restaurant", "ticket restaurant", "titres restaurant", "titre restaurant", "restaurant"]), "Titres restaurant");
  add(hasAny(sourceText, ["panier repas", "paniers repas"]), "Paniers repas");
  add(hasAny(sourceText, ["mutuelle", "prevoyance", "prévoyance"]), "Mutuelle / prévoyance");
  add(hasAny(sourceText, ["cheques vacances", "chèques vacances"]), "Chèques vacances");
  add(hasAny(sourceText, ["cse", "ce ", "comite d'entreprise", "comité d'entreprise"]), "CSE / CE");
  add(hasAny(sourceText, ["frais pris en charge", "frais rembourses", "frais remboursés", "indemnites kilometriques", "indemnités kilométriques"]), "Frais pris en charge");
  add(hasAny(sourceText, ["outils fournis", "outillage", "equipements fournis", "équipements fournis", "pack vetements", "pack vêtements"]), "Outils / équipements");
  add(hasAny(sourceText, ["teletravail", "télétravail"]), "Télétravail");
  add(hasAny(sourceText, ["formation interne", "formation assuree", "formation assurée", "parcours d'integration", "parcours d'intégration", "accompagnement terrain", "tutorat"]), "Formation / accompagnement");

  return benefits.length ? benefits.slice(0, 8).join(", ") : "Non mentionnés";
};

const findRequiredExperience = (rawText: string, normalizedText: string) => {
  const explicit = cleanInfoValue(firstMatch(rawText, [
    /^(?:expérience demandée|experience demandee|expérience|experience|profil souhaité|profil souhaite)\s*:\s*(.+)$/im,
  ]), 120);
  const text = normalize(`${explicit} ${rawText} ${normalizedText}`);

  if (hasAny(text, ["debutant accepte", "débutant accepté", "debutant bienvenu", "sans experience", "sans expérience", "sans experience exigee", "premiere experience acceptee", "première expérience acceptée", "reconversion"])) {
    return "Débutant accepté - 0 à 1 an";
  }
  if (hasAny(text, ["junior", "profil debutant", "profil débutant"])) return "Junior - 0 à 2 ans estimés";
  if (hasAny(text, ["premiere experience", "première expérience"])) return "Première expérience - 0 à 2 ans estimés";

  const yearMatch = text.match(/\b(\d{1,2})\s*(?:an|ans)\b.{0,40}(?:experience|expérience)|(?:experience|expérience).{0,40}\b(\d{1,2})\s*(?:an|ans)\b/);
  if (yearMatch) {
    const years = Number(yearMatch[1] || yearMatch[2]);
    if (years >= 3) return `${years} ans+`;
    if (years === 1) return "1 an";
    if (years === 2) return "2 ans";
  }

  if (hasAny(text, ["profil confirme", "profil confirmé", "senior", "experience exigee", "expérience exigée", "experimente", "expérimenté"])) return "Profil confirmé - 3 ans+ estimés";
  return explicit || "Non précisée";
};

const experienceFitFor = (requiredExperience: string): JobAnalysis["experienceFit"] => {
  const text = normalize(requiredExperience);
  if (hasAny(text, ["debutant", "sans experience", "reconversion"])) return "reconversion_ok";
  if (hasAny(text, ["junior", "premiere experience", "1 an"])) return "junior";
  if (hasAny(text, ["2 ans", "3 ans", "4 ans", "5 ans", "confirme", "senior", "exigee", "experimente"])) return "confirme";
  return "unknown";
};

const cleanWorkTimeValue = (value: string) => {
  const clean = cleanExtractedValue(value)
    .replace(/\s+Salaire\b.*$/i, "")
    .replace(/\s+Profil souhait\S*\b.*$/i, "")
    .replace(/\s+Type de contrat\b.*$/i, "")
    .replace(/\s+Contrat travail\b.*$/i, "")
    .replace(/\s+Actualis\S*\s+le\b.*$/i, "")
    .slice(0, 140);
  const text = normalize(clean);
  if (!clean || text.includes("salaire") || text.includes("remuneration") || text.includes("euros")) return "";

  const precise = clean.match(
    /\b(?:Temps\s+(?:plein|partiel)\s*-\s*)?\d{1,2}(?:[,.]\d{1,2})?\s*h(?:eures?)?(?:\s*\/\s*(?:semaine|hebdo|mois|jour))?(?:\s+Travail\s+[^.;\n-]{2,50})?/i,
  );
  if (precise) return compactText(precise[0]);

  const broad = clean.match(/\bTemps\s+(?:plein|partiel)\b(?:\s*-\s*[^.;\n]{2,80})?/i);
  return broad ? compactText(broad[0]) : "";
};

const findWorkTime = (rawText: string, normalizedText: string) => {
  const explicit = cleanWorkTimeValue(firstMatch(rawText, [
    /(?:temps de travail|durée du travail|horaire|horaires)\s*:\s*(.+)/i,
    /((?:Temps\s+(?:plein|partiel)\s*-\s*)?\d{1,2}(?:[,.]\d{1,2})?\s*h(?:eures?)?(?:\s*\/\s*(?:semaine|hebdo|mois|jour))?(?:\s+Travail\s+[^.;\n-]{2,50})?)/i,
    /(Temps\s+(?:plein|partiel)(?:\s*-\s*[^.;\n]{2,80})?)/i,
  ]));
  if (explicit) return explicit.slice(0, 80);
  if (hasAny(normalizedText, ["temps partiel", "part-time"])) return "Temps partiel";
  if (hasAny(normalizedText, ["temps plein", "full time"])) return "Temps plein";
  return "Non précisé";
};

const addSignal = (signals: string[], condition: boolean, label: string) => {
  if (condition && !signals.includes(label)) {
    signals.push(label);
  }
};

const confidenceFor = (
  rawText: string,
  salaryClear: boolean,
  company: string,
  location: string,
  contract: string,
  uncertainties: string[],
): { level: ScoreConfidence; reasons: string[] } => {
  let confidence = 50;
  const reasons: string[] = [];

  if (rawText.length >= 700) {
    confidence += 18;
    reasons.push("annonce assez détaillée");
  } else if (rawText.length < 320) {
    confidence -= 18;
    reasons.push("annonce courte");
  }

  if (salaryClear) confidence += 10;
  else reasons.push("salaire absent");

  if (!company.includes("non précisée")) confidence += 7;
  else reasons.push("entreprise non précisée");

  if (!location.includes("non précisé")) confidence += 5;
  if (!contract.includes("non précisé")) confidence += 5;

  confidence -= uncertainties.length * 6;

  if (confidence >= 72) return { level: "bonne", reasons };
  if (confidence >= 48) return { level: "moyenne", reasons };
  return { level: "faible", reasons };
};

const riskLabel = (riskPenalty: number): RiskLevel => {
  if (riskPenalty >= 45) return "élevé";
  if (riskPenalty >= 20) return "modéré";
  return "faible";
};

const pickOfferType = (
  score: number,
  trainingScore: number,
  cashflowScore: number,
  trajectoryScore: number,
  auditScore: number,
  riskLevel: RiskLevel,
  signals: {
    trap: boolean;
    tremplin: boolean;
    stableCashflow: boolean;
    strategicPath: boolean;
  },
): OfferType => {
  if (signals.trap || riskLevel === "élevé" || score < 45) return "Offre piège";
  if (signals.strategicPath || (auditScore >= 72 && trajectoryScore >= 72 && score >= 68)) return "Offre stratégique";
  if (signals.tremplin || (trainingScore >= 78 && score >= 58)) return "Offre tremplin";
  if (signals.stableCashflow || cashflowScore >= 78) return "Offre cashflow";
  if (score < 55) return "Offre hors trajectoire";
  return "A creuser";
};

const verdictFor = (score: number, offerType: OfferType, riskLevel: RiskLevel) => {
  if (offerType === "Offre piège") return "Attention piège";
  if (riskLevel === "élevé") return "Trop risqué";
  if (score >= 82) return "Ca sent bon";
  if (score >= 68) return "A creuser";
  if (score >= 52) return "Trop flou";
  return "Pas aligne avec ton plan";
};

const cleanManualField = (value?: string) => value?.trim() || "";

const cleanAiField = (value?: string) => {
  const clean = cleanManualField(value);
  const text = normalize(clean);
  if (!clean || /^(non detecte|non renseigne|non precise|inconnu|n\/a|na)$/.test(text)) return "";
  return clean;
};

const aiExtraction = (job: JobRecord) =>
  job.aiReview?.status === "done" && job.aiReview.extraction ? job.aiReview.extraction : undefined;

const labelledValue = (rawText: string, labels: string[]) => {
  const labelPattern = labels.map(escapeRegExp).join("|");
  return firstMatch(rawText, [new RegExp(`^(?:${labelPattern})\\s*:\\s*(.+)$`, "im")]);
};

const salaryKindValue = (value: string): ControlledExtractionValues["salaryKind"] | "" => {
  const text = normalize(value);
  if (text.includes("brut")) return "brut";
  if (text.includes("net")) return "net";
  if (text.includes("non precise") || text.includes("non renseigne")) return "non précisé";
  return "";
};

const structuredExtraction = (job: JobRecord): Partial<ControlledExtractionValues> => {
  const rawText = job.rawText || "";
  const title = cleanInfoValue(labelledValue(rawText, ["Poste", "Titre", "Intitulé", "IntitulÃ©", "Intitule"]), 140);
  const company =
    cleanCompanyValue(labelledValue(rawText, ["Entreprise", "Employeur", "Société", "SociÃ©tÃ©", "Societe"])) ||
    cleanInfoValue(labelledValue(rawText, ["Entreprise", "Employeur", "Société", "SociÃ©tÃ©", "Societe"]), 90);
  const location = cleanLocationCandidate(labelledValue(rawText, ["Lieu", "Localisation", "Ville", "Zone", "Département", "DÃ©partement", "Departement"]));
  const contract = cleanInfoValue(labelledValue(rawText, ["Contrat", "Type de contrat"]), 80);
  const workTime =
    cleanWorkTimeValue(labelledValue(rawText, ["Temps de travail", "Durée du travail", "DurÃ©e du travail", "Duree du travail", "Horaire", "Horaires"])) ||
    cleanInfoValue(labelledValue(rawText, ["Temps de travail", "Durée du travail", "DurÃ©e du travail", "Duree du travail", "Horaire", "Horaires"]), 90);
  const salary = cleanSalaryValue(labelledValue(rawText, ["Salaire", "Rémunération", "RÃ©munÃ©ration", "Remuneration"])) ||
    cleanInfoValue(labelledValue(rawText, ["Salaire", "Rémunération", "RÃ©munÃ©ration", "Remuneration"]), 140);
  const salaryKind = salaryKindValue(labelledValue(rawText, ["Brut / net", "Brut/net", "Salaire brut net", "Type salaire"]));
  const bonus = cleanInfoValue(labelledValue(rawText, ["Primes", "Prime", "Variable", "Commissions"]), 180);
  const bonusEstimate = cleanInfoValue(labelledValue(rawText, ["Primes estimées", "Prime estimée", "Variable estimé", "Primes estimÃ©es", "Prime estimÃ©e", "Variable estimÃ©"]), 120);
  const requiredExperience = cleanInfoValue(labelledValue(rawText, ["Expérience demandée", "ExpÃ©rience demandÃ©e", "Experience demandee", "Expérience", "ExpÃ©rience", "Experience"]), 120);
  const benefits = cleanInfoValue(labelledValue(rawText, ["Avantages", "Bénéfices", "BÃ©nÃ©fices", "Benefits"]), 220);

  return {
    ...(title ? { title } : {}),
    ...(company ? { company } : {}),
    ...(location ? { location } : {}),
    ...(contract ? { contract } : {}),
    ...(workTime ? { workTime } : {}),
    ...(salary ? { salary } : {}),
    ...(salaryKind ? { salaryKind } : {}),
    ...(bonus ? { bonus } : {}),
    ...(bonusEstimate ? { bonusEstimate } : {}),
    ...(requiredExperience ? { requiredExperience } : {}),
    ...(benefits ? { benefits } : {}),
  };
};

const aiScoreAdjustment = (job: JobRecord) => {
  if (job.aiReview?.status !== "done") return 0;
  const value = Math.round(Number(job.aiReview.scoreAdjustment || 0));
  if (!Number.isFinite(value)) return 0;
  return Math.max(-12, Math.min(12, value));
};

type ExtractionBase = Pick<
  JobAnalysis,
  | "normalizedTitle"
  | "company"
  | "location"
  | "contract"
  | "workTime"
  | "salary"
  | "salaryKind"
  | "bonus"
  | "bonusEstimate"
  | "requiredExperience"
  | "benefits"
>;

type ControlledFieldKey = keyof ControlledExtractionValues;

const qualityWeight = (status?: AIQualityStatus) => {
  if (status === "conflict") return 3;
  if (status === "verify") return 2;
  return 1;
};

const qualityFieldAliases: Record<string, string[]> = {
  title: ["title", "poste", "intitule", "intitulé", "titre"],
  company: ["company", "entreprise", "employeur", "societe", "société"],
  location: ["location", "lieu", "localisation", "ville", "zone"],
  contract: ["contract", "contrat", "cdi", "cdd", "alternance"],
  workTime: ["worktime", "temps", "temps de travail", "horaire", "horaires", "duree", "durée"],
  salary: ["salary", "salaire", "remuneration", "rémunération"],
  salaryKind: ["salarykind", "brut", "net", "brut net", "brut/net"],
  bonus: ["bonus", "prime", "primes", "variable", "commission", "commissions"],
  bonusEstimate: ["bonusestimate", "prime estimee", "primes estimees", "variable estime"],
  requiredExperience: ["experience", "expérience", "xp", "requiredexperience", "experience demandee", "expérience demandée"],
  benefits: ["benefits", "avantages", "vehicule", "véhicule", "tickets", "mutuelle"],
  poeiSignal: [
    "poei",
    "poec",
    "poeic",
    "poe collective",
    "poei collective",
    "poe",
    "afpr",
    "preparation operationnelle",
    "préparation opérationnelle",
    "formation prealable recrutement",
    "formation préalable recrutement",
    "formation prise en charge",
    "formation financee",
    "formation financée",
    "financement opco",
    "financement france travail",
  ],
  auditSignal: ["audit", "audit energetique", "audit énergétique", "dpe"],
  independentSignal: ["independent", "independant", "indépendant", "agent commercial", "franchise"],
};

const qualityCheckForField = (job: JobRecord, field: string): AIQualityFieldCheck | undefined => {
  if (job.aiReview?.status !== "done" || !job.aiReview.qualityCheck) return undefined;
  const aliases = (qualityFieldAliases[field] || [field]).map(normalize);
  const checks = [
    ...(job.aiReview.qualityCheck.fieldChecks || []),
    ...(job.aiReview.qualityCheck.suggestedCorrections || []),
  ];

  return checks
    .filter((check) => {
      const haystack = normalize(`${check.field} ${check.reason}`);
      return aliases.some((alias) => haystack.includes(alias));
    })
    .sort((left, right) => qualityWeight(right.status) - qualityWeight(left.status))[0];
};

const controlledField = (
  job: JobRecord,
  field: ControlledFieldKey,
  manualValue: string | undefined,
  structuredValue: string | undefined,
  aiValue: string | undefined,
  localValue: string | undefined,
): ControlledExtractionField => {
  const manual = cleanManualField(manualValue);
  if (manual) {
    return { field, value: manual, source: "manual", quality: "ok" };
  }

  const structured = cleanManualField(structuredValue);
  const ai = cleanAiField(aiValue);
  const check = ai ? qualityCheckForField(job, field) : undefined;
  const local = cleanManualField(localValue);
  if (ai && check?.status !== "conflict") {
    return {
      field,
      value: ai,
      source: "ai",
      quality: check?.status || "ok",
      suggestedValue: check?.suggestedValue || undefined,
      reason: check?.reason || undefined,
    };
  }

  if (structured) {
    return {
      field,
      value: structured,
      source: "structured",
      quality: check?.status || "ok",
      suggestedValue: check?.suggestedValue || (check?.status === "conflict" ? ai : undefined),
      reason: check?.reason || undefined,
    };
  }

  if (field === "title" && ai && local && !isGenericTitle(local) && isGenericTitle(ai)) {
    return {
      field,
      value: local,
      source: "local",
      quality: check?.status === "verify" ? "verify" : "ok",
      suggestedValue: ai,
      reason: "Titre source plus précis que le titre générique IA.",
    };
  }
  if (ai && check?.status !== "conflict") {
    return {
      field,
      value: ai,
      source: "ai",
      quality: check?.status || "ok",
      suggestedValue: check?.suggestedValue || undefined,
      reason: check?.reason || undefined,
    };
  }

  return {
    field,
    value: local,
    source: "local",
    quality: check?.status === "conflict" ? "conflict" : "ok",
    suggestedValue: check?.suggestedValue || ai || undefined,
    reason: check?.reason || undefined,
  };
};

const aiSignalUsable = (job: JobRecord, field: "poeiSignal" | "auditSignal" | "independentSignal", value: boolean | undefined) => {
  if (!value || job.aiReview?.status !== "done") return false;
  return qualityCheckForField(job, field)?.status !== "conflict";
};

const isGenericTitle = (value: string) => {
  const text = normalize(value);
  return diagnosticImmobilierProfile.analysis.genericTitles.includes(text);
};

export const getControlledExtraction = (job: JobRecord, detectedAnalysis: ExtractionBase): ControlledExtraction => {
  const manual = job.manualExtraction;
  const ai = aiExtraction(job);
  const structured = structuredExtraction(job);
  const fields: ControlledExtraction["fields"] = {
    title: controlledField(job, "title", manual?.title, structured.title, ai?.title, detectedAnalysis.normalizedTitle),
    company: controlledField(job, "company", manual?.company, structured.company, ai?.company, detectedAnalysis.company),
    location: controlledField(job, "location", manual?.location, structured.location, ai?.location, detectedAnalysis.location),
    contract: controlledField(job, "contract", manual?.contract, structured.contract, ai?.contract, detectedAnalysis.contract),
    workTime: controlledField(job, "workTime", manual?.workTime, structured.workTime, ai?.workTime, detectedAnalysis.workTime),
    salary: controlledField(job, "salary", manual?.salary, structured.salary, ai?.salary, detectedAnalysis.salary),
    salaryKind: controlledField(job, "salaryKind", undefined, structured.salaryKind, ai?.salaryKind, detectedAnalysis.salaryKind),
    bonus: controlledField(job, "bonus", manual?.bonus, structured.bonus, ai?.bonus, detectedAnalysis.bonus),
    bonusEstimate: controlledField(job, "bonusEstimate", manual?.bonusEstimate, structured.bonusEstimate, ai?.bonusEstimate, detectedAnalysis.bonusEstimate),
    requiredExperience: controlledField(job, "requiredExperience", manual?.requiredExperience, structured.requiredExperience, ai?.requiredExperience, detectedAnalysis.requiredExperience),
    benefits: controlledField(job, "benefits", manual?.benefits, structured.benefits, ai?.benefits, detectedAnalysis.benefits),
  };
  const values = Object.fromEntries(Object.entries(fields).map(([field, meta]) => [field, meta.value])) as ControlledExtractionValues;
  const alerts = Object.values(fields).filter((field) => field.quality !== "ok");
  return { values, fields, alerts };
};

const controlledExtractionLines = (controlled: ControlledExtraction, job: JobRecord) => {
  const values = controlled.values;
  const ai = aiExtraction(job);
  return [
    ["Poste", values.title],
    ["Entreprise", values.company],
    ["Lieu", values.location],
    ["Contrat", values.contract],
    ["Temps de travail", values.workTime],
    ["Salaire", values.salary],
    ["Brut / net", values.salaryKind],
    ["Primes", values.bonus],
    ["Primes estimÃ©es", values.bonusEstimate],
    ["Expérience demandée", values.requiredExperience],
    ["Avantages", values.benefits],
    ["Signal POEI", aiSignalUsable(job, "poeiSignal", ai?.poeiSignal) ? "oui" : ""],
    ["Signal audit", aiSignalUsable(job, "auditSignal", ai?.auditSignal) ? "oui" : ""],
    ["Signal indÃ©pendant", aiSignalUsable(job, "independentSignal", ai?.independentSignal) ? "oui" : ""],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label} : ${value}`)
    .join("\n");
};

export const getEffectiveExtraction = (job: JobRecord, detectedAnalysis: ExtractionBase) => {
  return getControlledExtraction(job, detectedAnalysis).values;
};

const buildScoringSignals = (
  text: string,
  combined: string,
  fields: { salary: string; salaryKind: JobAnalysis["salaryKind"]; bonus: string; workTime: string },
  profile = diagnosticImmobilierProfile,
) => {
  const bonusText = normalize(fields.bonus);
  const workTimeText = normalize(fields.workTime);
  const beginnerFriendly = hasAny(text, [
    "debutant accepte",
    "debutant bienvenu",
    "junior",
    "profil debutant",
    "profil junior",
    "sans experience",
    "sans experience exigee",
    "premiere experience acceptee",
    "reconversion",
    "transition professionnelle",
    "formation assuree",
    "formation avant embauche",
  ]);
  const employerTraining = hasAny(text, [
    "formation assuree par nos soins",
    "formation assurée par nos soins",
    "formation prise en charge par nos soins",
    "formation assuree",
    "formation assurée",
    "formation interne",
    "formation complete",
    "formation complète",
    "formation remuneree",
    "formation rémunérée",
    "formation payee",
    "formation payée",
    "nous vous formons",
    "nous formons",
    "vous serez forme",
    "vous serez formé",
    "formation avant prise de poste",
    "formation avant embauche",
    "formation prealable avant embauche",
    "formation préalable avant embauche",
    "parcours d'integration",
    "parcours d'intégration",
    "parcours certifiant",
    "parcours qualifiant",
    "montee en competence",
    "montée en compétence",
    "accompagnement terrain",
    "accompagnement technique",
    "tutorat",
    "ecole interne",
    "école interne",
  ]);
  const employerTrainingEquivalent = employerTraining && beginnerFriendly;
  const poei = hasAny(text, [
    "poei",
    "poei individuelle",
    "poec",
    "poe collective",
    "poeic",
    "poei collective",
    "poe",
    "afpr",
    "preparation operationnelle a l'emploi",
    "preparation operationnelle a l emploi",
    "preparation operationnelle a l'emploi individuelle",
    "preparation operationnelle a l emploi individuelle",
    "preparations operationnelles a l'emploi",
    "preparations operationnelles a l emploi",
    "preparation operationnelle collective",
    "preparation operationnelle a l'emploi collective",
    "preparation operationnelle a l emploi collective",
    "préparation opérationnelle à l'emploi",
    "préparation opérationnelle à l'emploi collective",
    "action de formation prealable au recrutement",
    "actions de formations prealables au recrutement",
    "action de formation préalable au recrutement",
    "formation prealable au recrutement",
    "formations prealables au recrutement",
    "formation préalable au recrutement",
    "formation de preparation",
    "formations de preparation",
    "formation avant recrutement",
    "formation avant embauche",
  ]) ||
    /\bpreparations?\s+operationnelles?\s+(?:(?:a|pour)\s+l(?:'|’|\s)?)?emploi\b/.test(text) ||
    /\bpreparations?\s+operationnelles?\s+(?:a\s+)?l(?:'|’|\s)?emploi\s+individuelles?\b/.test(text) ||
    /\bactions?\s+de\s+formations?\s+prealables?\s+au\s+recrutement\b/.test(text) ||
    /\bformations?\s+prealables?\s+au\s+recrutement\b/.test(text) ||
    /\bformations?\s+de\s+preparations?\b/.test(text) ||
    /\bpoe[ic]?\b/.test(text);
  const fundedCerts = hasAny(text, [
    "certification financee",
    "certifications financees",
    "certifications prises en charge",
    "certification prise en charge",
    "certification payee",
    "certification payée",
    "certification offerte",
    "certification financee par l'employeur",
    "formation prise en charge",
    "formation prise en charge par l'employeur",
    "formation prise en charge par employeur",
    "formation financee",
    "formation financée",
    "formation financee par l'employeur",
    "formation financée par l'employeur",
    "formation payee par l'employeur",
    "formation payée par l'employeur",
    "formation gratuite",
    "formation offerte",
    "frais de formation pris en charge",
    "cout de formation pris en charge",
    "coût de formation pris en charge",
    "prise en charge des frais de formation",
    "prise en charge de la formation",
    "financement opco",
    "financement par l'opco",
    "financement cpf",
    "abondement cpf",
    "financement france travail",
    "financement pole emploi",
    "financement pôle emploi",
    "aide france travail",
    "aide pole emploi",
    "aide pôle emploi",
  ]);
  const trainingClear =
    poei ||
    fundedCerts ||
    employerTraining;
  const vagueTraining = hasAny(text, [
    "formation possible",
    "profil debutant etudie",
    "profil débutant étudié",
    "idealement certifie",
    "idéalement certifié",
    "accompagnement prevu",
    "accompagnement prévu",
  ]);
  const cdi = hasAny(text, ["cdi", "duree indeterminee", "durée indéterminée"]);
  const audit = hasAny(combined, profile.analysis.strategicTerms);
  const renovation = hasAny(text, profile.analysis.trajectoryTerms);
  const independent = hasAny(text, [
    "statut independant",
    "independant impose",
    "indépendant imposé",
    "auto-entrepreneur",
    "micro-entrepreneur",
    "agent commercial",
    "mandataire",
    "franchise",
    "statut non salarie",
    "statut non salarié",
    "a votre compte",
    "à votre compte",
    "developper votre portefeuille",
    "développer votre portefeuille",
  ]);
  const variableDominant = hasAny(`${text} ${bonusText}`, [
    "100% variable",
    "remuneration selon performance",
    "rémunération selon performance",
    "commissions uniquement",
    "non plafonne",
    "non plafonné",
    "fort potentiel de revenu",
    "objectifs ambitieux",
  ]);
  const variableMentioned = hasAny(`${text} ${bonusText}`, ["prime", "primes", "variable", "commission", "commissions", "13eme mois", "treizieme mois"]);
  const salaryVague = hasAny(text, ["selon profil", "package attractif", "remuneration motivante", "rémunération motivante", "salaire a negocier", "salaire à négocier"]);
  const payTraining = hasAny(text, [
    "formation a votre charge",
    "formation à votre charge",
    "formation a payer",
    "formation à payer",
    "certification a votre charge",
    "certification à votre charge",
    "pack de demarrage",
    "pack de démarrage",
  ]);
  const fullTime = hasAny(workTimeText, ["35h", "37h", "39h", "temps plein"]);
  const partTime = hasAny(workTimeText, ["temps partiel"]);

  return {
    beginnerFriendly,
    employerTraining,
    employerTrainingEquivalent,
    poei,
    trainingClear,
    fundedCerts,
    vagueTraining,
    cdi,
    audit,
    renovation,
    independent,
    variableDominant,
    variableMentioned,
    salaryVague,
    payTraining,
    fullTime,
    partTime,
  };
};

export const analyzeJob = (job: JobRecord, strategy: Strategy): JobAnalysis => {
  const profile = getActiveProfile(strategy);
  const originalRawText = job.rawText.trim();
  const localText = normalize(originalRawText);
  const target = normalize(`${strategy.targetJob} ${strategy.objective}`);
  const localCombined = `${localText} ${target}`;
  const localSalary = findSalary(originalRawText);
  const localSalaryKind = salaryKindFor(originalRawText, localSalary);
  const localBonus = findBonus(originalRawText);
  const localNormalizedSalary = normalizeSalary(localSalary, localSalaryKind, originalRawText);
  const localTitle = findTitle(originalRawText, localText, profile);
  const localBase: ExtractionBase = {
    normalizedTitle: localTitle && localTitle !== "Offre importÃ©e" ? localTitle : normalizeTitle(localCombined, profile),
    company: findCompany(originalRawText),
    location: findLocation(originalRawText, localText),
    contract: findContract(localText),
    workTime: findWorkTime(originalRawText, localText),
    salary: localSalary,
    salaryKind: localSalaryKind,
    bonus: localBonus,
    bonusEstimate: estimateBonus(localBonus, localNormalizedSalary, ""),
    requiredExperience: findRequiredExperience(originalRawText, localText),
    benefits: findBenefits(originalRawText, localText),
  };
  const controlled = getControlledExtraction(job, localBase);
  const ai = aiExtraction(job);
  const rawText = [controlledExtractionLines(controlled, job), originalRawText].filter(Boolean).join("\n\n");
  const text = normalize(rawText);
  const combined = `${text} ${target}`;
  const priorityPoei = strategy.priorityPoei ?? false;

  const positiveSignals: string[] = [];
  const redFlags: string[] = [];
  const uncertainties: string[] = [];
  const scoreLines: ScoreLine[] = [];

  const salary = controlled.values.salary || findSalary(rawText);
  const salaryClear = salary !== "Non indiqué";
  const salaryKind = (controlled.values.salaryKind as JobAnalysis["salaryKind"]) || salaryKindFor(rawText, salary);
  const bonus = controlled.values.bonus || findBonus(rawText);
  const normalizedSalaryBase = normalizeSalary(salary, salaryKind, rawText);
  const bonusEstimate = controlled.values.bonusEstimate || estimateBonus(bonus, normalizedSalaryBase, cleanManualField(ai?.bonusEstimate));
  const normalizedSalary = withSalaryPackage(normalizedSalaryBase, bonus, bonusEstimate);
  const workTime = controlled.values.workTime || findWorkTime(rawText, text);
  const requiredExperience = controlled.values.requiredExperience || findRequiredExperience(rawText, text);
  const experienceFit = experienceFitFor(requiredExperience);
  const benefits = controlled.values.benefits || findBenefits(rawText, text);
  const scoringSignals = buildScoringSignals(text, combined, { salary, salaryKind, bonus, workTime }, profile);
  const {
    beginnerFriendly,
    employerTraining,
    employerTrainingEquivalent,
    poei,
    trainingClear,
    fundedCerts,
    vagueTraining,
    cdi,
    audit,
    renovation,
    independent,
    variableDominant,
    variableMentioned,
    salaryVague,
    payTraining,
    fullTime,
    partTime,
  } = scoringSignals;
  const training = trainingClear;
  const poeiEquivalent = !poei && employerTrainingEquivalent;
  const strategicPriority =
    Boolean(strategy.priorityAudit) &&
    (profile.id === DIAGNOSTIC_PROFILE_ID || strategy.auditRequirement === "required" || Boolean(strategy.objective.trim()));
  const vehicle = hasAny(text, ["vehicule fourni", "voiture de service", "vehicule de service", "outils fournis"]);
  const mentoring = hasAny(text, ["tutorat", "accompagnement terrain", "accompagnement technique", "binome", "autonomie progressive"]);
  const knownStructure = hasAny(text, profile.analysis.knownStructureTerms);
  const copro = hasAny(text, ["copropriete", "coproprietes", "syndic", "syndics", "tertiaire"]);
  const volumePressure = hasAny(text, ["rythme soutenu", "planning dense", "nombreuses interventions", "objectifs ambitieux", "secteur elargi", "forte autonomie"]);
  const hugeArea = hasAny(text, ["departements limitrophes", "region entiere", "secteur national", "grande mobilite", "déplacements fréquents"]);

  addSignal(positiveSignals, beginnerFriendly && !employerTrainingEquivalent, "Débutant ou junior accepté");
  addSignal(positiveSignals, employerTrainingEquivalent, "Formation facilitée par l'employeur");
  addSignal(positiveSignals, poei, "Formation facilitée avec dispositif POEI / POE / AFPR");
  addSignal(positiveSignals, employerTraining && !employerTrainingEquivalent, "Formation employeur détectée");
  addSignal(positiveSignals, training && !employerTraining && !poei && !fundedCerts, "Formation interne détectée");
  addSignal(positiveSignals, fundedCerts, "Formation ou certifications financées");
  addSignal(positiveSignals, cdi, "CDI détecté");
  addSignal(positiveSignals, salaryClear, "Salaire indiqué");
  addSignal(positiveSignals, salaryClear && salaryKind !== "non précisé", `Salaire ${salaryKind} précisé`);
  addSignal(positiveSignals, fullTime, "Temps plein détecté");
  addSignal(positiveSignals, vehicle, "Véhicule ou outils fournis");
  addSignal(positiveSignals, mentoring, "Accompagnement terrain");
  addSignal(positiveSignals, audit, profile.ui.strategicDetectedLabel);
  addSignal(positiveSignals, renovation, profile.id === DIAGNOSTIC_PROFILE_ID ? "Lien rénovation / conseil travaux" : "Perspective d'évolution détectée");
  addSignal(positiveSignals, copro, "Exposition copropriété / tertiaire");

  addSignal(redFlags, independent, "Statut indépendant ou assimilé");
  addSignal(redFlags, variableDominant, "Rémunération trop dépendante du variable");
  addSignal(redFlags, payTraining, "Formation potentiellement à payer");
  addSignal(redFlags, volumePressure, "Rythme ou volume possiblement élevé");
  addSignal(redFlags, hugeArea, "Zone de déplacement large");

  addSignal(uncertainties, !salaryClear, "Salaire non indiqué");
  addSignal(uncertainties, salaryClear && salaryKind === "non précisé", "Salaire brut/net non précisé");
  addSignal(uncertainties, salaryVague, "Salaire formulé de manière floue");
  addSignal(uncertainties, variableMentioned && !variableDominant, "Primes ou variable à clarifier");
  addSignal(uncertainties, partTime, "Temps partiel à vérifier avec ton objectif cashflow");
  addSignal(uncertainties, priorityPoei && poeiEquivalent, "Formation facilitée à formaliser ou financer");
  addSignal(uncertainties, priorityPoei && !poei && !poeiEquivalent, "Formation facilitée non confirmée");
  addSignal(uncertainties, !training && vagueTraining, "Formation mentionnée mais floue");
  addSignal(uncertainties, !fundedCerts && hasAny(text, ["certification", "certifications"]), "Financement des certifications à vérifier");
  addSignal(uncertainties, strategicPriority && !audit, profile.ui.strategicMissingLabel);
  addSignal(uncertainties, !vehicle, "Véhicule ou frais non précisés");

  const monthlyNetMid = normalizedSalary.monthlyNetMin && normalizedSalary.monthlyNetMax
    ? (normalizedSalary.monthlyNetMin + normalizedSalary.monthlyNetMax) / 2
    : undefined;
  const salaryAboveTarget = Boolean(monthlyNetMid && strategy.salaryMin && monthlyNetMid >= strategy.salaryMin);
  const salaryBelowTarget = Boolean(monthlyNetMid && strategy.salaryMin && monthlyNetMid < strategy.salaryMin);

  let riskPenalty = 0;

  let formationScore = 30;
  let salaryScore = 35;
  let trajectoryScore = 35;
  let employerScore = 40;

  const scoreLine = (axis: NonNullable<ScoreLine["axis"]>, label: string, value: number) => {
    scoreLines.push({ axis, label, value });
  };
  const raise = (axis: NonNullable<ScoreLine["axis"]>, label: string, points: number, apply: () => void) => {
    apply();
    scoreLine(axis, label, points);
  };
  const lower = (axis: NonNullable<ScoreLine["axis"]>, label: string, points: number, apply: () => void, risk = 0) => {
    apply();
    riskPenalty += risk;
    scoreLine(axis, label, -points);
  };

  if (beginnerFriendly) raise("formationFacilitee", "Débutant / reconversion accepté", 12, () => { formationScore += 12; trajectoryScore += 4; });
  if (employerTraining) raise("formationFacilitee", "Formation employeur ou parcours d'intégration", 22, () => { formationScore += 22; });
  if (poeiEquivalent) raise("formationFacilitee", "Formation facilitée à formaliser", 12, () => { formationScore += 12; });
  if (poei) raise("formationFacilitee", "Formation facilitée avec POEI / POE / AFPR", 24, () => { formationScore += 24; });
  if (fundedCerts) raise("formationFacilitee", "Formation ou certifications financées", 20, () => { formationScore += 20; });
  if (mentoring) raise("formationFacilitee", "Accompagnement terrain", 8, () => { formationScore += 8; employerScore += 3; });
  if (vagueTraining && !training) lower("formationFacilitee", "Formation mentionnée mais floue", 8, () => { formationScore -= 8; }, 4);
  if (!training && strategy.priorityTraining) lower("formationFacilitee", "Formation facilitée non confirmée", 12, () => { formationScore -= 12; }, 6);
  if (!poei && priorityPoei) {
    lower("formationFacilitee", poeiEquivalent ? "Formation facilitée à formaliser" : "Formation facilitée non confirmée", poeiEquivalent ? 4 : 10, () => {
      formationScore -= poeiEquivalent ? 4 : 10;
    }, poeiEquivalent ? 2 : 5);
  }
  if (payTraining) lower("formationFacilitee", "Formation à la charge du candidat", 34, () => { formationScore -= 34; }, 34);

  if (cdi) raise("salaryPackage", "Contrat stable", 12, () => { salaryScore += 12; trajectoryScore += 4; });
  if (salaryClear) {
    raise("salaryPackage", salaryKind === "non précisé" ? "Salaire indiqué, brut/net à confirmer" : `Salaire ${salaryKind} indiqué`, salaryKind === "non précisé" ? 12 : 20, () => {
      salaryScore += salaryKind === "non précisé" ? 12 : 20;
    });
  }
  if (salaryAboveTarget) raise("salaryPackage", "Fixe net estimé au-dessus de ton minimum", 16, () => { salaryScore += 16; });
  if (salaryBelowTarget) lower("salaryPackage", "Fixe net estimé sous ton minimum", 18, () => { salaryScore -= 18; }, 8);
  if (normalizedSalary.packageMonthlyNetMin || normalizedSalary.packageMonthlyNetMax) raise("salaryPackage", "Package primes estimable", 6, () => { salaryScore += 6; });
  if (vehicle) raise("salaryPackage", "Véhicule ou outils fournis", 8, () => { salaryScore += 8; employerScore += 3; });
  if (!salaryClear) lower("salaryPackage", "Salaire absent", strategy.prioritySalary ? 18 : 10, () => { salaryScore -= strategy.prioritySalary ? 18 : 10; }, strategy.prioritySalary ? 10 : 5);
  if (salaryClear && salaryKind === "non précisé") lower("salaryPackage", "Brut/net non précisé", strategy.prioritySalary ? 10 : 5, () => { salaryScore -= strategy.prioritySalary ? 10 : 5; }, strategy.prioritySalary ? 5 : 2);
  if (salaryVague) lower("salaryPackage", "Salaire flou", strategy.prioritySalary ? 12 : 7, () => { salaryScore -= strategy.prioritySalary ? 12 : 7; }, strategy.prioritySalary ? 6 : 3);
  if (variableDominant) lower("salaryPackage", "Rémunération dominée par variable / commissions", 30, () => { salaryScore -= 30; }, 32);
  if (partTime && strategy.prioritySalary) lower("salaryPackage", "Temps partiel à vérifier pour le salaire / package", 10, () => { salaryScore -= 10; }, 5);
  if (fullTime) raise("salaryPackage", "Temps plein détecté", 5, () => { salaryScore += 5; });

  if (cdi && beginnerFriendly && (training || poei || fundedCerts || employerTrainingEquivalent)) raise("trajectory", "Tremplin reconversion solide", 16, () => { trajectoryScore += 16; });
  if (audit) raise("trajectory", profile.ui.strategicDetectedLabel, 16, () => { trajectoryScore += 16; });
  if (renovation) raise("trajectory", profile.id === DIAGNOSTIC_PROFILE_ID ? "Lien rénovation / conseil travaux" : "Perspective d'évolution détectée", 18, () => { trajectoryScore += 18; });
  if (copro) raise("trajectory", "Copropriété, syndic ou tertiaire", 8, () => { trajectoryScore += 8; });
  if (experienceFit === "reconversion_ok" || experienceFit === "junior") raise("trajectory", "Niveau d'expérience compatible", 8, () => { trajectoryScore += 8; });
  if (experienceFit === "confirme") lower("trajectory", "Expérience confirmée demandée", 12, () => { trajectoryScore -= 12; }, 4);
  if (strategicPriority && !audit) lower("trajectory", profile.ui.strategicMissingLabel, strategy.auditRequirement === "required" ? 24 : 10, () => {
    trajectoryScore -= strategy.auditRequirement === "required" ? 24 : 10;
  }, strategy.auditRequirement === "required" ? 12 : 4);

  if (knownStructure) raise("employer", "Structure potentiellement formatrice", 14, () => { employerScore += 14; });
  if (benefits && benefits !== "Non précisés") raise("employer", "Avantages employeur mentionnés", 8, () => { employerScore += 8; });
  if (volumePressure) lower("employer", "Pression volume possible", 12, () => { employerScore -= 12; }, 14);
  if (hugeArea) lower("employer", "Zone de déplacement large", 10, () => { employerScore -= 10; }, 10);
  if (independent && strategy.rejectIndependent) lower("risk", "Statut indépendant imposé", 0, () => undefined, 42);

  const riskLevel = riskLabel(riskPenalty);
  const riskScore = clampScore(100 - riskPenalty * 1.5 - uncertainties.length * 4);
  const finalFormation = clampScore(formationScore);
  const finalSalary = clampScore(salaryScore);
  const finalTrajectory = clampScore(trajectoryScore);
  const finalEmployer = clampScore(employerScore);
  const weightedLocal = clampScore(
    finalFormation * 0.25 +
      finalSalary * 0.25 +
      finalTrajectory * 0.2 +
      finalEmployer * 0.15 +
      riskScore * 0.15,
  );

  const radarAxes = strategy.radarAxes || ["Formation", "Salaire", "Trajectoire", "Employeur", "Risque"];
  const customAxesScores: Record<string, number> = {};
  const normalizedText = (originalRawText || "").toLowerCase();

  radarAxes.forEach((axis) => {
    if (job.aiReview?.status === "done" && job.aiReview.customAxesScores && typeof job.aiReview.customAxesScores[axis] === "number") {
      customAxesScores[axis] = job.aiReview.customAxesScores[axis];
      return;
    }
    const lowerAxis = axis.toLowerCase();
    if (lowerAxis === "formation") {
      customAxesScores[axis] = finalFormation;
    } else if (lowerAxis === "salaire") {
      customAxesScores[axis] = finalSalary;
    } else if (lowerAxis === "trajectoire" || lowerAxis === "evolution" || lowerAxis === "évolution") {
      customAxesScores[axis] = finalTrajectory;
    } else if (lowerAxis === "employeur") {
      customAxesScores[axis] = finalEmployer;
    } else if (lowerAxis === "risque") {
      customAxesScores[axis] = riskScore;
    } else {
      const keywords = lowerAxis.split(/[\s/']+/).filter((word) => word.length >= 3);
      const matched = keywords.length > 0 && keywords.some((word) => normalizedText.includes(word));
      customAxesScores[axis] = matched ? 85 : 50;
    }
  });

  const avgCustomScore = clampScore(Math.round(Object.values(customAxesScores).reduce((sum, val) => sum + val, 0) / radarAxes.length));
  const baseLocalGlobal = (strategy.radarAxes && strategy.radarAxes.length > 0) ? avgCustomScore : weightedLocal;

  const formationRequiredMissing = strategy.poeiRequirement === "required" && !(training || poei || fundedCerts || employerTrainingEquivalent);
  const auditRequiredMissing = strategy.auditRequirement === "required" && !audit;
  const independentBlocked = independent && strategy.rejectIndependent;
  const salaryGuardWeak = strategy.prioritySalary && (!salaryClear || salaryVague || salaryKind === "non précisé");
  if (formationRequiredMissing) scoreLine("formationFacilitee", "Garde-fou : formation facilitée obligatoire absente", -25);
  if (auditRequiredMissing) scoreLine("trajectory", `Garde-fou : ${profile.ui.strategicRequirementLabel} obligatoire absent`, -22);
  if (independentBlocked) scoreLine("risk", "Garde-fou : indépendant refusé", -30);
  if (salaryGuardWeak) scoreLine("salaryPackage", "Garde-fou : salaire prioritaire encore trop flou", -12);
  const localGlobal = clampScore(Math.min(
    baseLocalGlobal,
    formationRequiredMissing ? 54 : 100,
    auditRequiredMissing ? 58 : 100,
    independentBlocked ? 42 : 100,
    salaryGuardWeak ? 78 : 100,
  ));
  const adjustment = aiScoreAdjustment(job);
  if (adjustment !== 0) {
    scoreLines.push({ axis: "ai", label: `Avis intelligent : ${adjustment > 0 ? "bonus" : "malus"} IA`, value: adjustment });
  }
  const finalGlobal = clampScore(localGlobal + adjustment);

  const trapOffer = (independent && strategy.rejectIndependent) || variableDominant || payTraining;
  const tremplinOffer = cdi && beginnerFriendly && (training || poei || fundedCerts || employerTrainingEquivalent) && riskLevel !== "élevé";
  const stableCashflowOffer = cdi && salaryClear && salaryKind !== "non précisé" && !variableDominant && riskLevel === "faible";
  const strategicPathOffer = (audit || renovation) && finalTrajectory >= 66 && !trapOffer;
  const offerType = pickOfferType(finalGlobal, finalFormation, finalSalary, finalTrajectory, finalTrajectory, riskLevel, {
    trap: trapOffer,
    tremplin: tremplinOffer,
    stableCashflow: stableCashflowOffer,
    strategicPath: strategicPathOffer,
  });
  const verdict = verdictFor(finalGlobal, offerType, riskLevel);
  const normalizedTitle = controlled.values.title || normalizeTitle(combined, profile);
  const company = controlled.values.company || findCompany(rawText);
  const companyType = companyTypeFor(company, combined);
  const companySearchUrl = companySearchUrlFor(company, profile);
  const location = controlled.values.location || findLocation(rawText, text);
  const contract = controlled.values.contract || findContract(text);
  const title = controlled.values.title || findTitle(rawText, text, profile);
  const confidence = confidenceFor(rawText, salaryClear, company, location, contract, uncertainties);

  const questions = [
    poei
      ? profile.analysis.questions.poeiKnown
      : employerTraining
        ? "La formation assurée par vos soins peut-elle être formalisée en POEI, AFPR ou autre financement France Travail ?"
        : training || vagueTraining
          ? profile.analysis.questions.trainingKnown
          : profile.analysis.questions.trainingMissing,
    "Combien d'interventions sont prévues par jour en moyenne ?",
    audit ? profile.analysis.questions.strategicKnown : profile.analysis.questions.strategicMissing,
    salaryClear ? "Quelle part du salaire est fixe et quelle part dépend du variable ?" : "Quel est le fixe exact, hors primes et variables ?",
  ];

  const summary =
    positiveSignals.length > 0
      ? `${positiveSignals.slice(0, 3).join(", ")}. ${redFlags[0] ? `Point de vigilance : ${redFlags[0].toLowerCase()}.` : "Peu de signaux bloquants détectés."}`
      : "Annonce encore trop peu qualifiée. Il faut récupérer plus d'informations avant de décider.";

  const applicationAngle = audit || renovation
    ? profile.analysis.applicationAngles.strategic
    : profile.analysis.applicationAngles.default;
  const verdictReasons = [...redFlags.slice(0, 2), ...positiveSignals.slice(0, 3), ...uncertainties.slice(0, 2)].slice(0, 3);

  return {
    id: job.id,
    title,
    normalizedTitle,
    company,
    companyType,
    companySearchUrl,
    location,
    contract,
    workTime,
    salary,
    salaryKind,
    normalizedSalary,
    bonus,
    bonusEstimate,
    requiredExperience,
    experienceFit,
    benefits,
    summary,
    verdict,
    verdictReasons,
    offerType,
    riskLevel,
    localScore: localGlobal,
    aiScoreAdjustment: adjustment,
    aiScoreReasons: job.aiReview?.status === "done" && Array.isArray(job.aiReview.scoreReasons) ? job.aiReview.scoreReasons.slice(0, 4) : [],
    scores: {
      global: finalGlobal,
      formationFacilitee: finalFormation,
      salaryPackage: finalSalary,
      training: finalFormation,
      cashflow: finalSalary,
      trajectory: finalTrajectory,
      employer: finalEmployer,
      audit: finalTrajectory,
      risk: riskScore,
    },
    positiveSignals,
    redFlags,
    uncertainties,
    questions,
    applicationAngle,
    scoreLines,
    scoreConfidence: confidence.level,
    confidenceReasons: confidence.reasons,
    rawText: originalRawText,
    customAxesScores,
  };
};

export const createJobRecord = (rawText: string): JobRecord => ({
  id: crypto.randomUUID(),
  rawText,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  favorite: false,
  ignored: false,
  reviewStatus: "a_traiter",
});
