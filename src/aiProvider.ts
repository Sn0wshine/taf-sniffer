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
    const base = strategy.targetJob.trim();

    return [
      base,
      "diagnostiqueur immobilier",
      "diagnostiqueur immo",
      "technicien diagnostic immobilier",
      "technicien DPE",
      "POEI diagnostiqueur immobilier",
      "POEC diagnostiqueur immobilier",
      "formation prise en charge diagnostiqueur immobilier",
      "formation financee diagnostiqueur immobilier",
      "audit énergétique junior",
      "technicien audit énergétique",
    ].filter((keyword, index, list) => keyword && list.indexOf(keyword) === index);
  },
};
