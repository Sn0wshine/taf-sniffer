import { env, GEMINI_MODEL, GEMINI_RATE_LIMITS } from "../config.mjs";
import { safeLogText, writeDiagnostic } from "../diagnostics.mjs";
import { readRequestJson } from "../http.mjs";
import { compact, hashString, normalized, unique } from "../scrapers/utils.mjs";

export const geminiUsage = new Map();

export function geminiModelChain() {
  const fallbackText = env.GEMINI_FALLBACK_MODELS || env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite,gemini-2.5-flash-lite";
  return unique([GEMINI_MODEL, ...String(fallbackText).split(/[,;\s]+/)]);
}

export function searchPlanModelChain() {
  return unique(["gemini-3.1-flash-lite", "gemini-2.5-flash-lite"]);
}

export function geminiDayKey(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

export function geminiUsageFor(model) {
  const dayKey = geminiDayKey();
  const current = geminiUsage.get(model);
  if (current && current.dayKey === dayKey) return current;
  const fresh = { dayKey, dayCount: 0, minuteCalls: [] };
  geminiUsage.set(model, fresh);
  return fresh;
}

export function geminiLimitFor(model) {
  return GEMINI_RATE_LIMITS[model] || {
    perMinute: Number(env.GEMINI_DEFAULT_RPM || 5),
    perDay: Number(env.GEMINI_DEFAULT_RPD || 20),
  };
}

export function geminiRateLimitError(model, reason, retryAfterSeconds = null) {
  const error = new Error(
    reason === "day"
      ? `Quota quotidien local Gemini atteint pour ${model}. Passage au modèle suivant.`
      : `Limite minute locale Gemini atteinte pour ${model}. Passage au modèle suivant.`,
  );
  error.status = 429;
  error.model = model;
  error.localRateLimit = true;
  error.retryAfterSeconds = retryAfterSeconds;
  return error;
}

export function checkGeminiQuota(model) {
  const limit = geminiLimitFor(model);
  const usage = geminiUsageFor(model);
  const now = Date.now();
  usage.minuteCalls = usage.minuteCalls.filter((timestamp) => now - timestamp < 60_000);

  if (usage.dayCount >= limit.perDay) {
    throw geminiRateLimitError(model, "day");
  }
  if (usage.minuteCalls.length >= limit.perMinute) {
    const oldest = Math.min(...usage.minuteCalls);
    const retryAfterSeconds = Math.max(1, Math.ceil((60_000 - (now - oldest)) / 1000));
    throw geminiRateLimitError(model, "minute", retryAfterSeconds);
  }
}

export function recordGeminiCall(model) {
  const usage = geminiUsageFor(model);
  usage.dayCount += 1;
  usage.minuteCalls.push(Date.now());
}

export function shouldTryNextGeminiModel(error) {
  const status = Number(error?.status || 0);
  const message = String(error?.message || "");
  return (
    status === 429 ||
    status === 404 ||
    status === 503 ||
    /quota|rate|resource_exhausted|not found|not supported|unavailable/i.test(message)
  );
}

export function boundedString(value, fallback = "") {
  return compact(typeof value === "string" ? value : fallback).slice(0, 500);
}

export function boundedList(value, limit = 5) {
  return Array.isArray(value)
    ? value.map((item) => boundedString(item)).filter(Boolean).slice(0, limit)
    : [];
}

export function boundedStringList(value, limit = 8, itemLimit = 120) {
  return Array.isArray(value)
    ? unique(value.map((item) => boundedString(item).slice(0, itemLimit))).slice(0, limit)
    : [];
}

export function clampAiAdjustment(value) {
  const number = Math.round(Number(value || 0));
  if (!Number.isFinite(number)) return 0;
  return Math.max(-12, Math.min(12, number));
}

export function clampAiRankScore(value) {
  const number = Math.round(Number(value || 0));
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

export function normalizeQualityStatus(value) {
  const text = normalized(value);
  if (text === "conflict" || text.includes("incoherent") || text.includes("contradiction")) return "conflict";
  if (text === "verify" || text.includes("verifier") || text.includes("doute")) return "verify";
  return "ok";
}

export function normalizeQualityField(value) {
  const item = value && typeof value === "object" ? value : {};
  return {
    field: boundedString(item.field),
    status: normalizeQualityStatus(item.status),
    currentValue: boundedString(item.currentValue),
    suggestedValue: boundedString(item.suggestedValue),
    reason: boundedString(item.reason),
  };
}

export function normalizeQualityCheck(value) {
  const quality = value && typeof value === "object" ? value : {};
  const fieldChecks = Array.isArray(quality.fieldChecks)
    ? quality.fieldChecks.map(normalizeQualityField).filter((item) => item.field).slice(0, 12)
    : [];
  const suggestedCorrections = Array.isArray(quality.suggestedCorrections)
    ? quality.suggestedCorrections.map(normalizeQualityField).filter((item) => item.field && item.suggestedValue).slice(0, 8)
    : fieldChecks.filter((item) => item.status !== "ok" && item.suggestedValue).slice(0, 8);
  const fallbackStatus = fieldChecks.some((item) => item.status === "conflict")
    ? "conflict"
    : fieldChecks.some((item) => item.status === "verify")
      ? "verify"
      : "ok";
  return {
    status: normalizeQualityStatus(quality.status || fallbackStatus),
    confidence: ["faible", "moyenne", "bonne"].includes(quality.confidence) ? quality.confidence : "faible",
    fieldChecks,
    warnings: boundedList(quality.warnings, 6),
    suggestedCorrections,
  };
}

export function normalizeDecisionVerdict(value) {
  const text = normalized(value);
  if (text.includes("bonne") || text.includes("prioritaire")) return "bonne_piste";
  if (text.includes("risque") || text.includes("piege")) return "risque";
  if (text.includes("hors")) return "hors_cible";
  return "a_creuser";
}

export function normalizeApplicationPrep(value) {
  const prep = value && typeof value === "object" ? value : {};
  return {
    callAngle: boundedString(prep.callAngle),
    message: boundedString(prep.message, "").slice(0, 900),
    checkpoints: boundedList(prep.checkpoints, 5),
  };
}

export function normalizeTop3Comparison(value) {
  const item = value && typeof value === "object" ? value : {};
  return {
    whyFirst: boundedString(item.whyFirst),
    riskierOffer: boundedString(item.riskierOffer),
    callFirst: boundedString(item.callFirst),
    actionSummary: boundedString(item.actionSummary),
  };
}

export function normalizeAiPayload(value) {
  const extraction = value && typeof value.extraction === "object" ? value.extraction : {};
  const salaryKind = ["brut", "net", "non précisé"].includes(extraction.salaryKind) ? extraction.salaryKind : "non précisé";
  const confidence = ["faible", "moyenne", "bonne"].includes(value?.confidence) ? value.confidence : "faible";
  return {
    extraction: {
      title: boundedString(extraction.title),
      company: boundedString(extraction.company),
      location: boundedString(extraction.location),
      contract: boundedString(extraction.contract),
      workTime: boundedString(extraction.workTime),
      salary: boundedString(extraction.salary),
      salaryKind,
      bonus: boundedString(extraction.bonus || "Non mentionnées"),
      bonusEstimate: boundedString(extraction.bonusEstimate),
      requiredExperience: boundedString(extraction.requiredExperience),
      benefits: boundedString(extraction.benefits),
      poeiSignal: Boolean(extraction.poeiSignal),
      auditSignal: Boolean(extraction.auditSignal),
      independentSignal: Boolean(extraction.independentSignal),
    },
    summary: boundedString(value?.summary, "Avis intelligent à vérifier."),
    strengths: boundedList(value?.strengths, 5),
    blockers: boundedList(value?.blockers, 5),
    uncertainties: boundedList(value?.uncertainties, 5),
    questions: boundedList(value?.questions, 5),
    decisionVerdict: normalizeDecisionVerdict(value?.decisionVerdict),
    decisionReasons: boundedList(value?.decisionReasons, 3),
    recruiterQuestions: boundedList(value?.recruiterQuestions, 5),
    applicationPrep: normalizeApplicationPrep(value?.applicationPrep),
    aiRankScore: clampAiRankScore(value?.aiRankScore),
    aiRankReasons: boundedList(value?.aiRankReasons, 4),
    salaryRankScore: clampAiRankScore(value?.salaryRankScore),
    salaryRankReasons: boundedList(value?.salaryRankReasons, 4),
    salaryComparableLabel: boundedString(value?.salaryComparableLabel),
    salaryWarnings: boundedList(value?.salaryWarnings, 5),
    scoreAdjustment: clampAiAdjustment(value?.scoreAdjustment),
    scoreReasons: boundedList(value?.scoreReasons, 4),
    confidence,
    qualityCheck: normalizeQualityCheck(value?.qualityCheck),
  };
}

export const AI_REVIEW_SCHEMA = {
  type: "object",
  properties: {
    extraction: {
      type: "object",
      properties: {
        title: { type: "string" },
        company: { type: "string" },
        location: { type: "string" },
        contract: { type: "string" },
        workTime: { type: "string" },
        salary: { type: "string" },
        salaryKind: { type: "string", enum: ["brut", "net", "non précisé"] },
        bonus: { type: "string" },
        bonusEstimate: { type: "string" },
        requiredExperience: { type: "string" },
        benefits: { type: "string" },
        poeiSignal: { type: "boolean" },
        auditSignal: { type: "boolean" },
        independentSignal: { type: "boolean" },
      },
      required: [
        "title",
        "company",
        "location",
        "contract",
        "workTime",
        "salary",
        "salaryKind",
        "bonus",
        "bonusEstimate",
        "requiredExperience",
        "benefits",
        "poeiSignal",
        "auditSignal",
        "independentSignal",
      ],
    },
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    blockers: { type: "array", items: { type: "string" } },
    uncertainties: { type: "array", items: { type: "string" } },
    questions: { type: "array", items: { type: "string" } },
    decisionVerdict: { type: "string", enum: ["bonne_piste", "a_creuser", "risque", "hors_cible"] },
    decisionReasons: { type: "array", items: { type: "string" } },
    recruiterQuestions: { type: "array", items: { type: "string" } },
    applicationPrep: {
      type: "object",
      properties: {
        callAngle: { type: "string" },
        message: { type: "string" },
        checkpoints: { type: "array", items: { type: "string" } },
      },
      required: ["callAngle", "message", "checkpoints"],
    },
    aiRankScore: { type: "integer", minimum: 0, maximum: 100 },
    aiRankReasons: { type: "array", items: { type: "string" } },
    salaryRankScore: { type: "integer", minimum: 0, maximum: 100 },
    salaryRankReasons: { type: "array", items: { type: "string" } },
    salaryComparableLabel: { type: "string" },
    salaryWarnings: { type: "array", items: { type: "string" } },
    scoreAdjustment: { type: "integer", minimum: -12, maximum: 12 },
    scoreReasons: { type: "array", items: { type: "string" } },
    confidence: { type: "string", enum: ["faible", "moyenne", "bonne"] },
    customAxesScores: { type: "object" },
    qualityCheck: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["ok", "verify", "conflict"] },
        confidence: { type: "string", enum: ["faible", "moyenne", "bonne"] },
        fieldChecks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string" },
              status: { type: "string", enum: ["ok", "verify", "conflict"] },
              currentValue: { type: "string" },
              suggestedValue: { type: "string" },
              reason: { type: "string" },
            },
            required: ["field", "status", "currentValue", "suggestedValue", "reason"],
          },
        },
        warnings: { type: "array", items: { type: "string" } },
        suggestedCorrections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string" },
              status: { type: "string", enum: ["ok", "verify", "conflict"] },
              currentValue: { type: "string" },
              suggestedValue: { type: "string" },
              reason: { type: "string" },
            },
            required: ["field", "status", "currentValue", "suggestedValue", "reason"],
          },
        },
      },
      required: ["status", "confidence", "fieldChecks", "warnings", "suggestedCorrections"],
    },
  },
  required: [
    "extraction",
    "summary",
    "strengths",
    "blockers",
    "uncertainties",
    "questions",
    "decisionVerdict",
    "decisionReasons",
    "recruiterQuestions",
    "applicationPrep",
    "aiRankScore",
    "aiRankReasons",
    "salaryRankScore",
    "salaryRankReasons",
    "salaryComparableLabel",
    "salaryWarnings",
    "scoreAdjustment",
    "scoreReasons",
    "confidence",
    "qualityCheck",
  ],
};

