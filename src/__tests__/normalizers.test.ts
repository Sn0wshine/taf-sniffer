import { describe, expect, it } from "vitest";
import {
  companyAutoKey,
  normalizeAiQualityField,
  normalizeAiQualityStatus,
  normalizeCompanyProfile,
  normalizeEmployerRating,
  normalizeStrategy,
} from "../utils/normalizers";

describe("normalizers utility", () => {
  describe("companyAutoKey", () => {
    it("normalizes company names by removing corporate suffixes and special chars", () => {
      expect(companyAutoKey("AC Environnement SAS")).toBe("ac environnement");
      expect(companyAutoKey("Groupe Diag Immo")).toBe("diag immo");
      expect(companyAutoKey("BC2E - Diagnostic & Audit")).toBe("bc2e diagnostic audit");
    });
  });

  describe("normalizeEmployerRating", () => {
    it("clamps rating score between 0 and 5", () => {
      const valid = normalizeEmployerRating({ score: 4.2, label: "4.2/5", confidence: "bonne" });
      expect(valid?.score).toBe(4.2);
      expect(valid?.confidence).toBe("bonne");

      const outOfBounds = normalizeEmployerRating({ score: 8.5 });
      expect(outOfBounds?.score).toBe(5);

      const negative = normalizeEmployerRating({ score: -2 });
      expect(negative?.score).toBe(0);
    });

    it("handles invalid or empty rating objects", () => {
      expect(normalizeEmployerRating(null)).toBeUndefined();
      expect(normalizeEmployerRating("not an object")).toBeUndefined();
    });
  });

  describe("normalizeCompanyProfile", () => {
    it("returns clean company profile with fallback values", () => {
      const profile = normalizeCompanyProfile({
        companyName: "Diag Tech",
        estimatedType: "cabinet / PME métier",
        status: "found",
        website: "https://diag-tech.fr",
      });
      expect(profile?.companyName).toBe("Diag Tech");
      expect(profile?.estimatedType).toBe("cabinet / PME métier");
      expect(profile?.website).toBe("https://diag-tech.fr");
      expect(profile?.status).toBe("found");
    });
  });

  describe("normalizeAiQualityStatus", () => {
    it("correctly identifies status types with or without accents", () => {
      expect(normalizeAiQualityStatus("conflict")).toBe("conflict");
      expect(normalizeAiQualityStatus("incoherent")).toBe("conflict");
      expect(normalizeAiQualityStatus("verify")).toBe("verify");
      expect(normalizeAiQualityStatus("à vérifier")).toBe("verify");
      expect(normalizeAiQualityStatus("ok")).toBe("ok");
      expect(normalizeAiQualityStatus("anything else")).toBe("ok");
    });
  });

  describe("normalizeAiQualityField", () => {
    it("extracts and normalizes field check payload", () => {
      const res = normalizeAiQualityField({
        field: "salary",
        status: "verify",
        currentValue: "2000 €",
        suggestedValue: "2200 €",
        reason: "Texte brut indique 2200",
      });
      expect(res.field).toBe("salary");
      expect(res.status).toBe("verify");
      expect(res.suggestedValue).toBe("2200 €");
    });
  });

  describe("normalizeStrategy", () => {
    it("validates and applies defaults to partial strategy objects", () => {
      const strategy = normalizeStrategy({
        targetJob: "Auditeur énergétique",
        salaryMin: 2200,
        experienceLevel: "junior",
      });
      expect(strategy.targetJob).toBe("Auditeur énergétique");
      expect(strategy.salaryMin).toBe(2200);
      expect(strategy.experienceLevel).toBe("junior");
      expect(strategy.contractPreference).toBe("any");
    });
  });
});
