import type {
  ExpectedExtraction,
  ExpectedReview,
  ExpectedVerdict,
  JobAnalysis,
  ValidationComparison,
  ValidationTag,
} from "./types";

export const validationTags: ValidationTag[] = [
  "POEI",
  "formation facilitée",
  "formation",
  "audit",
  "indépendant",
  "salaire flou",
  "débutant accepté",
  "volume",
];

const includesAny = (items: string[], fragments: string[]) =>
  items.some((item) => fragments.some((fragment) => item.toLowerCase().includes(fragment)));

const normalizeText = (value: string) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const extractionFields: Array<{ field: keyof ExpectedExtraction; label: string; actual: (analysis: JobAnalysis) => string }> = [
  { field: "title", label: "Titre", actual: (analysis) => analysis.normalizedTitle },
  { field: "company", label: "Entreprise", actual: (analysis) => analysis.company },
  { field: "location", label: "Lieu", actual: (analysis) => analysis.location },
  { field: "contract", label: "Contrat", actual: (analysis) => analysis.contract },
  { field: "salary", label: "Salaire", actual: (analysis) => analysis.salary },
  { field: "workTime", label: "Temps de travail", actual: (analysis) => analysis.workTime },
];

const extractionMatches = (analysis: JobAnalysis, expectedExtraction?: ExpectedExtraction) =>
  extractionFields
    .map(({ field, label, actual }) => {
      const expected = String(expectedExtraction?.[field] || "").trim();
      const actualValue = actual(analysis) || "";
      const expectedNormalized = normalizeText(expected);
      const actualNormalized = normalizeText(actualValue);
      const match =
        !expected ||
        expectedNormalized === actualNormalized ||
        (expectedNormalized.length > 3 && actualNormalized.includes(expectedNormalized)) ||
        (actualNormalized.length > 3 && expectedNormalized.includes(actualNormalized));

      return {
        field,
        label,
        expected,
        actual: actualValue,
        match,
      };
    })
    .filter((item) => item.expected);

export const detectedValidationTags = (analysis: JobAnalysis): ValidationTag[] => {
  const positives = analysis.positiveSignals;
  const redFlags = analysis.redFlags;
  const uncertainties = analysis.uncertainties;
  const scoreLabels = analysis.scoreLines.map((line) => line.label);

  const tags: ValidationTag[] = [];

  if (includesAny([...positives, ...scoreLabels], ["poei", "poe", "afpr"])) tags.push("POEI");
  if (includesAny([...positives, ...scoreLabels], ["formation facilitee", "formation facilitée", "formation employeur", "formation financee", "formation financée", "parcours d'intégration", "parcours d'integration"])) {
    tags.push("formation facilitée");
  }
  if (includesAny([...positives, ...scoreLabels], ["formation", "certification", "parcours"])) tags.push("formation");
  if (includesAny([...positives, ...scoreLabels], ["audit", "rénovation", "renovation"])) tags.push("audit");
  if (includesAny([...redFlags, ...scoreLabels], ["indépendant", "independant", "agent commercial", "franchise"])) {
    tags.push("indépendant");
  }
  if (includesAny([...uncertainties, ...redFlags, ...scoreLabels], ["salaire", "rémunération", "remuneration", "variable"])) {
    tags.push("salaire flou");
  }
  if (includesAny([...positives, ...scoreLabels], ["débutant", "debutant", "junior", "reconversion"])) {
    tags.push("débutant accepté");
  }
  if (includesAny([...redFlags, ...scoreLabels], ["volume", "rythme", "planning", "interventions", "déplacement"])) {
    tags.push("volume");
  }

  return tags;
};

export const predictedVerdict = (analysis: JobAnalysis): Exclude<ExpectedVerdict, ""> => {
  if (analysis.offerType === "Offre piège" || analysis.riskLevel === "élevé") return "piège";
  if (analysis.offerType === "Offre hors trajectoire" || analysis.scores.global < 55) return "hors trajectoire";
  if (analysis.scores.global >= 78 || analysis.offerType === "Offre stratégique") return "prioritaire";
  return "à creuser";
};

export const compareValidation = (
  analysis: JobAnalysis,
  expectedReview?: ExpectedReview,
): ValidationComparison => {
  const detectedTags = detectedValidationTags(analysis);
  const expectedTags = expectedReview?.expectedTags ?? [];
  const missedTags = expectedTags.filter((tag) => !detectedTags.includes(tag));
  const extraTags = detectedTags.filter((tag) => !expectedTags.includes(tag));
  const expectedVerdict = expectedReview?.expectedVerdict ?? "";
  const actualVerdict = predictedVerdict(analysis);
  const verdictMatch = expectedVerdict ? expectedVerdict === actualVerdict : null;
  const extractionFieldMatches = extractionMatches(analysis, expectedReview?.expectedExtraction);
  const missedExtractionFields = extractionFieldMatches.filter((item) => !item.match).map((item) => item.label);

  let scoreWarning: string | null = null;
  if (analysis.scoreConfidence === "faible") scoreWarning = "Confiance faible";
  else if (expectedVerdict === "piège" && analysis.scores.global >= 65) scoreWarning = "Piège possiblement surcoté";
  else if (expectedVerdict === "prioritaire" && analysis.scores.global < 65) scoreWarning = "Priorité possiblement sous-cotée";

  return {
    match: (verdictMatch ?? true) && missedTags.length === 0 && missedExtractionFields.length === 0 && !scoreWarning,
    verdictMatch,
    detectedTags,
    missedTags,
    extraTags,
    extractionFieldMatches,
    missedExtractionFields,
    scoreWarning,
    actualVerdict,
  };
};