export const AI_BATCH_REVIEW_SCHEMA = {
  type: "object",
  properties: {
    reviews: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          ...AI_REVIEW_SCHEMA.properties,
        },
        required: ["id", ...AI_REVIEW_SCHEMA.required],
      },
    },
    top3Comparison: {
      type: "object",
      properties: {
        whyFirst: { type: "string" },
        riskierOffer: { type: "string" },
        callFirst: { type: "string" },
        actionSummary: { type: "string" },
      },
      required: ["whyFirst", "riskierOffer", "callFirst", "actionSummary"],
    },
  },
  required: ["reviews", "top3Comparison"],
};

export const AI_SEARCH_PLAN_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    queries: { type: "array", items: { type: "string" } },
    reasons: { type: "array", items: { type: "string" } },
    radarAxes: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "queries", "reasons", "radarAxes"],
};

export function aiBatchPromptFor(jobs, strategy, preferenceMemory) {
  const strategyText = [
    `Métier cible : ${boundedString(strategy?.targetJob || "diagnostiqueur immobilier")}`,
    `Zone : ${boundedString(strategy?.location || "Toute la France")}`,
    `Salaire net mini : ${boundedString(String(strategy?.salaryMin || ""))}`,
    `Expérience : ${boundedString(strategy?.experienceLevel || "")}`,
    `Contrat souhaité : ${boundedString(strategy?.contractPreference || "")}`,
    `Objectif : ${boundedString(strategy?.objective || "")}`,
    `Intention assistant : ${boundedString(strategy?.assistantIntent || "")}`,
    `Resume assistant : ${boundedString(strategy?.assistantSummary || "")}`,
    `Formation facilitee / prise en charge formation : ${boundedString(strategy?.poeiRequirement || "")}`,
    `Audit : ${boundedString(strategy?.auditRequirement || "")}`,
    `Indépendant : ${boundedString(strategy?.independentRequirement || "")}`,
  ].join("\n");
  const offers = jobs.map((job) => ({
    id: boundedString(job.id),
    source: boundedString(job.source),
    sourceUrl: boundedString(job.sourceUrl),
    topContext: job.topContext || null,
    localAnalysis: job.localAnalysis || null,
    rawText: String(job.rawText || "").slice(0, 6500),
  }));

  return `Tu analyses plusieurs annonces d'emploi pour Taf Sniffer, une application de reconversion vers le diagnostic immobilier et l'audit énergétique.
Retourne uniquement un JSON conforme au schéma demandé.
Retourne exactement un objet reviews par annonce, avec le même id que l'entrée.
Retourne aussi top3Comparison pour comparer les annonces du lot.
N'invente pas les informations absentes : utilise une chaîne vide ou "Non détecté".
aiRankScore doit etre un score de classement de 0 a 100 pour ordonner chaque offre selon la strategie utilisateur et departager le lot.
aiRankReasons doit donner 2 a 4 raisons concretes qui justifient ce classement.
salaryRankScore doit etre un score salaire de 0 a 100 a parametres egaux : brut/net, annuel/mensuel, 35h/39h, fixe/variable, primes, avantages, statut salarie/independant, frais et formation.
Compare d'abord le fixe sans primes. Mentionne ensuite le package avec primes et le taux horaire seulement si localAnalysis les fournit ou si l'annonce les rend estimables.
salaryComparableLabel doit resumer le fixe comparable estime, puis le package separement si pertinent, par exemple "fixe 1900-2100 EUR net/mois, package a verifier".
salaryRankReasons explique les points qui rendent ce salaire bon ou faible.
salaryWarnings liste les incertitudes qui empechent une comparaison parfaite.
Le scoreAdjustment doit rester entre -12 et +12 et représenter seulement ce que les règles locales pourraient mal lire.
Ne remplace pas les règles obligatoires : formation facilitee obligatoire, audit obligatoire ou refus indépendant restent décidés par Taf Sniffer.
Ajoute une couche décisionnelle courte pour chaque annonce : decisionVerdict, 3 decisionReasons maximum, 4 ou 5 recruiterQuestions concrètes, et applicationPrep exploitable.
Les questions recruteur doivent viser cette annonce : formation prise en charge, salaire fixe/variable, POEI/POEC/POEIC/AFPR si pertinent, rythme terrain, véhicule, certifications si ces sujets apparaissent ou manquent.

Stratégie utilisateur :
${strategyText}

Mémoire locale des préférences utilisateur :
${JSON.stringify(preferenceMemory || null, null, 2)}

Comparaison Top 3 attendue :
- whyFirst : pourquoi l'offre #1 du lot passe devant.
- riskierOffer : quelle offre est la plus risquée et pourquoi.
- callFirst : laquelle appeler en premier et avec quel angle.
- actionSummary : décision courte et actionnable.

Controle qualite obligatoire :
- La section extraction de chaque review doit etre une fiche propre reecrite depuis le texte brut et localAnalysis. Ne recopie pas les erreurs locales si le texte brut les contredit.
- Si localAnalysis est douteuse mais le texte brut donne une valeur exploitable, renseigne la valeur propre dans extraction et marque le champ verify.
- Si le texte brut contredit clairement localAnalysis, suis le texte brut dans extraction et marque le champ conflict avec une correction proposee.
- Ne mets pas "Non detecte" si le texte brut contient une information exploitable, meme placee dans un bloc lateral ou en fin d'annonce.
- Ajoute qualityCheck pour chaque annonce en comparant texte brut, localAnalysis et ton extraction.
- Utilise uniquement les statuts ok, verify, conflict.
- Controle surtout entreprise, lieu, contrat, temps de travail, salaire, brut/net, primes, formation facilitee/POEI/POEC/POEIC/AFPR, audit, independant.
- Ne corrige rien automatiquement : propose seulement suggestedValue et reason.

Annonces :
${JSON.stringify(offers, null, 2)}`;
}

