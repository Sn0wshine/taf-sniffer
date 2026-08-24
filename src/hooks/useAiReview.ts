import { useEffect, useState } from "react";
import { TOP3_AI_KEY } from "../appConstants";
import type { AnalysisItem } from "../appConstants";
import { proxyBase } from "../searchProvider";
import type {
  AIReview,
  CompanyEnrichment,
  EmployerRankingResult,
  EmployerRating,
  JobRecord,
  Strategy,
  Top3AIComparison,
} from "../types";
import { analyzeJob } from "../analysis";
import {
  aiJobHash,
  aiStrategyHash,
  buildEmployerRanking,
  emptyEmployerRating,
} from "../utils/jobHelpers";
import {
  normalizeAiReview,
  normalizeCompanyProfile,
  normalizeEmployerRating,
  normalizeTop3AiComparison,
} from "../utils/normalizers";

const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const chunkList = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export function useAiReview() {
  const [lastTop3AiComparison, setLastTop3AiComparison] = useState<Top3AIComparison | null>(() =>
    normalizeTop3AiComparison(loadJson(TOP3_AI_KEY, null)),
  );

  const [employerRanking, setEmployerRanking] = useState<EmployerRankingResult | null>(null);
  const [companyCache, setCompanyCache] = useState<Record<string, CompanyEnrichment | "loading" | "error">>({});
  const [aiFallbackMessage, setAiFallbackMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lastTop3AiComparison) localStorage.setItem(TOP3_AI_KEY, JSON.stringify(lastTop3AiComparison));
    else localStorage.removeItem(TOP3_AI_KEY);
  }, [lastTop3AiComparison]);

  const fetchCompanyProfile = async (company: string, companyType: string) => {
    const response = await fetch(`${proxyBase()}/api/company-profile?company=${encodeURIComponent(company)}`);
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error?.message || "Identification indisponible, vérifie manuellement.");
    return normalizeCompanyProfile(payload, company, companyType) ?? {
      status: "partial" as const,
      companyName: company,
      estimatedType: companyType,
      website: "",
      signals: [],
      confidence: "faible" as const,
      summary: "Identification partielle.",
      checkedAt: new Date().toISOString(),
      sources: [],
    };
  };

  const fetchEmployerRating = async (company: string): Promise<EmployerRating> => {
    const clean = company.trim();
    if (!clean) return emptyEmployerRating(company);
    try {
      const response = await fetch(`${proxyBase()}/api/employer-rating?company=${encodeURIComponent(clean)}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) return emptyEmployerRating(clean);
      const rating = normalizeEmployerRating(payload?.employerRating);
      return rating ?? emptyEmployerRating(clean);
    } catch {
      return emptyEmployerRating(clean);
    }
  };

  const analyzeJobsWithAi = async ({
    candidates,
    strategy,
    localGeminiKey = "",
    onUpdateJob,
    onProgress,
  }: {
    candidates: JobRecord[];
    strategy: Strategy;
    localGeminiKey?: string;
    onUpdateJob: (id: string, patch: Partial<JobRecord>) => void;
    onProgress?: (msg: string) => void;
  }) => {
    if (candidates.length === 0) return { doneCount: 0 };
    setLoading(true);
    const strategyHash = aiStrategyHash(strategy);
    const batches = chunkList(candidates, 25);
    let doneCount = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      onProgress?.(
        batches.length > 1
          ? `Analyse Gemini lot ${batchIndex + 1}/${batches.length} (${batch.length} offres)...`
          : `Analyse Gemini de ${batch.length} offres...`,
      );

      for (const job of batch) {
        onUpdateJob(job.id, {
          aiReview: {
            status: "loading",
            provider: "Gemini",
            checkedAt: new Date().toISOString(),
            rawTextHash: aiJobHash(job),
            strategyHash,
          },
        });
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120_000);
        const response = await fetch(`${proxyBase()}/api/ai/analyze-jobs`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...(localGeminiKey ? { "x-gemini-api-key": localGeminiKey } : {}),
          },
          body: JSON.stringify({
            jobs: batch.map((job) => ({
              id: job.id,
              rawText: job.rawText,
              rawTextHash: aiJobHash(job),
              source: job.source,
              sourceUrl: job.sourceUrl,
            })),
            strategy,
            strategyHash,
          }),
        });
        clearTimeout(timeout);

        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error?.message || "Analyse IA échouée.");

        const reviews = Array.isArray(payload?.reviews) ? payload.reviews : [];
        for (const rawReview of reviews) {
          const review = normalizeAiReview(rawReview);
          if (review && (rawReview as any).id) {
            onUpdateJob((rawReview as any).id, { aiReview: review });
            if (review.status === "done") doneCount += 1;
          }
        }

        if (payload?.top3Comparison) {
          setLastTop3AiComparison(normalizeTop3AiComparison(payload.top3Comparison));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur Gemini";
        setAiFallbackMessage(message);
        for (const job of batch) {
          onUpdateJob(job.id, {
            aiReview: {
              status: "error",
              provider: "Gemini",
              checkedAt: new Date().toISOString(),
              rawTextHash: aiJobHash(job),
              strategyHash,
              errorMessage: message,
            },
          });
        }
      }
    }

    setLoading(false);
    return { doneCount };
  };

  const rankEmployers = async (
    jobs: JobRecord[],
    strategy: Strategy,
  ) => {
    setLoading(true);
    try {
      const companies = [...new Set(jobs.map((j) => (j.companyProfile?.companyName || "").trim()).filter(Boolean))].slice(0, 8);
      const ratings = new Map<string, EmployerRating>();
      await Promise.all(
        companies.map(async (company) => {
          const rating = await fetchEmployerRating(company);
          ratings.set(company, rating);
        }),
      );

      const analyses: AnalysisItem[] = jobs.map((job) => ({ job, analysis: analyzeJob(job, strategy) }));
      const result = buildEmployerRanking(analyses, ratings);
      setEmployerRanking(result);
      return result;
    } catch {
      const fallback: EmployerRankingResult = {
        status: "error",
        checkedAt: new Date().toISOString(),
        message: "Comparaison employeurs indisponible.",
        items: [],
      };
      setEmployerRanking(fallback);
      return fallback;
    } finally {
      setLoading(false);
    }
  };

  return {
    lastTop3AiComparison,
    setLastTop3AiComparison,
    employerRanking,
    setEmployerRanking,
    companyCache,
    setCompanyCache,
    aiFallbackMessage,
    setAiFallbackMessage,
    loading,
    analyzeJobsWithAi,
    rankEmployers,
    fetchCompanyProfile,
    fetchEmployerRating,
  };
}
