import type { AIReview, JobRecord, Strategy } from "./types";
import { fetchWithTimeout } from "./fetchWithTimeout";

const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-3.5-flash",
  "gemini-2.5-pro",
];

type LocalGeminiJobPayload = {
  id: string;
  rawText: string;
  source?: string;
  sourceUrl?: string;
  manualExtraction?: JobRecord["manualExtraction"] | null;
  localAnalysis?: Record<string, unknown>;
  topContext?: Record<string, unknown>;
  rawTextHash?: string;
};

export type LocalGeminiAnalyzeInput = {
  jobs: LocalGeminiJobPayload[];
  strategy: Strategy;
  strategyHash: string;
  preferenceMemory: Record<string, unknown> | null;
  apiKey: string;
};

const cleanJsonText = (value: string) =>
  value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const parseGeminiJson = (payload: unknown) => {
  const candidate = payload && typeof payload === "object" && "candidates" in payload
    ? (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates?.[0]
    : undefined;
  const text = (candidate?.content?.parts || [])
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
  if (!text) throw new Error("Réponse Gemini vide.");
  return JSON.parse(cleanJsonText(text));
};

const boundedList = (value: unknown, limit: number) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, limit)
    : [];

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

const callGemini = async (apiKey: string, model: string, prompt: string) => {
  const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.15,
        responseMimeType: "application/json",
      },
    }),
  }, 20000);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = asObject(asObject(payload).error).message;
    throw new Error(typeof message === "string" ? message : `Gemini indisponible (${response.status}).`);
  }
  return parseGeminiJson(payload);
};

const withGeminiFallback = async <T,>(apiKey: string, prompt: string, normalize: (payload: unknown, model: string) => T): Promise<T> => {
  let lastError: Error | null = null;
  for (const model of GEMINI_MODELS) {
    try {
      return normalize(await callGemini(apiKey, model, prompt), model);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Gemini indisponible.");
    }
  }
  throw lastError || new Error("Gemini indisponible.");
};

const searchPlanPrompt = (strategy: Strategy) => `Tu aides Taf Sniffer à préparer une recherche d'emploi.
Réponds uniquement en JSON valide, sans markdown.

Objectif utilisateur :
${JSON.stringify({
  targetJob: strategy.targetJob,
  location: strategy.location,
  experienceLevel: strategy.experienceLevel,
  contractPreference: strategy.contractPreference,
  assistantIntent: strategy.assistantIntent,
  assistantSummary: strategy.assistantSummary,
  objective: strategy.objective,
  poeiRequirement: strategy.poeiRequirement,
  auditRequirement: strategy.auditRequirement,
  independentRequirement: strategy.independentRequirement,
}, null, 2)}

Format attendu :
{
  "summary": "résumé court de la recherche",
  "queries": ["8 requêtes maximum, utiles sur des job boards français"],
  "reasons": ["4 raisons maximum expliquant les variantes"],
  "radarAxes": ["Proposer 3 à 6 axes de score personnalisés (ex: 'Formation', 'Salaire', 'Voiture de fonction', 'Equilibre vie pro')"]
}

Contraintes :
- Français.
- Requêtes courtes et réalistes.
- Inclure synonymes métier, niveau reconversion/junior et formation si pertinent.
- Ne pas inventer de ville si la zone est vide.`;

export const buildLocalGeminiSearchPlan = async (strategy: Strategy, apiKey: string) =>
  withGeminiFallback(apiKey, searchPlanPrompt(strategy), (payload, model) => {
    const raw = asObject(payload);
    return {
      configured: true,
      provider: "Gemini",
      model,
      summary: typeof raw.summary === "string" ? raw.summary : "",
      queries: boundedList(raw.queries, 8),
      reasons: boundedList(raw.reasons, 4),
      radarAxes: boundedList(raw.radarAxes, 6).filter((axis) => axis.length >= 2),
      message: "Plan IA généré avec la clé API locale.",
    };
  });

const reviewPrompt = (input: Omit<LocalGeminiAnalyzeInput, "apiKey">) => {
  const radarAxes = input.strategy.radarAxes || ["Adéquation", "Salaire", "Contrat", "Évolution", "Risque"];
  return `Tu analyses des offres d'emploi pour Taf Sniffer.
Réponds uniquement en JSON valide, sans markdown.

Stratégie utilisateur :
${JSON.stringify({ ...input.strategy, radarAxes }, null, 2)}

Préférences déduites :
${JSON.stringify(input.preferenceMemory || {}, null, 2)}

Annonces :
${JSON.stringify(input.jobs, null, 2)}

Format attendu :
{
  "reviews": [
    {
      "id": "id de l'annonce",
      "summary": "avis court",
      "strengths": ["max 5"],
      "blockers": ["max 5"],
      "uncertainties": ["max 5"],
      "questions": ["max 5"],
      "decisionVerdict": "bonne_piste | a_creuser | risque | hors_cible",
      "decisionReasons": ["max 3"],
      "recruiterQuestions": ["max 5"],
      "aiRankScore": 0,
      "aiRankReasons": ["max 4"],
      "salaryRankScore": 0,
      "salaryRankReasons": ["max 4"],
      "salaryComparableLabel": "salaire comparable si possible",
      "salaryWarnings": ["max 5"],
      "confidence": "faible | moyenne | bonne",
      "customAxesScores": {
        ${radarAxes.map((axis) => `"${axis}": 0`).join(",\n        ")}
      }
    }
  ]
}

Règles :
- Utilise les localAnalysis fournies, mais corrige ton jugement avec le texte brut si nécessaire.
- Favorise l'adéquation au métier, la stabilité, le salaire lisible, la qualité de l'annonce et le faible risque. Considère formation, reconversion et évolution seulement si elles sont pertinentes dans la stratégie.
- Pénalise indépendant imposé, salaire flou, variable dominant, formation à payer ou incompatibilité avec les critères.
- Pour chacun des axes personnalisés de radarAxes spécifiés (${radarAxes.join(", ")}), attribue un score de 0 à 100 dans l'objet customAxesScores.
- aiRankScore et salaryRankScore doivent être entre 0 et 100.`;
};

export const analyzeJobsWithLocalGemini = async (input: LocalGeminiAnalyzeInput) =>
  withGeminiFallback(input.apiKey, reviewPrompt(input), (payload, model) => {
    const raw = asObject(payload);
    const reviews = Array.isArray(raw.reviews) ? raw.reviews : [];
    return {
      configured: true,
      provider: "Gemini",
      model,
      message: "Analyse IA générée avec la clé API locale.",
      reviews: reviews.map((review): AIReview & { id?: string } => {
        const item = asObject(review);
        const id = typeof item.id === "string" ? item.id : "";
        const sourceJob = input.jobs.find((job) => job.id === id);
        return {
          ...item,
          id,
          status: "done",
          provider: "Gemini",
          model,
          checkedAt: new Date().toISOString(),
          rawTextHash: sourceJob?.rawTextHash || "",
          strategyHash: input.strategyHash,
        } as AIReview & { id?: string };
      }),
    };
  });