export function parseGeminiJson(payload) {
  const text = (payload?.candidates?.[0]?.content?.parts || [])
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
  const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  if (!clean) throw new Error("Réponse Gemini vide.");
  return JSON.parse(clean);
}

export function retryDelayFromGemini(message) {
  const match = String(message || "").match(/retry\s+in\s+([\d.]+)s/i);
  return match ? Math.ceil(Number(match[1])) : null;
}

export async function callGeminiForJobsWithModel(jobs, strategy, strategyHash, model, preferenceMemory) {
  checkGeminiQuota(model);
  const startedAt = Date.now();
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: aiBatchPromptFor(jobs, strategy, preferenceMemory) }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseJsonSchema: AI_BATCH_REVIEW_SCHEMA,
      },
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `Gemini indisponible (${response.status}).`;
    writeDiagnostic("ai", {
      action: "analyze-jobs",
      model,
      status: "error",
      httpStatus: response.status,
      durationMs: Date.now() - startedAt,
      jobCount: jobs.length,
      message: safeLogText(message),
    });
    const error = new Error(message);
    error.status = response.status;
    error.retryAfterSeconds = retryDelayFromGemini(message);
    throw error;
  }
  recordGeminiCall(model);

  const parsed = parseGeminiJson(payload);
  const rawReviews = Array.isArray(parsed?.reviews) ? parsed.reviews : [];
  const byId = new Map(jobs.map((job) => [job.id, job]));
  const returned = new Set();
  const reviews = rawReviews
    .filter((review) => review && typeof review.id === "string" && byId.has(review.id))
    .map((review) => {
      const job = byId.get(review.id);
      returned.add(review.id);
      return {
        id: review.id,
        status: "done",
        provider: "Gemini",
        model,
        checkedAt: new Date().toISOString(),
        rawTextHash: boundedString(job.rawTextHash) || hashString(String(job.rawText || "")),
        strategyHash,
        ...normalizeAiPayload(review),
      };
    });

  for (const job of jobs) {
    if (!returned.has(job.id)) {
      reviews.push({
        id: job.id,
        status: "error",
        provider: "Gemini",
        model,
        checkedAt: new Date().toISOString(),
        rawTextHash: boundedString(job.rawTextHash) || hashString(String(job.rawText || "")),
        strategyHash,
        errorMessage: "Gemini n'a pas retourné d'avis pour cette offre.",
      });
    }
  }

  writeDiagnostic("ai", {
    action: "analyze-jobs",
    model,
    status: "ok",
    durationMs: Date.now() - startedAt,
    jobCount: jobs.length,
    reviewCount: reviews.length,
    doneCount: reviews.filter((review) => review.status === "done").length,
  });

  return {
    reviews,
    top3Comparison: normalizeTop3Comparison(parsed?.top3Comparison),
  };
}

