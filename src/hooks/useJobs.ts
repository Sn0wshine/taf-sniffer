import { useEffect, useMemo, useState } from "react";
import {
  STORAGE_KEY,
  demoOffers,
  extractionTestOffers,
} from "../appConstants";
import type { AIMode, AnalysisItem, ExpectedReview, JobRecord, ManualExtraction, RankingFilter, ReviewStatus, Strategy, SwipeRankAction } from "../appConstants";
import { analyzeJob, createJobRecord } from "../analysis";
import { getActiveProfile } from "../jobProfiles";
import {
  bestSelectableId,
  buildDecisionSummary,
  getTopPicks,
  importRejectReason,
  inferSource,
  jobDedupeKey,
  normalizeReviewStatus,
  prepareImportedRecord,
  rankingSearchMatches,
  reviewPatch,
  sortAnalysisItems,
  splitOfferText,
} from "../utils/jobHelpers";
import { normalizeAiReview, normalizeCompanyProfile } from "../utils/normalizers";

const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

export function useJobs(strategy: Strategy, aiMode: AIMode) {
  const [jobs, setJobs] = useState<JobRecord[]>(() =>
    loadJson<JobRecord[]>(STORAGE_KEY, []).map((job) => ({
      ...job,
      favorite: Boolean(job.favorite),
      ignored: Boolean(job.ignored),
      reviewStatus: normalizeReviewStatus(job),
      companyProfile: normalizeCompanyProfile(job.companyProfile),
      aiReview: normalizeAiReview(job.aiReview),
    })),
  );

  const [selectedId, setSelectedId] = useState<string | null>(() => jobs[0]?.id ?? null);
  const [filter, setFilter] = useState<RankingFilter>("to_review");
  const [rankingSearch, setRankingSearch] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }, [jobs]);

  const activeProfile = useMemo(() => getActiveProfile(strategy), [strategy]);

  const analyses: AnalysisItem[] = useMemo(
    () => jobs.map((job) => ({ job, analysis: analyzeJob(job, strategy) })),
    [jobs, strategy],
  );

  const strategyHash = useMemo(
    () => JSON.stringify({
      targetJob: strategy.targetJob,
      location: strategy.location,
      salaryMin: strategy.salaryMin,
      experienceLevel: strategy.experienceLevel,
      contractPreference: strategy.contractPreference,
      poeiRequirement: strategy.poeiRequirement,
      auditRequirement: strategy.auditRequirement,
      independentRequirement: strategy.independentRequirement,
    }),
    [strategy],
  );

  const sortedAnalyses = useMemo(
    () => sortAnalysisItems(analyses, aiMode, strategyHash),
    [analyses, aiMode, strategyHash],
  );

  const topPicks = useMemo(
    () => getTopPicks(sortedAnalyses, activeProfile),
    [sortedAnalyses, activeProfile],
  );

  const decisionSummary = useMemo(
    () => buildDecisionSummary(analyses, strategy),
    [analyses, strategy],
  );

  const filteredAnalyses = useMemo(() => {
    return sortedAnalyses.filter((item) => {
      const { job, analysis } = item;
      const status = normalizeReviewStatus(job);

      if (filter === "favorites") {
        if (!job.favorite && status !== "favori") return false;
      } else if (filter === "ignored") {
        if (!job.ignored && status !== "ignoree") return false;
      } else if (filter === "to_explore") {
        if (job.ignored || status !== "a_creuser") return false;
      } else if (filter === "to_review") {
        if (job.ignored || status !== "a_traiter") return false;
      } else if (filter === "new") {
        if (job.ignored || (status !== "a_traiter" && status !== "a_creuser")) return false;
      }

      if (strategy.hideWeakOffers && filter !== "ignored" && filter !== "all") {
        if (analysis.riskLevel === "élevé" || analysis.scores.global < 35) {
          return false;
        }
      }

      if (rankingSearch.trim()) {
        return rankingSearchMatches(item, rankingSearch);
      }

      return true;
    });
  }, [sortedAnalyses, filter, rankingSearch, strategy.hideWeakOffers]);

  const selectedItem = useMemo(
    () => analyses.find((item) => item.job.id === selectedId) ?? null,
    [analyses, selectedId],
  );

  const updateJob = (id: string, patch: Partial<JobRecord>) => {
    setJobs((current) =>
      current.map((job) => (job.id === id ? { ...job, ...patch, updatedAt: new Date().toISOString() } : job)),
    );
  };

  const addJobRecords = (records: JobRecord[], meta: Partial<JobRecord> = {}) => {
    const preparedRecords = records.map((record) => prepareImportedRecord(record, meta));
    const rejected = preparedRecords.filter((record) => importRejectReason(record));
    const validRecords = preparedRecords.filter((record) => !importRejectReason(record));
    if (validRecords.length === 0) {
      return { importedCount: 0, duplicateCount: 0, rejectedCount: rejected.length, mergedJobs: jobs };
    }

    const nextJobs = validRecords;
    const existingKeys = new Set(jobs.map(jobDedupeKey));
    const unique = nextJobs.filter((job) => !existingKeys.has(jobDedupeKey(job)));
    const duplicateCount = nextJobs.length - unique.length;
    const mergedJobs = [...unique, ...jobs];
    setJobs(mergedJobs);
    const bestId = bestSelectableId(mergedJobs, strategy) ?? nextJobs[0]?.id ?? selectedId;
    setSelectedId(bestId);
    setFilter("to_review");
    return { importedCount: unique.length, duplicateCount, rejectedCount: rejected.length, mergedJobs };
  };

  const addOffers = (text: string, meta: Partial<JobRecord> = {}) => {
    const chunks = splitOfferText(text);
    if (chunks.length === 0) {
      return { importedCount: 0, duplicateCount: 0, mergedJobs: jobs };
    }

    const nextJobs = chunks.map((chunk) => ({
      ...createJobRecord(chunk),
      reviewStatus: "a_traiter" as ReviewStatus,
      searchBatchId: meta.searchBatchId,
      source: meta.source || inferSource(chunk),
      sourceUrl: meta.sourceUrl || "",
      datasetLabel: "jeu réel",
      ...meta,
    }));
    const existingKeys = new Set(jobs.map(jobDedupeKey));
    const unique = nextJobs.filter((job) => !existingKeys.has(jobDedupeKey(job)));
    const duplicateCount = nextJobs.length - unique.length;
    const mergedJobs = [...unique, ...jobs];
    setJobs(mergedJobs);
    setSelectedId(bestSelectableId(mergedJobs, strategy) ?? selectedId);
    setFilter("to_review");
    return { importedCount: unique.length, duplicateCount, mergedJobs };
  };

  const handleRankSwipe = (id: string, action: SwipeRankAction, currentStatus: ReviewStatus) => {
    let newStatus: ReviewStatus;
    if (action === "explore") {
      newStatus = currentStatus === "a_creuser" ? "favori" : "a_creuser";
    } else {
      newStatus = "ignoree";
    }
    updateJob(id, reviewPatch(newStatus));
    if (selectedId === id) setSelectedId(null);
    return newStatus;
  };

  const toggleFavorite = (id: string) => {
    const target = jobs.find((job) => job.id === id);
    if (!target) return;
    const nextFavorite = !target.favorite;
    updateJob(id, {
      favorite: nextFavorite,
      ignored: nextFavorite ? false : target.ignored,
      reviewStatus: nextFavorite ? "favori" : "a_traiter",
    });
  };

  const toggleIgnored = (id: string) => {
    const target = jobs.find((job) => job.id === id);
    if (!target) return;
    const nextIgnored = !target.ignored;
    updateJob(id, {
      ignored: nextIgnored,
      favorite: nextIgnored ? false : target.favorite,
      reviewStatus: nextIgnored ? "ignoree" : "a_traiter",
    });
  };

  const setReviewStatus = (id: string, status: ReviewStatus) => {
    updateJob(id, reviewPatch(status));
  };

  const patchManualExtraction = (id: string, patch: Partial<ManualExtraction>) => {
    const target = jobs.find((job) => job.id === id);
    if (!target) return;
    updateJob(id, {
      manualExtraction: {
        ...(target.manualExtraction || {
          title: "",
          company: "",
          location: "",
          contract: "",
          workTime: "",
          salary: "",
          bonus: "",
          bonusEstimate: "",
          requiredExperience: "",
          benefits: "",
        }),
        ...patch,
      },
      extractionReview: "manual",
    });
  };

  const patchExpectedReview = (id: string, patch: Partial<ExpectedReview>) => {
    const target = jobs.find((job) => job.id === id);
    if (!target) return;
    updateJob(id, {
      expectedReview: {
        ...(target.expectedReview || {
          expectedVerdict: "",
          expectedTags: [],
          notes: "",
        }),
        ...patch,
      },
    });
  };

  const purgeJobs = () => {
    setJobs([]);
    setSelectedId(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const loadDemo = () => {
    const demoJobs = demoOffers.map((offer: string) => ({
      ...createJobRecord(offer),
      datasetLabel: "exemple",
      source: "Démo",
      reviewStatus: "a_traiter" as ReviewStatus,
    }));
    setJobs(demoJobs);
    setSelectedId(demoJobs[0]?.id ?? null);
    setFilter("to_review");
  };

  const loadExtractionTests = () => {
    const testJobs = extractionTestOffers.map((test: { rawText: string; source: string; sourceUrl: string; expectedExtraction?: any }) => ({
      ...createJobRecord(test.rawText),
      datasetLabel: "test extraction",
      source: test.source,
      sourceUrl: test.sourceUrl,
      reviewStatus: "a_traiter" as ReviewStatus,
      expectedReview: {
        expectedVerdict: "" as const,
        expectedTags: [],
        expectedExtraction: test.expectedExtraction,
        notes: "Cas de validation extraction.",
      },
    }));
    setJobs(testJobs);
    setSelectedId(testJobs[0]?.id ?? null);
    setFilter("to_review");
  };

  return {
    jobs,
    setJobs,
    analyses,
    sortedAnalyses,
    filteredAnalyses,
    topPicks,
    decisionSummary,
    selectedId,
    setSelectedId,
    selectedItem,
    filter,
    setFilter,
    rankingSearch,
    setRankingSearch,
    updateJob,
    addJobRecords,
    addOffers,
    handleRankSwipe,
    toggleFavorite,
    toggleIgnored,
    setReviewStatus,
    patchManualExtraction,
    patchExpectedReview,
    purgeJobs,
    loadDemo,
    loadExtractionTests,
  };
}
