import { describe, expect, it } from "vitest";
import { buildFormationSignals, splitSentences } from "../formationSignals";

const POEI_OFFER = `Poste : Diagnostiqueur immobilier débutant.
Nous recrutons en POEI : préparation opérationnelle à l'emploi assurée avant votre embauche.
Rémunération dès la formation. Véhicule fourni.`;

const OPCO_OFFER = `Technicien DPE H/F.
Formation certifiante financee par l'OPCO, frais de formation pris en charge.
Salaire 1800-2200 euros net.`;

const VAGUE_OFFER = `Commercial terrain.
Une formation est possible selon profil. Autonomie attendue.`;

const NOTHING_OFFER = `Développeur web confirmé requis, cinq ans d'expérience minimum exigées.`;

describe("buildFormationSignals", () => {
  it("détecte un dispositif POEI explicite comme formation confirmée avec citation", () => {
    const signal = buildFormationSignals(POEI_OFFER);
    expect(signal.level).toBe("confirmée");
    expect(signal.types.some((type) => type.includes("POEI"))).toBe(true);
    expect(signal.citations.length).toBeGreaterThan(0);
    expect(signal.citations[0].toLowerCase()).toContain("poei");
    expect(signal.payTrainingWarning).toBe(false);
  });

  it("détecte un financement OPCO / frais pris en charge", () => {
    const signal = buildFormationSignals(OPCO_OFFER);
    expect(signal.level).toBe("confirmée");
    expect(signal.types.join(" ")).toMatch(/pris en charge|OPCO/i);
  });

  it("classe une mention floue comme possible sans type confirmé", () => {
    const signal = buildFormationSignals(VAGUE_OFFER);
    expect(signal.level).toBe("possible");
    expect(signal.types).toHaveLength(0);
  });

  it("retourne absente quand rien n'est mentionné", () => {
    const signal = buildFormationSignals(NOTHING_OFFER);
    expect(signal.level).toBe("absente");
    expect(signal.types).toHaveLength(0);
    expect(signal.citations).toHaveLength(0);
  });

  it("signale une formation à la charge du candidat", () => {
    const signal = buildFormationSignals("Diagnostic immobilier. Formation a payer en amont, pack de demarrage paye inclus.");
    expect(signal.payTrainingWarning).toBe(true);
  });

  it("gère les accents et les majuscules", () => {
    const signal = buildFormationSignals("Formation PRIS EN CHARGE par l'employeur, école interne agréée.");
    expect(signal.level).toBe("confirmée");
  });
});

describe("splitSentences", () => {
  it("découpe sur la ponctuation et les retours à la ligne", () => {
    const sentences = splitSentences("Première phrase ici. Deuxième phrase !\nTroisième phrase");
    expect(sentences).toHaveLength(3);
  });

  it("ignore les fragments trop courts", () => {
    expect(splitSentences("Ok.\nCeci est une phrase suffisamment longue pour compter.")).toHaveLength(1);
  });
});
