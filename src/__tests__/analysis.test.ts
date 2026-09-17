import { describe, expect, it } from "vitest";
import { analyzeJob, createJobRecord, getControlledExtraction } from "../analysis";
import { defaultStrategy } from "../appConstants";
import type { Strategy } from "../types";
import { getActiveProfile, GENERIC_PROFILE_ID } from "../jobProfiles";

describe("Job Analysis & Scoring Engine", () => {
  const baseStrategy: Strategy = {
    ...defaultStrategy,
    targetJob: "Diagnostiqueur immobilier",
    salaryMin: 2000,
    experienceLevel: "debutant_reconversion",
  };

  it("uses a neutral generic profile and local employment signals by default", () => {
    const strategy = { ...defaultStrategy, targetJob: "Développeur frontend" };
    const profile = getActiveProfile(strategy);
    const analysis = analyzeJob(createJobRecord(`
Poste : Développeur frontend junior
Entreprise : Studio Web
Lieu : Lyon
Contrat : CDI
Salaire : 42 000 € brut annuel
Télétravail hybride, équipe produit et évolution possible.
    `), strategy);

    expect(profile.id).toBe(GENERIC_PROFILE_ID);
    expect(analysis.positiveSignals).not.toContain("Débutant ou reconversion accepté");
    expect(analysis.scoreLines.some((line) => line.label.includes("formation facilitée non confirmée"))).toBe(false);
    expect(analysis.scores.salaryPackage).toBeGreaterThan(40);
  });

  it("analyzes a well-structured diagnostic job offer with POEI and salary", () => {
    const rawOffer = `
Poste : Diagnostiqueur Immobilier Débutant
Entreprise : Diag Expertise France
Lieu : 75010 Paris
Contrat : CDI
Temps de travail : 35h
Salaire : 2500 € brut mensuel
Brut / net : brut
Primes : Prime sur objectifs, 13ème mois
Avantages : Véhicule de service, Mutuelle, Téléphone
Expérience demandée : Débutant accepté, formation POEI assurée par nos soins

Nous recrutons un diagnostiqueur immobilier débutant dans le cadre d'une POEI avec France Travail.
Formation complète au métier et aux certifications amiante, plomb, DPE et audit énergétique.
    `;

    const job = createJobRecord(rawOffer);
    const analysis = analyzeJob(job, baseStrategy);

    expect(analysis.normalizedTitle.toLowerCase()).toContain("diagnostiqueur");
    expect(analysis.contract).toBe("CDI");
    expect(analysis.offerType).toBe("Offre stratégique");

    // Scores check
    expect(analysis.scores.global).toBeGreaterThanOrEqual(70);
    expect(analysis.riskLevel).toBe("faible");

    // Radar axes
    expect(analysis.scores.formationFacilitee).toBeGreaterThanOrEqual(80);
    expect(analysis.scores.salaryPackage).toBeGreaterThan(0);
    expect(analysis.scores.trajectory).toBeGreaterThan(0);
    expect(analysis.scores.employer).toBeGreaterThan(0);
    expect(analysis.scores.risk).toBeGreaterThan(0);
  });

  it("identifies independent / franchise contracts and reflects risk when rejected", () => {
    const rawOffer = `
Poste : Diagnostiqueur immobilier indépendant
Entreprise : Réseau Franchise Diagnostic
Lieu : Lyon
Contrat : Indépendant / Franchise
Salaire : Rémunération selon chiffre d'affaires, commissions non plafonnées
Primes : Commissions
Avantages : Non mentionnés
Expérience demandée : Indifférent

Rejoignez notre réseau en tant que diagnostiqueur indépendant sous statut micro-entrepreneur ou agent commercial.
Pack de démarrage à votre charge.
    `;

    const job = createJobRecord(rawOffer);
    const analysis = analyzeJob(job, { ...baseStrategy, rejectIndependent: true });

    expect(analysis.offerType).toBe("Offre piège");
    expect(analysis.riskLevel).toBe("élevé");
    expect(analysis.scores.global).toBeLessThan(50);
  });

  it("properly converts annual salary to net monthly estimation", () => {
    const rawOffer = `
Poste : Technicien DPE / Audit énergétique
Entreprise : Cabinet Alpha
Lieu : Bordeaux
Contrat : CDI
Temps de travail : 35h
Salaire : 36 000 € brut annuel
Brut / net : brut
Description : Réalisation des audits énergétiques et DPE.
    `;

    const job = createJobRecord(rawOffer);
    const analysis = analyzeJob(job, baseStrategy);

    // 36000 gross annual / 12 = 3000 gross monthly * 0.78 = ~2340 net monthly
    expect(analysis.normalizedSalary.monthlyNetMin).toBeGreaterThanOrEqual(2200);
    expect(analysis.normalizedSalary.monthlyNetMin).toBeLessThanOrEqual(2500);
  });

  it("handles complex salary phrasing without breaking (e.g. Mensuel de 2500 Euros sur 12 mois)", () => {
    const rawOffer = `
Poste : Diagnostiqueur immobilier junior
Entreprise : Beta Diag
Lieu : Nantes
Contrat : CDI
Salaire : Mensuel de 2500 Euros sur 12 mois
Description : Diagnostiqueur immobilier junior accepté.
    `;

    const job = createJobRecord(rawOffer);
    const analysis = analyzeJob(job, baseStrategy);

    // Recognizes monthly 2500 without treating 12 months as annual range
    expect(analysis.normalizedSalary.monthlyNetMin).toBeGreaterThanOrEqual(1800);
    expect(analysis.normalizedSalary.monthlyNetMin).toBeLessThanOrEqual(2600);
  });

  describe("getControlledExtraction", () => {
    it("preserves manual corrections over detected values", () => {
      const job = createJobRecord("Poste : Tech DPE\nEntreprise : Inconnue\nLieu : Paris");
      job.manualExtraction = {
        title: "Diagnostiqueur DPE Certifié",
        company: "Mon Entreprise Corrigée",
        location: "Paris 15e",
        contract: "CDI",
        workTime: "35h",
        salary: "2800 € net",
        bonus: "1000 €",
        bonusEstimate: "",
        requiredExperience: "Débutant",
        benefits: "Véhicule",
      };
      job.extractionReview = "manual";

      const detected = {
        title: "Tech DPE",
        normalizedTitle: "Tech DPE",
        company: "Inconnue",
        location: "Paris",
        contract: "CDD",
        workTime: "",
        salary: "",
        salaryKind: "non précisé" as const,
        bonus: "",
        bonusEstimate: "",
        requiredExperience: "",
        benefits: "",
        source: "",
        sourceUrl: "",
      };

      const extraction = getControlledExtraction(job, detected);
      expect(extraction.fields.company.value).toBe("Mon Entreprise Corrigée");
      expect(extraction.fields.company.source).toBe("manual");
      expect(extraction.fields.title.value).toBe("Diagnostiqueur DPE Certifié");
    });
  });
});
