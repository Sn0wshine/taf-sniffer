// Signaux de formation financée : détection structurée et traçable.
// Ce module est indépendant du scoring (analysis.ts) : il n'affecte pas le classement,
// il alimente la carte « Formation financée » et le filtre rapide des résultats.

export type FormationLevel = "confirmée" | "possible" | "absente";

export type FormationSignal = {
  /** confirmée = dispositif ou financement explicite ; possible = mention floue */
  level: FormationLevel;
  /** Types de financement / dispositifs détectés, libellés lisibles */
  types: string[];
  /** Phrases exactes de l'annonce qui justifient la détection */
  citations: string[];
  /** true si l'annonce laisse entendre une formation à la charge du candidat */
  payTrainingWarning: boolean;
};

const stripAccents = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe");

export const normalized = (value: string) => stripAccents(String(value || "")).toLowerCase();

const hasAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

// --- Lexiques (normalisés sans accents) ---

const POEI_TERMS = [
  "poei",
  "poec",
  "poe collective",
  "poeic",
  "poei collective",
  "afpr",
  "preparation operationnelle a l'emploi",
  "preparation operationnelle a l emploi",
  "preparations operationnelles a l'emploi",
  "preparation operationnelle collective",
  "action de formation prealable au recrutement",
  "actions de formations prealables au recrutement",
  "formation prealable au recrutement",
  "formations prealables au recrutement",
  "formation de preparation",
  "formations de preparation",
  "formation avant recrutement",
  "formation avant embauche",
];

