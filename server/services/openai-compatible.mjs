import { readRequestJson } from "../http.mjs";
import { aiBatchPromptFor, aiSearchPlanPromptFor, boundedString, normalizeAiPayload, normalizeSearchPlanPayload, normalizeTop3Comparison } from "./gemini.mjs";
import { hashString } from "../scrapers/utils.mjs";

const cleanBaseUrl = (value) => String(value || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
const parseContent = (payload) => {
  const content = payload?.choices?.[0]?.message?.content;
  const text = Array.isArray(content) ? content.map((part) => part?.text || "").join("") : String(content || "");
  const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  if (!clean) throw new Error("Réponse du fournisseur IA vide.");
  return JSON.parse(clean);
};

const call = async ({ apiKey, baseUrl, model, prompt }) => {
  const response = await fetch(`${cleanBaseUrl(baseUrl)}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: model || "gpt-4o-mini", temperature: 0.1, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Fournisseur IA indisponible (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return parseContent(payload);
};

const requestConfig = (req) => ({
  apiKey: (req.headers["x-ai-api-key"] || "").toString().trim().slice(0, 300),
  baseUrl: req.headers["x-ai-base-url"] || "https://api.openai.com/v1",
  model: req.headers["x-ai-model"] || "gpt-4o-mini",
});

export async function buildCompatibleAiSearchPlan(req) {
  const payload = await readRequestJson(req, 120_000);
  const config = requestConfig(req);
  if (!config.apiKey) return { configured: false, provider: "OpenAI-compatible", queries: [], reasons: [], radarAxes: [], summary: "", message: "Aucune clé API configurée. Recherche locale utilisée." };
  const result = normalizeSearchPlanPayload(await call({ ...config, prompt: aiSearchPlanPromptFor(payload.strategy || {}) }));
  return { configured: true, provider: "OpenAI-compatible", model: config.model, ...result, message: "Plan IA généré par le fournisseur configuré." };
}

export async function analyzeJobsWithCompatible(req) {
  const payload = await readRequestJson(req);
  const jobs = Array.isArray(payload.jobs) ? payload.jobs.slice(0, 25) : [];
  const config = requestConfig(req);
  if (!config.apiKey) return { configured: false, provider: "OpenAI-compatible", reviews: jobs.map((job) => ({ id: job.id, status: "skipped", provider: "OpenAI-compatible", errorMessage: "Aucune clé API configurée." })) };
  const parsed = await call({ ...config, prompt: aiBatchPromptFor(jobs, payload.strategy || {}, null) });
  const reviews = (Array.isArray(parsed.reviews) ? parsed.reviews : []).map((review) => ({
    ...normalizeAiPayload(review), id: review.id, status: "done", provider: "OpenAI-compatible", model: config.model,
    checkedAt: new Date().toISOString(), rawTextHash: hashString(String(jobs.find((job) => job.id === review.id)?.rawText || "")),
    strategyHash: boundedString(payload.strategyHash),
  }));
  return { configured: true, provider: "OpenAI-compatible", model: config.model, reviews, top3Comparison: normalizeTop3Comparison(parsed.top3Comparison) };
}
