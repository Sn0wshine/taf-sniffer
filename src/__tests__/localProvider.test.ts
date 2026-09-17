import { describe, expect, it } from "vitest";
import { defaultStrategy } from "../appConstants";
import { localRulesProvider } from "../aiProvider";

describe("local provider", () => {
  it("generates generic keywords without diagnostic immobilier leakage", async () => {
    const keywords = await localRulesProvider.expandKeywords({
      ...defaultStrategy,
      targetJob: "Assistant comptable",
      experienceLevel: "indifferent",
    });

    expect(keywords).toContain("Assistant comptable");
    expect(keywords.some((keyword) => keyword.toLowerCase().includes("diagnostiqueur"))).toBe(false);
  });

  it("remains usable from a free-text intention without a target title", async () => {
    const keywords = await localRulesProvider.expandKeywords({
      ...defaultStrategy,
      targetJob: "",
      assistantIntent: "travail administratif à distance",
    });

    expect(keywords[0]).toContain("travail administratif");
  });
});
