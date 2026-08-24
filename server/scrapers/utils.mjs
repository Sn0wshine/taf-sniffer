export function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function unique(items) {
  return [...new Set(items.map((item) => compact(item)).filter(Boolean))];
}

export function stripAccents(value) {
  return compact(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function normalized(value) {
  return stripAccents(value).toLowerCase();
}

export function interleave(a, b) {
  const out = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i += 1) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

export function experienceVariants(target, experienceLevel = "debutant_reconversion") {
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

export function buildKeywordVariants(targetJob, smartSearch = true, experienceLevel = "debutant_reconversion") {
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

export function buildLocationVariants(location, smartLocation = true) {
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

export function buildQueryPairs(keywords, locations) {
  const mainLocation = locations[0] || "";
  const pairs = [
    ...keywords.slice(0, 6).map((keyword) => ({ keywords: keyword, location: mainLocation })),
    ...locations.slice(1, 4).map((location) => ({ keywords: keywords[0], location })),
  ];
  return pairs.filter((pair, index, list) =>
    list.findIndex((item) => item.keywords === pair.keywords && item.location === pair.location) === index,
  );
}

export function hasPoeiSignal(value) {
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

export function hasPoeiEquivalentSignal(value) {
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

export function hasPoeiOrEquivalentSignal(value) {
  return hasPoeiSignal(value) || hasPoeiEquivalentSignal(value);
}

export function hasAuditSignal(value) {
  const text = normalized(value);
  return (
    text.includes("audit energetique") ||
    text.includes("auditeur energetique") ||
    text.includes("renovation energetique") ||
    text.includes("conseil travaux") ||
    text.includes("dpe avec mention")
  );
}

export function applyRequiredTerms(keyword, requiredPoei, requiredAudit) {
  const terms = [];
  if (requiredPoei && !hasPoeiOrEquivalentSignal(keyword)) terms.push("POEI");
  if (requiredAudit && !hasAuditSignal(keyword)) terms.push("audit énergétique");
  return compact([keyword, ...terms].join(" "));
}

export function expandRequiredTerms(keyword, requiredPoei, requiredAudit, smartSearch) {
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

export function matchesRequiredSignals(job, requiredPoei, requiredAudit) {
  const text = job?.rawText || "";
  if (requiredPoei && !hasPoeiOrEquivalentSignal(text)) return false;
  if (requiredAudit && !hasAuditSignal(text)) return false;
  return true;
}

export function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

export function stripHtml(value) {
  return decodeHtml(
    String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

export function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return compact(decodeHtml(match[1]));
  }
  return "";
}

export function cleanExtractedValue(value) {
  return compact(
    stripHtml(value)
      .replace(/\\u002F/g, "/")
      .replace(/\\"/g, '"')
      .replace(/\s+["']?\s*(?:name|content|class|id|property|data-[\w-]+)=["'][^"']*["'].*$/i, " ")
      .replace(/["']\s*>?\s*$/g, "")
      .replace(/\b(\d+)\.0\b/g, "$1"),
  );
}

export function looksLikeJobBoardDomain(value) {
  const text = normalized(value);
  return (
    /\b(?:www\.)?[\w-]+\.(?:com|fr|net|org)\b/i.test(value) ||
    ["hellowork", "indeed", "linkedin", "france travail", "pole emploi", "pôle emploi", "apec"].some((term) => text.includes(normalized(term)))
  );
}

export function cleanCompanyValue(value) {
  const clean = cleanExtractedValue(value)
    .replace(/^chez\s+/i, "")
    .replace(/\s*[-|]\s*(?:recrutement|emploi|jobs?).*$/i, "")
    .replace(/\s+(?:\d+\s*(?:à|a|-|\?)\s*\d+|\d+)\s+salari\S*s?.*$/i, "")
    .slice(0, 90);
  const text = normalized(clean);
  if (!clean || looksLikeJobBoardDomain(clean) || text.includes("entreprise non precise") || /^employeur$/.test(text) || /^(?:\d+\s*(?:a|-|\?)\s*\d+|\d+)\s+salar/.test(text)) return "";
  return clean;
}

export function companyFromEmployerBlock(value) {
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

  const compacted = cleanExtractedValue(value);
  const match = compacted.match(
    /(?:^|\b)Employeur\s+(.+?)(?=\s+(?:\d+\s*(?:à|a|-|\?)\s*\d+|\d+)\s+salari\S*s?\b|\s+Postuler\b|\s+Contacter\b|\s+Informations?\b|\s+Actualis[ée]\b|$)/i,
  );
  return match ? cleanCompanyValue(match[1]) : "";
}

export function companyFromNarrative(value) {
  const clean = cleanExtractedValue(value);
  const match = clean.match(
    /(?:Pourquoi rejoindre|rejoindre)\s+([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ0-9&' .-]{2,70})\s*\?|Depuis\s+plus\s+de\s+\d+\s+ans,\s+([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ0-9&' .-]{2,70})\s+s['’]impose/i,
  );
  return match ? cleanCompanyValue(match[1] || match[2]) : "";
}

export function featureValueAfterIcon(html, iconClass) {
  const escapedIcon = iconClass.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const direct = firstMatch(html, [
    new RegExp(`<div[^>]+class=["'][^"']*permalink-info[^"']*["'][^>]*>[\\s\\S]{0,240}<span[^>]+class=["'][^"']*${escapedIcon}[^"']*["'][^>]*><\\/span>([\\s\\S]{1,180}?)<\\/div>`, "i"),
    new RegExp(`<span[^>]+class=["'][^"']*feature[^"']*["'][^>]*>[\\s\\S]{0,260}<span[^>]+class=["'][^"']*${escapedIcon}[^"']*["'][^>]*><\\/span>[\\s\\S]{0,140}<span[^>]*>([\\s\\S]{1,180}?)<\\/span>`, "i"),
  ]);
  return cleanExtractedValue(direct);
}

export function companyFromSourceHtml(source, html) {
  if (normalized(source).includes("jobijoba")) {
    return cleanCompanyValue(featureValueAfterIcon(html, "icon-apartment")) || companyFromNarrative(html);
  }
  return "";
}

export function departmentCityFrom(value) {
  const clean = cleanExtractedValue(value);
  const match = clean.match(/\b(\d{2,3})\s*-\s*([A-Z\u00C0-\u017F][A-Za-z\u00C0-\u017F0-9' -]{2,80}?)(?=\s*(?:-\s*(?:Localiser|[A-Z0-9]{5,})|\||Actualis|CDI|CDD|Alternance|Int[\u00E9e]rim|Contrat|Temps|Salaire|$))/i);
  return match ? `${match[1]} - ${compact(match[2])}` : "";
}

export function postalCityFrom(value) {
  const clean = cleanExtractedValue(value);
  const match = clean.match(/\b(\d{5})\s+([A-Z\u00C0-\u017F][A-Za-z\u00C0-\u017F0-9' -]{2,80}?)(?=\s*(?:-\s*Localiser|\||Actualis|CDI|CDD|Alternance|Int[\u00E9e]rim|Contrat|Temps|Salaire|$))/i);
  return match ? `${match[1]} ${compact(match[2])}` : "";
}

export function hasSalaryWords(text) {
  return ["selon profil", "a negocier", "à négocier", "brut", "net", "annuel", "mensuel", "horaire", "euros", "eur", "€", "k"].some((term) =>
    text.includes(normalized(term)),
  );
}

export function cleanSalaryValue(value) {
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

export function salaryKindFromText(value) {
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

export const technicalExtractionNoise = [
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

export function cleanInfoValue(value, maxLength = 180) {
  const clean = cleanExtractedValue(value)
    .replace(/^(?:primes?|variable|commissions?|avantages?|expérience demandée|experience demandee|expérience|experience)\s*:?\s*/i, "")
    .replace(/^[\s:;,+-]+/, "")
    .replace(/\s+(?:Source|URL|Qualité extraction|À vérifier|A verifier)\s*:.*$/i, "")
    .slice(0, maxLength);
  const text = normalized(clean);
  if (!clean || technicalExtractionNoise.some((term) => text.includes(normalized(term)))) return "";
  return compact(clean);
}

export function splitInfoSegments(rawText) {
  return String(rawText || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\\u002F/g, "/")
    .replace(/\r/g, "\n")
    .split(/\n+|[•*]\s*|\s+\+\s+|;|\.\s+/)
    .map((segment) => cleanInfoValue(segment, 220))
    .filter(Boolean);
}

export function findBonus(rawText) {
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
    "14eme mois",
    "prime annuelle",
    "prime de partage",
    "sur objectifs",
    "non plafonne",
    "non plafonnée",
    "interessement",
    "participation",
    "prime de participation",
    "prime d'interessement",
    "prime de vacances",
    "prime de fin d'annee",
    "prime de bilan",
    "prime d'activite",
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

export function findBenefits(rawText) {
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

export function jobFingerprint(rawText) {
  const title = normalized(firstMatch(rawText || "", [/^Poste\s*:\s*(.+)$/im]) || "")
    .split(" ").slice(0, 6).join(" ");
  const company = normalized(firstMatch(rawText || "", [/^Entreprise\s*:\s*(.+)$/im]) || "")
    .slice(0, 30);
  return title ? `${title}|${company}` : "";
}

export function findRequiredExperience(rawText) {
  const explicit = cleanInfoValue(firstMatch(rawText, [
    /^(?:expérience demandée|experience demandee|expérience|experience|profil souhaité|profil souhaite)\s*:\s*(.+)$/im,
  ]), 120);
  const text = normalized(`${explicit} ${rawText}`);

  const rangeMatch = text.match(
    /(?:entre\s+)?(\d{1,2})\s*(?:[àa]|et|-)\s*(\d{1,2})\s*(?:an|ans|annee|annees)\b.{0,60}(?:experience)|(?:experience).{0,60}(?:entre\s+)?(\d{1,2})\s*(?:[àa]|et|-)\s*(\d{1,2})\s*(?:an|ans|annee|annees)\b/
  );
  if (rangeMatch) {
    const minY = Number(rangeMatch[1] || rangeMatch[3]);
    if (minY >= 3) return `${minY} ans+`;
    if (minY === 2) return "2 ans";
    if (minY === 1) return "1 an";
  }

  const minMatch = text.match(/(?:minimum|au moins|au minimum|plus de|au-dela de)\s+(\d{1,2})\s*(?:an|ans|annee|annees)\b/);
  if (minMatch) {
    const years = Number(minMatch[1]);
    if (years >= 3) return `${years} ans+`;
    if (years === 2) return "2 ans";
    if (years === 1) return "1 an";
  }

  const yearMatch = text.match(/\b(\d{1,2})\s*(?:annee|annees|an|ans)\b.{0,60}(?:experience)|(?:experience).{0,60}\b(\d{1,2})\s*(?:annee|annees|an|ans)\b/);
  if (yearMatch) {
    const years = Number(yearMatch[1] || yearMatch[2]);
    if (years >= 3) return `${years} ans+`;
    if (years === 1) return "1 an";
    if (years === 2) return "2 ans";
  }

  if ([
    "debutant accepte", "debutant bienvenu", "sans experience", "sans experience exigee",
    "premiere experience acceptee", "reconversion", "tous niveaux", "tout niveau",
    "niveaux d experience acceptes", "ouvert a tous profils", "aucune experience requise",
    "aucune experience exigee", "profil accessible", "sans condition d experience",
    "ouvert aux debutants", "accessible sans experience", "profil debutant accepte",
  ].some((term) => text.includes(normalized(term)))) {
    return "Débutant accepté";
  }

  if (["junior", "profil debutant", "premiere experience"].some((term) => {
    const idx = text.indexOf(normalized(term));
    if (idx === -1) return false;
    const before = text.slice(Math.max(0, idx - 25), idx);
    return !/(pas|non|sans|aucun)\s*$/.test(before);
  })) return "Junior";

  if ([
    "profil confirme", "profil senior", "senior", "experience exigee", "experimente",
    "experience significative", "experience solide", "experience confirmee",
    "experience avancee", "plusieurs annees d experience",
  ].some((term) => text.includes(normalized(term)))) return "Profil confirmé";

  return explicit || "Non précisée";
}

export function cleanLocationValue(value, fallbackText = "") {
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

export function locationFromHtml(html) {
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

export function locationFromSourceHtml(source, html) {
  if (normalized(source).includes("jobijoba")) {
    return cleanLocationValue(featureValueAfterIcon(html, "icon-map-marker"));
  }
  return "";
}

export function cleanWorkTimeValue(value) {
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

export function workTimeFromHtml(html, fallbackText = "") {
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

export function extractContractFromText(value) {
  const match = cleanExtractedValue(value).match(/\b(CDI|CDD|Alternance|Intérim|Interim|Indépendant|Independant)\b/i);
  return match ? match[1] : "";
}

export function contractFromSourceHtml(source, html) {
  if (normalized(source).includes("jobijoba")) {
    return extractContractFromText(featureValueAfterIcon(html, "icon-file-text2"));
  }
  return "";
}

export function apecContractLabel(value) {
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

export function apecOfferNumberFromUrl(url) {
  return firstMatch(url, [/\/detail-offre\/([0-9]+[A-Z]?)/i, /numeroOffre=([0-9]+[A-Z]?)/i]);
}

export function apecLocationFrom(detail, withLieu, fallback) {
  const fromWithLieu = Array.isArray(withLieu?.lieux)
    ? withLieu.lieux.map((lieu) => compact(lieu.libelleLieu || lieu.libelleLieuConfidentiel || lieu.adresse || "")).filter(Boolean)
    : [];
  const fromDetail = Array.isArray(detail?.lieux)
    ? detail.lieux.map((lieu) => compact(lieu.libelleLieu || lieu.libelleLieuConfidentiel || lieu.adresse || "")).filter(Boolean)
    : [];
  return compact([...fromWithLieu, ...fromDetail, fallback?.lieuTexte || ""].find(Boolean) || "");
}

export function flattenJsonLd(value) {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (!value || typeof value !== "object") return [];
  const graph = Array.isArray(value["@graph"]) ? value["@graph"].flatMap(flattenJsonLd) : [];
  return [value, ...graph];
}

export function jsonLdItems(html) {
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

export function jsonLdJobPosting(html) {
  return jsonLdItems(html).find((item) => normalized(String(item["@type"] || "")).includes("jobposting")) || null;
}

export function nestedValue(value, path) {
  return path.reduce((current, key) => (current && typeof current === "object" ? current[key] : undefined), value);
}

export function experienceFromJsonLd(jsonJob) {
  if (!jsonJob) return "";
  const req = jsonJob.experienceRequirements;
  if (!req) return "";
  if (typeof req === "string") return req;
  if (Array.isArray(req)) return req.map((r) => (typeof r === "string" ? r : String(r?.description || r?.name || ""))).filter(Boolean).join(", ");
  if (typeof req === "object") {
    if (req.monthsOfExperience != null) {
      const years = Math.round(Number(req.monthsOfExperience) / 12);
      return `${years} ans`;
    }
    return String(req.description || req.name || "");
  }
  return "";
}

export function salaryFromJsonLd(baseSalary) {
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

export function hashString(value) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

export function extractionQuality({ title, company, location, contract, salary, description }) {
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

export function isImportable(job) {
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

export function isSearchResultUrl(url) {
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

export function isLikelyDetailUrlForSource(source, url) {
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

export function sourceReportMessageClean(source, status, stats) {
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

export function absoluteUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return "";
  }
}
