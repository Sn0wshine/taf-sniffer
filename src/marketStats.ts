// Statistiques salariales de marché, construites à partir des offres déjà
// analysées par Taf Sniffer (salaires normalisés net mensuel).
// Aucune API externe : les données s'accumulent dans le localStorage à chaque recherche,
// ce qui affine progressivement les fourchettes par métier × zone.

import { normalized } from "./formationSignals";

export const MARKET_STATS_KEY = "taf-sniffer.marketStats.v1";
const MAX_SAMPLES_PER_KEY = 200;
const MIN_SAMPLES_FOR_STATS = 3;

export type MarketStats = {
  sampleCount: number;
  min: number;
  median: number;
  max: number;
};

type MarketStore = Record<string, number[]>;

/** Clé de marché normalisée : métier × zone ("france" si zone vide). */
export const marketKeyFor = (targetJob: string, location: string): string => {
  const job = normalized(targetJob).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "metier";
  const zone = normalized(location).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "france";
  return `${job}@${zone}`;
};

/** Forme minimale requise pour lire un salaire normalisé. */
type SalaryLike = {
  normalizedSalary?: {
    monthlyNetMin?: number;
    monthlyNetMax?: number;
  } | null;
};

/** Milieu de la fourchette net mensuelle d'une analyse, sinon null. */
export const monthlyNetMidOf = (analysis: SalaryLike): number | null => {
  const { monthlyNetMin, monthlyNetMax } = analysis?.normalizedSalary || {};
  const min = Number(monthlyNetMin);
  const max = Number(monthlyNetMax);
  const minOk = Number.isFinite(min) && min > 0;
  const maxOk = Number.isFinite(max) && max > 0;
  if (minOk && maxOk) return Math.round((min + max) / 2);
  if (minOk) return Math.round(min);
  return null;
};

/** Échantillons de salaires issus des analyses fournies. */
export const collectMarketSamples = (analyses: SalaryLike[]): number[] =>
  analyses.map(monthlyNetMidOf).filter((value): value is number => value !== null);

const medianOf = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};

/** Calcule min / médiane / max sur un jeu d'échantillons. */
export const computeMarketStats = (samples: number[]): MarketStats | null => {
  const clean = samples.filter((value) => Number.isFinite(value) && value > 200 && value < 20000);
  if (clean.length < MIN_SAMPLES_FOR_STATS) return null;
  return {
    sampleCount: clean.length,
    min: Math.min(...clean),
    median: medianOf(clean),
    max: Math.max(...clean),
  };
};

const readStore = (): MarketStore => {
  try {
    const raw = localStorage.getItem(MARKET_STATS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as MarketStore) : {};
  } catch {
    return {};
  }
};

const writeStore = (store: MarketStore) => {
  try {
    localStorage.setItem(MARKET_STATS_KEY, JSON.stringify(store));
  } catch {
    // Le stockage ne doit jamais bloquer l'app.
  }
};

/**
 * Enregistre les échantillons courants dans l'historique persisté (par clé métier × zone),
 * puis retourne les statistiques combinées (historique + échantillons courants).
 */
export const recordAndComputeMarketStats = (
  key: string,
  currentSamples: number[],
): MarketStats | null => {
  if (!currentSamples.length) return getMarketStats(key);
  const store = readStore();
  const merged = [...(store[key] || []), ...currentSamples].slice(-MAX_SAMPLES_PER_KEY);
  store[key] = merged;
  writeStore(store);
  return computeMarketStats(merged);
};

/** Statistiques depuis l'historique seul (+ échantillons optionnels non persistés). */
export const getMarketStats = (key: string, extraSamples: number[] = []): MarketStats | null => {
  const store = readStore();
  return computeMarketStats([...(store[key] || []), ...extraSamples]);
};

export type SalaryPosition = {
  label: string;
  tone: "low" | "mid" | "high";
};

/** Positionne un salaire net mensuel par rapport à la fourchette de marché. */
export const salaryPositionLabel = (monthlyNet: number, stats: MarketStats): SalaryPosition => {
  if (monthlyNet > stats.max) return { label: `Au-dessus du marché observé (${stats.sampleCount} offres)`, tone: "high" };
  if (monthlyNet >= stats.median) {
    return { label: `Dans la fourchette haute du marché (${stats.sampleCount} offres)`, tone: "high" };
  }
  if (monthlyNet >= stats.min) return { label: `Dans la fourchette du marché (${stats.sampleCount} offres)`, tone: "mid" };
  return { label: `Sous le marché observé (${stats.sampleCount} offres)`, tone: "low" };
};

export const formatEuro = (value: number): string => `${value.toLocaleString("fr-FR")} €`;