export async function callGeminiForJobs(jobs, strategy, strategyHash, preferenceMemory) {
  const models = geminiModelChain();
  let lastError = null;

  for (const model of models) {
    try {
      const result = await callGeminiForJobsWithModel(jobs, strategy, strategyHash, model, preferenceMemory);
      return { ...result, model };
    } catch (error) {
      lastError = error;
      error.model = model;
      writeDiagnostic("ai", {
        action: "analyze-jobs-fallback",
        model,
        status: "fallback",
        jobCount: jobs.length,
        httpStatus: error?.status || null,
        retryAfterSeconds: error?.retryAfterSeconds || null,
        willTryNext: shouldTryNextGeminiModel(error),
        message: safeLogText(error?.message || error),
      });
      if (!shouldTryNextGeminiModel(error)) break;
    }
  }

  throw lastError || new Error("Gemini indisponible.");
}

export function aiSearchPlanPromptFor(strategy) {
  const constraints = [
    strategy?.poeiRequirement === "required" ? "formation facilitee ou prise en charge formation obligatoire" : "",
    strategy?.auditRequirement === "required" ? "audit energetique obligatoire" : "",
    strategy?.independentRequirement === "required" ? "refuser statut independant impose" : "",
  ].filter(Boolean).join(", ") || "aucune contrainte stricte";

  return `Tu aides Taf Sniffer a transformer une intention metier en requetes de recherche d'emploi.
Retourne uniquement un JSON conforme au schema.
Genere 5 a 8 requetes courtes, concretes, utiles sur des sites d'emploi francais.
Ne fais pas une liste de synonymes brute : combine metier, niveau, reconversion et signaux utiles.
Evite les requetes trop longues. Ne mets pas la zone dans les requetes.
Garde les garde-fous utilisateur, mais ne rends pas les requetes impossibles.

Metier/preset : ${boundedString(strategy?.targetJob || "diagnostiqueur immobilier")}
Intention libre : ${boundedString(strategy?.assistantIntent || "")}
Resume assistant : ${boundedString(strategy?.assistantSummary || "")}
Objectif : ${boundedString(strategy?.objective || "")}
Experience : ${boundedString(strategy?.experienceLevel || "")}
Contrat : ${boundedString(strategy?.contractPreference || "")}
Salaire net mini : ${boundedString(String(strategy?.salaryMin || ""))}
Contraintes : ${constraints}

Le champ summary doit etre une synthese courte en francais, modifiable par l'utilisateur.
Le champ reasons liste 2 a 4 raisons expliquant les choix de requetes.
Le champ radarAxes doit proposer entre 3 et 6 axes de score personnalises (ex: "Formation", "Salaire", "Voiture de fonction", "Equilibre vie pro", etc.) adaptes aux envies et contraintes de l'utilisateur. Garde "Formation", "Salaire", "Trajectoire", "Employeur", "Risque" comme repli si rien de specifique ne ressort.`;
}

