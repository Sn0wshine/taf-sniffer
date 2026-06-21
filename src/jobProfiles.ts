import type { JobProfile, Strategy } from "./types";

export const AUTO_PROFILE_ID = "auto";
export const DIAGNOSTIC_PROFILE_ID = "diagnostic_immobilier";
export const GENERIC_PROFILE_ID = "generique_metier";
export const DEFAULT_PROFILE_ID = AUTO_PROFILE_ID;

const normalizeProfileText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

export const diagnosticImmobilierProfile: JobProfile = {
  id: DIAGNOSTIC_PROFILE_ID,
  label: "Diagnostic immobilier",
  defaultTargetJob: "Diagnostiqueur immobilier",
  ui: {
    strategicRequirementLabel: "Audit énergie",
    strategicScoreLabel: "Audit",
    trajectoryScoreLabel: "Trajectoire",
    strategicMissingLabel: "Audit non confirmé",
    strategicRequiredMissingLabel: "Audit obligatoire absent",
    strategicDetectedLabel: "Audit énergétique détecté",
  },
  search: {
    triggerTerms: ["diagnost", "dpe", "immo"],
    smartVariants: [
      "diagnostiqueur immobilier",
      "diagnostiqueur imobilier",
      "diagnostiqueur immobiliers",
      "diagnostiqueur immo",
      "diagnostic immobilier",
      "technicien diagnostic immobilier",
      "technicien diagnostiqueur immobilier",
      "technicien DPE",
      "DPE",
      "operateur diagnostic immobilier",
      "diagnostiqueur immobilier DPE",
      "technicien audit energetique",
      "conseiller renovation energetique",
    ],
    beginnerVariants: [
      "diagnostiqueur immobilier debutant",
      "diagnostiqueur immobilier junior",
      "formation diagnostiqueur immobilier",
      "POEI diagnostiqueur immobilier",
      "POEC diagnostiqueur immobilier",
      "POEIC diagnostiqueur immobilier",
      "POE diagnostiqueur immobilier",
      "AFPR diagnostiqueur immobilier",
      "formation prise en charge diagnostiqueur immobilier",
      "formation financee diagnostiqueur immobilier",
      "audit energetique junior",
      "auditeur energetique junior",
      "renovation energetique junior",
    ],
    juniorVariants: [
      "diagnostiqueur immobilier junior",
      "technicien DPE junior",
      "audit energetique junior",
      "auditeur energetique junior",
    ],
    confirmedVariants: ["diagnostiqueur immobilier confirme", "auditeur energetique confirme"],
    requiredStrategicTerms: ["audit energetique", "renovation energetique", "DPE mention"],
    requiredStrategicFallback: "audit energetique",
    shortReplacements: [
      { from: /\bimmobilier\b/i, to: "immo" },
      { from: /\bimmo\b/i, to: "immobilier" },
    ],
  },
  analysis: {
    titleFallbacks: [
      { terms: ["audit energetique", "auditeur energetique"], title: "Auditeur énergétique junior" },
      { terms: ["dpe"], title: "Technicien DPE" },
      { terms: ["diagnostiqueur", "diagnostic immobilier", "technicien dpe"], title: "Technicien diagnostic immobilier" },
      { terms: ["renovation energetique", "conseiller renovation"], title: "Technicien rénovation énergétique" },
    ],
    genericTitles: [
      "technicien diagnostic immobilier",
      "auditeur energetique junior",
      "technicien dpe",
      "technicien renovation energetique",
      "poste a qualifier",
      "offre importee",
      "offre apec",
    ],
    companySearchContext: "entreprise avis activite diagnostic immobilier",
    knownStructureTerms: ["bureau veritas", "dekra", "socotec", "qualiconsult", "diagnostic", "cabinet", "bureau d'etudes", "bet"],
    strategicTerms: ["audit energetique", "auditeur energetique", "dpe avec mention"],
    trajectoryTerms: ["renovation energetique", "conseil travaux", "preconisations", "scenarios de travaux", "amo"],
    questions: {
      poeiKnown: "Quel est le cadre exact de la formation facilitée (POEI, POEC, AFPR, OPCO ou autre financement) et quelle embauche est prévue ensuite ?",
      trainingKnown: "Qui finance la formation et peut-elle être formalisée via POEI, POEC, AFPR, OPCO ou France Travail ?",
      trainingMissing: "Une formation interne, prise en charge ou financée est-elle envisageable avant la prise de poste ?",
      strategicKnown: "Quelle part du poste concerne l'audit énergétique ou le conseil travaux ?",
      strategicMissing: "Les diagnostiqueurs participent-ils aussi à des missions d'audit énergétique ?",
    },
    applicationAngles: {
      strategic: "Mettre en avant la reconversion, l'intérêt pour le bâtiment, la rigueur terrain et l'objectif de monter vers audit / conseil travaux.",
      default: "Mettre en avant la fiabilité, l'envie d'apprendre vite, la disponibilité terrain et demander clairement le cadre de formation.",
    },
  },
};