const POEI_REGEXPS = [
  /\bpreparations?\s+operationnelles?\s+(?:(?:a|pour)\s+l(?:'|’|\s)?)?emploi\b/,
  /\bpreparations?\s+operationnelles?\s+(?:a\s+)?l(?:'|’|\s)?emploi\s+individuelles?\b/,
  /\bactions?\s+de\s+formations?\s+prealables?\s+au\s+recrutement\b/,
  /\bformations?\s+prealables?\s+au\s+recrutement\b/,
  /\bformations?\s+de\s+preparations?\b/,
  /\bpoe[ic]?\b/,
];

const FINANCEMENT_PUBLIC_TERMS = [
  "financement opco",
  "financement par l'opco",
  "financement cpf",
  "abondement cpf",
  "cpf de transition",
  "cpf transition",
  "financement france travail",
  "financement pole emploi",
  "aide france travail",
  "aide pole emploi",
  "transitions pro",
  "projet de transition professionnelle",
];

const FINANCEMENT_EMPLOYEUR_TERMS = [
  "certification financee",
  "certifications financees",
  "certifications prises en charge",
  "certification prise en charge",
  "certification payee",
  "certification offerte",
  "certification financee par l'employeur",
  "formation prise en charge",
  "formation prise en charge par l'employeur",
  "formation financee",
  "formation financee par l'employeur",
  "formation payee par l'employeur",
  "formation gratuite",
  "formation offerte",
  "frais de formation pris en charge",
  "cout de formation pris en charge",
  "prise en charge des frais de formation",
  "prise en charge de la formation",
];

const FORMATION_EMPLOYEUR_TERMS = [
  "formation assuree par nos soins",
  "formation prise en charge par nos soins",
  "formation assuree",
  "formation interne",
  "formation complete",
  "formation remuneree",
  "formation payee",
  "nous vous formons",
  "nous formons",
  "vous serez forme",
  "formation avant prise de poste",
  "formation prealable avant embauche",
  "parcours d'integration",
  "parcours certifiant",
  "parcours qualifiant",
  "montee en competence",
  "ecole interne",
  "contrat de professionnalisation",
  "apprentissage",
  "prepa apprentissage",
  "cfa",
  "titre professionnel",
];

const TUTORAT_TERMS = ["tutorat", "accompagnement terrain", "accompagnement technique", "binome senior", "autonomie progressive"];

const VAGUE_TERMS = [
  "formation possible",
  "formation est possible",
  "formation serait possible",
  "formation envisageable",
  "profil debutant etudie",
  "idealement certifie",
  "accompagnement prevu",
];

const PAY_TRAINING_TERMS = [
  "formation a votre charge",
  "formation a payer",
  "certification a votre charge",
  "pack de demarrage paye",
];

// --- Détection ---

type CategoryKey = "poei" | "financementPublic" | "financementEmployeur" | "formationEmployeur" | "tutorat";

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  poei: "Dispositif POEI / POE / AFPR",
  financementPublic: "Financement OPCO / CPF / France Travail",
  financementEmployeur: "Frais de formation ou certification pris en charge",
  formationEmployeur: "Formation employeur / parcours intégré",
  tutorat: "Tutorat / accompagnement terrain",
};

const detectCategory = (text: string, key: CategoryKey): boolean => {
  switch (key) {
    case "poei":
      return hasAny(text, POEI_TERMS) || POEI_REGEXPS.some((regexp) => regexp.test(text));
    case "financementPublic":
      return hasAny(text, FINANCEMENT_PUBLIC_TERMS);
    case "financementEmployeur":
      return hasAny(text, FINANCEMENT_EMPLOYEUR_TERMS);
    case "formationEmployeur":
      return hasAny(text, FORMATION_EMPLOYEUR_TERMS);
    case "tutorat":
      return hasAny(text, TUTORAT_TERMS);
  }
};

/** Découpe un texte brut d'annonce en phrases exploitables pour les citations. */
export const splitSentences = (rawText: string): string[] =>
  String(rawText || "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 12 && sentence.length <= 400);

const buildCitations = (sentences: string[], normalizedSentences: string[], terms: string[]): string[] => {
  const citations: string[] = [];
  normalizedSentences.forEach((sentence, index) => {
    if (citations.length >= 2) return;
    if (terms.some((term) => sentence.includes(term))) {
      const original = sentences[index];
      if (!citations.includes(original)) citations.push(original);
    }
  });
  return citations;
};

/**
 * Analyse le texte brut d'une annonce et retourne un signal structuré
 * sur la formation financée : niveau, types détectés et citations sources.
 */
export const buildFormationSignals = (rawText: string): FormationSignal => {
  const text = normalized(rawText);
  const categories = (
    ["poei", "financementPublic", "financementEmployeur", "formationEmployeur", "tutorat"] as CategoryKey[]
  ).filter((key) => detectCategory(text, key));

  const vague = hasAny(text, VAGUE_TERMS);
  const payTrainingWarning = hasAny(text, PAY_TRAINING_TERMS);

  const confirmed = categories.length > 0;
  const level: FormationLevel = confirmed ? "confirmée" : vague ? "possible" : "absente";

  let citations: string[] = [];
  if (confirmed || vague || payTrainingWarning) {
    const sentences = splitSentences(rawText);
    const normalizedSentences = sentences.map(normalized);
    const citationTerms: Record<CategoryKey, string[]> = {
      poei: POEI_TERMS,
      financementPublic: FINANCEMENT_PUBLIC_TERMS,
      financementEmployeur: FINANCEMENT_EMPLOYEUR_TERMS,
      formationEmployeur: FORMATION_EMPLOYEUR_TERMS,
      tutorat: TUTORAT_TERMS,
    };
    for (const key of categories) {
      citations = [...citations, ...buildCitations(sentences, normalizedSentences, citationTerms[key])];
      if (citations.length >= 3) break;
    }
    if (!citations.length && vague) citations = buildCitations(sentences, normalizedSentences, VAGUE_TERMS);
    if (!citations.length && payTrainingWarning)
      citations = buildCitations(sentences, normalizedSentences, PAY_TRAINING_TERMS);
  }

  return {
    level,
    types: categories.map((key) => CATEGORY_LABELS[key]),
    citations: citations.slice(0, 3),
    payTrainingWarning,
  };
};