export function normalizeSearchPlanPayload(value) {
  const queries = boundedStringList(value?.queries, 8, 90)
    .map((query) => query.replace(/[.;]+$/g, "").trim())
    .filter((query) => query.length >= 3);
  return {
    summary: boundedString(value?.summary, ""),
    queries,
    reasons: boundedStringList(value?.reasons, 4, 160),
    radarAxes: boundedStringList(value?.radarAxes, 6, 40).filter((axis) => axis.length >= 2),
  };
}

export async function callGeminiForSearchPlanWithModel(strategy, model) {
  checkGeminiQuota(model);
  const startedAt = Date.now();
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: aiSearchPlanPromptFor(strategy) }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseJsonSchema: AI_SEARCH_PLAN_SCHEMA,
      },
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `Gemini indisponible (${response.status}).`;
    writeDiagnostic("ai", {
      action: "search-plan",
      model,
      status: "error",
      httpStatus: response.status,
      durationMs: Date.now() - startedAt,
      message: safeLogText(message),
    });
    const error = new Error(message);
    error.status = response.status;
    error.retryAfterSeconds = retryDelayFromGemini(message);
    throw error;
  }
  recordGeminiCall(model);
  const plan = normalizeSearchPlanPayload(parseGeminiJson(payload));
  writeDiagnostic("ai", {
    action: "search-plan",
    model,
    status: "ok",
    durationMs: Date.now() - startedAt,
    queryCount: plan.queries.length,
  });
  return plan;
}

