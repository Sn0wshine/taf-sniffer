import { useEffect, useState } from "react";
import {
  DICTIONARY_RECENTS_KEY,
  LEGACY_DEFAULT_SALARY_MIN,
  LEGACY_DEFAULT_TARGET_JOB,
  STRATEGY_KEY,
  defaultStrategy,
} from "../appConstants";
import type { DictionaryField, RecentDictionaryItem, RecentDictionaryState } from "../appConstants";
import { normalizeSuggestionText } from "../suggestionDictionary";
import type { Strategy } from "../types";
import {
  emptyRecentDictionaryState,
  normalizeRecentDictionaryState,
  normalizeRequirementMode,
} from "../utils/jobHelpers";

const loadJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

export function useStrategy() {
  const [strategy, setStrategy] = useState<Strategy>(() => {
    const stored = {
      ...defaultStrategy,
      ...loadJson(STRATEGY_KEY, defaultStrategy),
    };
    const poeiRequirement = normalizeRequirementMode(stored.poeiRequirement, Boolean(stored.priorityPoei));
    const auditRequirement = normalizeRequirementMode(stored.auditRequirement, Boolean(stored.priorityAudit));
    const independentRequirement = normalizeRequirementMode(stored.independentRequirement, Boolean(stored.rejectIndependent));
    const targetJob = typeof stored.targetJob === "string" && stored.targetJob.trim() !== LEGACY_DEFAULT_TARGET_JOB
      ? stored.targetJob
      : "";
    const salaryMin = Number(stored.salaryMin);

    return {
      ...stored,
      profileId: typeof stored.profileId === "string" && stored.profileId !== "diagnostic_immobilier" ? stored.profileId : defaultStrategy.profileId,
      targetJob,
      poeiRequirement,
      auditRequirement,
      independentRequirement,
      priorityPoei: poeiRequirement !== "off",
      priorityAudit: auditRequirement !== "off",
      rejectIndependent: independentRequirement !== "off",
      salaryMin: Number.isFinite(salaryMin) && salaryMin !== LEGACY_DEFAULT_SALARY_MIN ? salaryMin : defaultStrategy.salaryMin,
      location: stored.location === "Ile-de-France" || stored.location === "Île-de-France" ? "" : stored.location,
      objective:
        stored.objective === "Entrer vite dans le metier avec formation interne, puis evoluer vers audit energetique." ||
        stored.objective === "Entrer vite dans le métier avec formation interne, puis évoluer vers audit énergétique."
          ? ""
          : stored.objective,
      assistantIntent: typeof stored.assistantIntent === "string" ? stored.assistantIntent : "",
      assistantSummary: typeof stored.assistantSummary === "string" ? stored.assistantSummary : "",
      aiSearchQueries: Array.isArray(stored.aiSearchQueries)
        ? stored.aiSearchQueries.filter((item: unknown): item is string => typeof item === "string").slice(0, 8)
        : [],
      aiSearchPlanCheckedAt: typeof stored.aiSearchPlanCheckedAt === "string" ? stored.aiSearchPlanCheckedAt : "",
    };
  });

  const [recentDictionary, setRecentDictionary] = useState<RecentDictionaryState>(() =>
    normalizeRecentDictionaryState(loadJson(DICTIONARY_RECENTS_KEY, emptyRecentDictionaryState())),
  );

  useEffect(() => {
    localStorage.setItem(STRATEGY_KEY, JSON.stringify(strategy));
  }, [strategy]);

  useEffect(() => {
    localStorage.setItem(DICTIONARY_RECENTS_KEY, JSON.stringify(recentDictionary));
  }, [recentDictionary]);

  const updateStrategy = (patch: Partial<Strategy>) => {
    setStrategy((current) => ({
      ...current,
      ...patch,
      aiSearchQueries:
        patch.aiSearchQueries !== undefined
          ? patch.aiSearchQueries
          : patch.targetJob !== undefined || patch.assistantIntent !== undefined || patch.location !== undefined
            ? []
            : current.aiSearchQueries,
      aiSearchPlanCheckedAt:
        patch.aiSearchPlanCheckedAt !== undefined
          ? patch.aiSearchPlanCheckedAt
          : patch.targetJob !== undefined || patch.assistantIntent !== undefined || patch.location !== undefined
            ? ""
            : current.aiSearchPlanCheckedAt,
    }));
  };

  const rememberDictionaryValue = (field: DictionaryField, label: string, family = "Récent", aliases: string[] = []) => {
    const cleanLabel = label.trim();
    if (!cleanLabel) return;
    setRecentDictionary((current) => {
      const key = normalizeSuggestionText(cleanLabel);
      const existing = current[field].find((item) => normalizeSuggestionText(item.label) === key);
      const nextItem: RecentDictionaryItem = {
        label: cleanLabel,
        family,
        aliases,
        count: (existing?.count ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      };
      const nextList = [nextItem, ...current[field].filter((item) => normalizeSuggestionText(item.label) !== key)]
        .sort((a, b) => b.count - a.count || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, 8);
      return { ...current, [field]: nextList };
    });
  };

  const resetCriteria = () => {
    setStrategy({
      ...defaultStrategy,
      profileId: strategy.profileId,
    });
  };

  return {
    strategy,
    setStrategy,
    updateStrategy,
    recentDictionary,
    setRecentDictionary,
    rememberDictionaryValue,
    resetCriteria,
  };
}