export const genericJobProfile: JobProfile = {
  id: GENERIC_PROFILE_ID,
  label: "Métier générique",
  defaultTargetJob: "Métier cible",
  ui: {
    strategicRequirementLabel: "Signal stratégique",
    strategicScoreLabel: "Stratégie",
    trajectoryScoreLabel: "Évolution",
    strategicMissingLabel: "Signal stratégique non confirmé",
    strategicRequiredMissingLabel: "Signal stratégique obligatoire absent",
    strategicDetectedLabel: "Signal stratégique détecté",
  },
  search: {
    triggerTerms: [],
    smartVariants: [],
    beginnerVariants: [],
    juniorVariants: [],
    confirmedVariants: [],
    requiredStrategicTerms: ["formation qualifiante", "certification", "expertise métier", "évolution"],
    requiredStrategicFallback: "formation qualifiante",
    shortReplacements: [],
  },
  analysis: {
    titleFallbacks: [],
    genericTitles: ["poste a qualifier", "offre importee", "offre apec"],
    companySearchContext: "entreprise avis employeur",
    knownStructureTerms: [
      "groupe",
      "pme",
      "cabinet",
      "bureau d'etudes",
      "bureau d'études",
      "collectivite",
      "collectivité",
      "sas",
      "sarl",
      "recrutement",
      "interim",
      "intérim",
    ],
    strategicTerms: ["formation qualifiante", "certification", "specialisation", "spécialisation", "expertise", "chef de projet", "conseil"],
    trajectoryTerms: ["evolution", "évolution", "montee en competence", "montée en compétence", "progression", "responsabilites", "responsabilités"],
    questions: {
      poeiKnown: "Quel est le cadre exact de la formation facilitée (POEI, POEC, AFPR, OPCO ou autre financement) et quelle embauche est prévue ensuite ?",
      trainingKnown: "Quelle formation est prévue, qui la finance et quel niveau est attendu à l'arrivée ?",
      trainingMissing: "Une formation interne ou un parcours d'intégration est-il prévu pour ce poste ?",
      strategicKnown: "Quelles missions permettent de progresser vers un poste plus qualifié ou plus stable ?",
      strategicMissing: "Quelles perspectives d'évolution ou de spécialisation sont réalistes sur ce poste ?",
    },
    applicationAngles: {
      strategic: "Mettre en avant la motivation pour le métier, la capacité à apprendre vite et l'objectif de progresser vers des missions plus qualifiées.",
      default: "Mettre en avant la fiabilité, l'envie d'apprendre, les expériences transférables et demander clairement le cadre de formation.",
    },
  },
};

export const jobProfiles = [diagnosticImmobilierProfile, genericJobProfile];

export const inferProfileId = (strategy?: Partial<Pick<Strategy, "profileId" | "targetJob">>) => {
  const explicit = strategy?.profileId && strategy.profileId !== AUTO_PROFILE_ID
    ? jobProfiles.find((profile) => profile.id === strategy.profileId)?.id
    : "";
  if (explicit) return explicit;

  const target = normalizeProfileText(strategy?.targetJob || diagnosticImmobilierProfile.defaultTargetJob);
  const diagnosticTerms = [
    ...diagnosticImmobilierProfile.search.triggerTerms,
    ...diagnosticImmobilierProfile.search.smartVariants,
    ...diagnosticImmobilierProfile.analysis.strategicTerms,
  ].map(normalizeProfileText);

  return diagnosticTerms.some((term) => term && target.includes(term)) ? DIAGNOSTIC_PROFILE_ID : GENERIC_PROFILE_ID;
};

export const getActiveProfile = (strategy?: Partial<Pick<Strategy, "profileId" | "targetJob">>): JobProfile =>
  jobProfiles.find((profile) => profile.id === inferProfileId(strategy)) || diagnosticImmobilierProfile;
