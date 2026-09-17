import type { JobAnalysis, JobRecord, Strategy } from "./types";
import { analyzeJob } from "./analysis";

export type AIProvider = {
  analyzeJobOffer(job: JobRecord, strategy: Strategy): Promise<JobAnalysis>;
  expandKeywords(strategy: Strategy): Promise<string[]>;
};

export const localRulesProvider: AIProvider = {
  async analyzeJobOffer(job, strategy) {
    return analyzeJob(job, strategy);
  },
  async expandKeywords(strategy) {
    const base = strategy.targetJob.trim() || strategy.assistantIntent.trim();
    const variants = [base];
    if (base) {
      variants.push(`${base} emploi`, `${base} recrutement`, `${base} poste`);
      if (strategy.experienceLevel === "junior") variants.push(`${base} junior`);
      if (strategy.experienceLevel === "debutant_reconversion") variants.push(`${base} débutant`, `${base} reconversion`);
      if (strategy.location.trim()) variants.push(`${base} ${strategy.location.trim()}`);
      if (strategy.contractPreference !== "any") variants.push(`${base} ${strategy.contractPreference}`);
    }
    return variants.filter((keyword, index, list) => keyword && list.indexOf(keyword) === index);
  },
};
