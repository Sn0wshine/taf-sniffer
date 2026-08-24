import { describe, expect, it } from "vitest";
import {
  collectMarketSamples,
  computeMarketStats,
  marketKeyFor,
  monthlyNetMidOf,
  recordAndComputeMarketStats,
  salaryPositionLabel,
} from "../marketStats";

const salaryOf = (min?: number, max?: number) => ({
  normalizedSalary: { monthlyNetMin: min, monthlyNetMax: max },
});

describe("monthlyNetMidOf", () => {
  it("calcule le milieu de fourchette", () => {
    expect(monthlyNetMidOf(salaryOf(1800, 2200))).toBe(2000);
  });
  it("retourne le min seul si le max est absent", () => {
    expect(monthlyNetMidOf(salaryOf(1900, undefined))).toBe(1900);
  });
  it("retourne null sans données exploitables", () => {
    expect(monthlyNetMidOf(salaryOf(undefined, undefined))).toBeNull();
    expect(monthlyNetMidOf(salaryOf(-5, 100))).toBeNull();
  });
});

describe("marketKeyFor", () => {
  it("normalise métier et zone sans accents", () => {
    expect(marketKeyFor("Diagnostiqueur immobilier", "Île-de-France")).toBe("diagnostiqueur-immobilier@ile-de-france");
  });
  it("retombe sur france si la zone est vide", () => {
    expect(marketKeyFor("Développeur web", "")).toBe("developpeur-web@france");
  });
});

describe("computeMarketStats", () => {
  it("retourne null avec moins de 3 échantillons", () => {
    expect(computeMarketStats([1800, 2100])).toBeNull();
  });
  it("filtre les valeurs aberrantes et calcule médiane et extrêmes", () => {
    const stats = computeMarketStats([1800, 2000, 2200, 999999, -10, 2000]);
    expect(stats).not.toBeNull();
    expect(stats?.sampleCount).toBe(4);
    expect(stats?.min).toBe(1800);
    expect(stats?.median).toBe(2000);
    expect(stats?.max).toBe(2200);
  });
  it("gère un nombre pair d'échantillons pour la médiane", () => {
    const stats = computeMarketStats([1800, 1900, 2100, 2400]);
    expect(stats?.median).toBe(2000);
  });
});

describe("collectMarketSamples", () => {
  it("ignore les analyses sans salaire", () => {
    expect(collectMarketSamples([salaryOf(1800, 2000), salaryOf(), salaryOf(2000, 2400)])).toEqual([1900, 2200]);
  });
});

describe("salaryPositionLabel", () => {
  const stats = { sampleCount: 5, min: 1700, median: 2000, max: 2500 };
  it("détecte une offre sous le marché", () => {
    expect(salaryPositionLabel(1500, stats).tone).toBe("low");
  });
  it("détecte une offre dans la fourchette", () => {
    expect(salaryPositionLabel(1850, stats).tone).toBe("mid");
  });
  it("détecte une offre au-dessus de la médiane", () => {
    expect(salaryPositionLabel(2300, stats).tone).toBe("high");
  });
});

describe("recordAndComputeMarketStats", () => {
  it("calcule des statistiques depuis les échantillons courants même sans stockage", () => {
    const stats = recordAndComputeMarketStats("test@france", [1800, 2000, 2200]);
    expect(stats?.sampleCount).toBeGreaterThanOrEqual(3);
    expect(stats?.median).toBe(2000);
  });
});