export async function callGeminiForSearchPlan(strategy) {
  let lastError = null;
  for (const model of searchPlanModelChain()) {
    try {
      const plan = await callGeminiForSearchPlanWithModel(strategy, model);
      return { ...plan, model };
    } catch (error) {
      lastError = error;
      error.model = model;
      writeDiagnostic("ai", {
        action: "search-plan-fallback",
        model,
        status: "fallback",
        httpStatus: error?.status || null,
        retryAfterSeconds: error?.retryAfterSeconds || null,
        willTryNext: shouldTryNextGeminiModel(error),
        message: safeLogText(error?.message || error),
      });
      if (!shouldTryNextGeminiModel(error)) break;
    }
  }
  throw lastError || new Error("Plan de recherche Gemini indisponible.");
}

export async function buildAiSearchPlan(req) {
  const payload = await readRequestJson(req, 120_000);
  const strategy = payload.strategy && typeof payload.strategy === "object" ? payload.strategy : {};
  const model = searchPlanModelChain()[0];

  if (!env.GEMINI_API_KEY) {
    writeDiagnostic("ai", {
      action: "search-plan",
      model,
      status: "skipped",
      reason: "missing_gemini_api_key",
    });
    return {
      configured: false,
      provider: "Gemini",
      model,
      summary: "",
      queries: [],
      reasons: [],
      message: "Plan de recherche IA non configure. Recherche locale utilisee.",
    };
  }

  try {
    const plan = await callGeminiForSearchPlan(strategy);
    return {
      configured: true,
      provider: "Gemini",
      model: plan.model,
      summary: plan.summary,
      queries: plan.queries,
      reasons: plan.reasons,
      radarAxes: plan.radarAxes,
      message: plan.queries.length
        ? `Plan de recherche IA pret avec ${plan.queries.length} requetes.`
        : "Plan IA sans requete exploitable. Recherche locale utilisee.",
    };
  } catch (error) {
    const retry = error?.retryAfterSeconds ? ` Reessaie dans environ ${error.retryAfterSeconds}s.` : "";
    const isRateLimit = Number(error?.status) === 429 || /quota|rate|limite/i.test(String(error?.message || ""));
    return {
      configured: true,
      provider: "Gemini",
      model: error?.model || model,
      summary: "",
      queries: [],
      reasons: [],
      message: isRateLimit
        ? `Quota Gemini atteint pour le plan de recherche.${retry} Recherche locale utilisee.`
        : boundedString(error?.message || "Plan de recherche IA indisponible. Recherche locale utilisee."),
    };
  }
}

