import { describe, expect, it } from "vitest";
import {
  apiKeyFromRequest,
  checkGeminiQuota,
  geminiLimitFor,
  geminiModelChain,
  geminiUsageFor,
  recordGeminiCall,
} from "../services/gemini.mjs";

// Modèles fictifs : chaque test utilise le sien pour éviter toute pollution d'état.
const MODEL_DAY = "test-model-day";
const MODEL_MINUTE = "test-model-minute";
const MODEL_OK = "test-model-ok";

describe("checkGeminiQuota", () => {
  it("applique des limites par défaut aux modèles inconnus", () => {
    const limit = geminiLimitFor("modele-inconnu");
    expect(limit.perMinute).toBeGreaterThan(0);
    expect(limit.perDay).toBeGreaterThan(0);
  });

  it("lève une erreur 429 locale quand le quota quotidien est atteint", () => {
    const limit = geminiLimitFor(MODEL_DAY);
    geminiUsageFor(MODEL_DAY).dayCount = limit.perDay;
    try {
      expect(() => checkGeminiQuota(MODEL_DAY)).toThrowError(/quotidien/i);
      try {
        checkGeminiQuota(MODEL_DAY);
        expect.unreachable("devait lever");
      } catch (error) {
        expect(error.status).toBe(429);
        expect(error.localRateLimit).toBe(true);
        expect(error.retryAfterSeconds).toBeNull();
      }
    } finally {
      geminiUsageFor(MODEL_DAY).dayCount = 0;
    }
  });

  it("lève une erreur 429 avec délai quand la limite minute est atteinte", () => {
    const limit = geminiLimitFor(MODEL_MINUTE);
    const usage = geminiUsageFor(MODEL_MINUTE);
    usage.minuteCalls = Array.from({ length: limit.perMinute }, () => Date.now());
    try {
      expect(() => checkGeminiQuota(MODEL_MINUTE)).toThrowError(/minute/i);
      try {
        checkGeminiQuota(MODEL_MINUTE);
        expect.unreachable("devait lever");
      } catch (error) {
        expect(error.status).toBe(429);
        expect(error.localRateLimit).toBe(true);
        expect(error.retryAfterSeconds).toBeGreaterThanOrEqual(1);
      }
    } finally {
      usage.minuteCalls = [];
    }
  });

  it("laisse passer un appel sous les quotas et enregistre l'appel", () => {
    const before = geminiUsageFor(MODEL_OK).dayCount;
    expect(() => checkGeminiQuota(MODEL_OK)).not.toThrow();
    recordGeminiCall(MODEL_OK);
    const usage = geminiUsageFor(MODEL_OK);
    expect(usage.dayCount).toBe(before + 1);
    expect(usage.minuteCalls.length).toBe(1);
  });
});

describe("apiKeyFromRequest", () => {
  it("lit et nettoie l'en-tête x-gemini-api-key", () => {
    expect(apiKeyFromRequest({ headers: { "x-gemini-api-key": "  abc-123  " } })).toBe("abc-123");
  });

  it("prend la première valeur si l'en-tête est dupliqué", () => {
    expect(apiKeyFromRequest({ headers: { "x-gemini-api-key": ["premiere", "deuxieme"] } })).toBe("premiere");
  });

  it("retourne une chaîne vide sans en-tête ou avec un type invalide", () => {
    expect(apiKeyFromRequest({})).toBe("");
    expect(apiKeyFromRequest({ headers: { "x-gemini-api-key": 42 } })).toBe("");
    expect(apiKeyFromRequest(undefined)).toBe("");
  });
});

describe("geminiModelChain", () => {
  it("retourne une chaîne de modèles unique et non vide", () => {
    const chain = geminiModelChain();
    expect(chain.length).toBeGreaterThan(0);
    expect(new Set(chain).size).toBe(chain.length);
  });
});