export async function analyzeJobsWithGemini(req) {
  const payload = await readRequestJson(req);
  const jobs = Array.isArray(payload.jobs) ? payload.jobs.slice(0, 25) : [];
  const strategy = payload.strategy && typeof payload.strategy === "object" ? payload.strategy : {};
  const preferenceMemory = payload.preferenceMemory && typeof payload.preferenceMemory === "object" ? payload.preferenceMemory : null;
  const strategyHash = boundedString(payload.strategyHash) || hashString(JSON.stringify(strategy));
  const model = geminiModelChain()[0] || GEMINI_MODEL;

  if (!env.GEMINI_API_KEY) {
    writeDiagnostic("ai", {
      action: "analyze-jobs",
      model,
      status: "skipped",
      reason: "missing_gemini_api_key",
      jobCount: jobs.length,
    });
    return {
      configured: false,
      provider: "Gemini",
      model,
      message: "Analyse intelligente non configurée. Ajoute GEMINI_API_KEY dans .env.",
      reviews: jobs.map((job) => ({
        id: job.id,
        status: "skipped",
        provider: "Gemini",
        model,
        checkedAt: new Date().toISOString(),
        rawTextHash: boundedString(job.rawTextHash) || hashString(String(job.rawText || "")),
        strategyHash,
        errorMessage: "Analyse intelligente non configurée.",
      })),
    };
  }

  const invalidReviews = [];
  const validJobs = [];
  for (const job of jobs) {
    if (!job || typeof job.id !== "string" || typeof job.rawText !== "string") {
      invalidReviews.push({
        id: boundedString(job?.id || hashString(JSON.stringify(job || {}))),
        status: "skipped",
        provider: "Gemini",
        model,
        checkedAt: new Date().toISOString(),
        rawTextHash: "",
        strategyHash,
        errorMessage: "Annonce invalide pour l'analyse intelligente.",
      });
    } else {
      validJobs.push(job);
    }
  }

  let reviews = invalidReviews;
  let top3Comparison = null;
  let usedModel = model;
  if (validJobs.length) {
    try {
      const result = await callGeminiForJobs(validJobs, strategy, strategyHash, preferenceMemory);
      reviews = reviews.concat(result.reviews);
      top3Comparison = result.top3Comparison;
      usedModel = result.model || result.reviews.find((review) => review.status === "done")?.model || model;
    } catch (error) {
      const retry = error?.retryAfterSeconds ? ` Réessaie dans environ ${error.retryAfterSeconds}s.` : "";
      const isRateLimit = Number(error?.status) === 429 || /quota|rate/i.test(String(error?.message || ""));
      const message = isRateLimit
        ? `Quota Gemini temporairement atteint.${retry}`
        : boundedString(error?.message || "Analyse intelligente indisponible.");
      reviews = reviews.concat(validJobs.map((job) => ({
        id: job.id,
        status: "error",
        provider: "Gemini",
        model: error?.model || model,
        checkedAt: new Date().toISOString(),
        rawTextHash: boundedString(job.rawTextHash) || hashString(String(job.rawText || "")),
        strategyHash,
        errorMessage: message,
      })));
    }
  }

  return {
    configured: true,
    provider: "Gemini",
    model: usedModel,
    message: reviews.some((review) => review.status === "done")
      ? "Analyse intelligente terminée."
      : (reviews[0]?.errorMessage || "Analyse intelligente indisponible pour cette recherche."),
    reviews,
    top3Comparison,
  };
}
