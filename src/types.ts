export type Strategy = {
  profileId?: string;
  targetJob: string;
  location: string;
  salaryMin: number;
  experienceLevel: ExperienceLevel;
  contractPreference: ContractPreference;
  hideWeakOffers: boolean;
  poeiRequirement: RequirementMode;
  auditRequirement: RequirementMode;
  independentRequirement: RequirementMode;
  objective: string;
  priorityTraining: boolean;
  priorityPoei: boolean;
  prioritySalary: boolean;
  priorityAudit: boolean;
  rejectIndependent: boolean;
  smartSearch: boolean;
  smartLocation: boolean;
  assistantIntent: string;
  assistantSummary: string;
  aiSearchQueries?: string[];
  aiSearchPlanCheckedAt?: string;
  radarAxes?: string[];
};

export type ExperienceLevel = "debutant_reconversion" | "junior" | "confirme" | "indifferent";
export type ContractPreference = "any" | "cdi" | "cdd" | "alternance";
export type RequirementMode = "off" | "prefer" | "required";
export type AIMode = "ai_top10" | "ai_full" | "local";
export type DecisionFit = "match" | "review" | "weak";
export type CompanyProfileStatus = "idle" | "loading" | "found" | "partial" | "not_found" | "error";
export type CompanyProfileConfidence = "faible" | "moyenne" | "bonne";
export type AIReviewStatus = "idle" | "loading" | "done" | "error" | "skipped";

export type JobProfile = {
  id: string;
  label: string;
  defaultTargetJob: string;
  ui: {
    strategicRequirementLabel: string;
    strategicScoreLabel: string;
    trajectoryScoreLabel: string;
    strategicMissingLabel: string;
    strategicRequiredMissingLabel: string;
    strategicDetectedLabel: string;
  };
  search: {
    triggerTerms: string[];
    smartVariants: string[];
    beginnerVariants: string[];
    juniorVariants: string[];
    confirmedVariants: string[];
    requiredStrategicTerms: string[];
    requiredStrategicFallback: string;
    shortReplacements: Array<{ from: RegExp; to: string }>;
  };
  analysis: {
    titleFallbacks: Array<{ terms: string[]; title: string }>;
    genericTitles: string[];
    companySearchContext: string;
    knownStructureTerms: string[];
    strategicTerms: string[];
    trajectoryTerms: string[];
    questions: {
      poeiKnown: string;
      trainingKnown: string;
      trainingMissing: string;
      strategicKnown: string;
      strategicMissing: string;
    };
    applicationAngles: {
      strategic: string;
      default: string;
    };
  };
};

export type CompanyProfile = {
  status: CompanyProfileStatus;
  companyName: string;
  estimatedType: string;
  website: string;
  signals: string[];
  confidence: CompanyProfileConfidence;
  summary: string;
  checkedAt: string;
  sources: string[];
  employerRating?: EmployerRating;
};

export type EmployerRating = {
  score: number | null;
  label: string;
  source: string;
  sourceUrl: string;
  confidence: CompanyProfileConfidence;
  summary: string;
  checkedAt: string;
};

export type EmployerRankingItem = {
  company: string;
  companyType: string;
  score: number;
  salaryLabel: string;
  salaryMonthlyNet: number;
  benefits: string[];
  benefitsCount: number;
  rating: EmployerRating;
  offerCount: number;
  bestJobId: string;
  bestTitle: string;
  reasons: string[];
  warnings: string[];
};

export type EmployerRankingResult = {
  status: "done" | "partial" | "error";
  checkedAt: string;
  message: string;
  items: EmployerRankingItem[];
};

export type JobRecord = {
  id: string;
  rawText: string;
  createdAt: string;
  updatedAt?: string;
  favorite: boolean;
  ignored: boolean;
  reviewStatus?: ReviewStatus;
  searchBatchId?: string;
  source?: string;
  sourceId?: string;
  sourceUrl?: string;
  alsoFoundOn?: string[];
  searchUrl?: string;
  datasetLabel?: string;
  extractionQuality?: "complète" | "partielle" | "à vérifier";
  extractionNotes?: string[];
  manualExtraction?: ManualExtraction;
  extractionReview?: ExtractionReviewStatus;
  companyProfile?: CompanyProfile;
  aiReview?: AIReview;
  expectedReview?: ExpectedReview;
};

export type CompanyEnrichment = {
  siren?: string;
  name?: string;
  sigle?: string;
  employeesLabel?: string;
  createdAt?: string;
  naf?: string;
  sector?: string;
  legalForm?: string;
  city?: string;
  postalCode?: string;
};

export type ManualExtraction = {
  title?: string;
  company?: string;
  location?: string;
  contract?: string;
  workTime?: string;
  salary?: string;
  bonus?: string;
  bonusEstimate?: string;
  requiredExperience?: string;
  benefits?: string;
  updatedAt?: string;
};

export type ExtractionReviewStatus = "ok" | "needs_review" | "manual";

export type AIExtraction = {
  title?: string;
  company?: string;
  location?: string;
  contract?: string;
  workTime?: string;
  salary?: string;
  salaryKind?: "brut" | "net" | "non précisé";
  bonus?: string;
  bonusEstimate?: string;
  requiredExperience?: string;
  benefits?: string;
  poeiSignal?: boolean;
  auditSignal?: boolean;
  independentSignal?: boolean;
};

export type AIQualityStatus = "ok" | "verify" | "conflict";

export type AIQualityFieldCheck = {
  field: string;
  status: AIQualityStatus;
  currentValue: string;
  suggestedValue: string;
  reason: string;
};

export type AIQualityCheck = {
  status: AIQualityStatus;
  confidence: ScoreConfidence;
  fieldChecks: AIQualityFieldCheck[];
  warnings: string[];
  suggestedCorrections: AIQualityFieldCheck[];
};

export type AIDecisionVerdict = "bonne_piste" | "a_creuser" | "risque" | "hors_cible";

export type AIApplicationPrep = {
  callAngle: string;
  message: string;
  checkpoints: string[];
};

export type Top3AIComparison = {
  jobIds: string[];
  strategyHash: string;
  checkedAt: string;
  whyFirst: string;
  riskierOffer: string;
  callFirst: string;
  actionSummary: string;
};

export type ControlledExtractionSource = "manual" | "structured" | "ai" | "local";

export type ControlledExtractionField = {
  field: string;
  value: string;
  source: ControlledExtractionSource;
  quality: AIQualityStatus;
  suggestedValue?: string;
  reason?: string;
};

export type ControlledExtractionValues = {
  title: string;
  company: string;
  location: string;
  contract: string;
  workTime: string;
  salary: string;
  salaryKind: "brut" | "net" | "non précisé";
  bonus: string;
  bonusEstimate: string;
  requiredExperience: string;
  benefits: string;
};

export type ControlledExtraction = {
  values: ControlledExtractionValues;
  fields: Record<keyof ControlledExtractionValues, ControlledExtractionField>;
  alerts: ControlledExtractionField[];
};

export type SalaryNormalization = {
  source: string;
  period: "mensuel" | "annuel" | "horaire" | "inconnu";
  salaryKind: "brut" | "net" | "non précisé";
  fixedMin?: number;
  fixedMax?: number;
  weeklyHours?: number;
  monthlyNetMin?: number;
  monthlyNetMax?: number;
  annualNetMin?: number;
  annualNetMax?: number;
  annualGrossMin?: number;
  annualGrossMax?: number;
  hourlyNetMin?: number;
  hourlyNetMax?: number;
  hourlyGrossMin?: number;
  hourlyGrossMax?: number;
  bonusAnnualNetMin?: number;
  bonusAnnualNetMax?: number;
  packageMonthlyNetMin?: number;
  packageMonthlyNetMax?: number;
  packageHourlyNetMin?: number;
  packageHourlyNetMax?: number;
  fixedLabel?: string;
  hourlyLabel?: string;
  bonusLabel?: string;
  packageLabel?: string;
  label: string;
  confidence: ScoreConfidence;
  notes: string[];
};

export type AIReview = {
  status: AIReviewStatus;
  provider?: string;
  model?: string;
  checkedAt?: string;
  rawTextHash?: string;
  strategyHash?: string;
  extraction?: AIExtraction;
  summary?: string;
  strengths?: string[];
  blockers?: string[];
  uncertainties?: string[];
  questions?: string[];
  decisionVerdict?: AIDecisionVerdict;
  decisionReasons?: string[];
  recruiterQuestions?: string[];
  applicationPrep?: AIApplicationPrep;
  aiRankScore?: number;
  aiRankReasons?: string[];
  salaryRankScore?: number;
  salaryRankReasons?: string[];
  salaryComparableLabel?: string;
  salaryWarnings?: string[];
  scoreAdjustment?: number;
  scoreReasons?: string[];
  confidence?: ScoreConfidence;
  qualityCheck?: AIQualityCheck;
  errorMessage?: string;
  customAxesScores?: Record<string, number>;
};

export type ReviewStatus = "a_traiter" | "a_creuser" | "favori" | "ignoree";

export type SearchProviderStatus = "idle" | "searching" | "needsConnector" | "readyWithLocalOffers" | "error";

export type SourceReport = {
  source: string;
  count: number;
  message: string;
  status?: string;
  skippedCount?: number;
  foundCount?: number;
  detailLinkCount?: number;
  missingDetailCount?: number;
  poorQualityCount?: number;
  requiredFilterCount?: number;
  networkErrorCount?: number;
};

export type NetworkStatus = "ok" | "partial" | "blocked" | "error";

export type NetworkDiagnosticsSource = {
  source: string;
  url: string;
  ok: boolean;
  status?: number;
  durationMs: number;
  error?: string;
  message: string;
};

export type NetworkDiagnosticsResult = {
  status: NetworkStatus;
  checkedAt: string;
  message: string;
  sources: NetworkDiagnosticsSource[];
};

export type SourceHealthSnapshot = {
  checkedAt: string;
  count: number;
  skippedCount: number;
  blocked: boolean;
  foundCount: number;
  detailLinkCount: number;
  missingDetailCount: number;
  poorQualityCount: number;
  requiredFilterCount: number;
};

export type SourceHealthRecord = {
  source: string;
  searches: number;
  importedCount: number;
  skippedCount: number;
  blockedCount: number;
  foundCount: number;
  detailLinkCount: number;
  missingDetailCount: number;
  poorQualityCount: number;
  requiredFilterCount: number;
  qualityScoreTotal: number;
  qualityScoreCount: number;
  lastStatus: string;
  lastMessage: string;
  lastSearchedAt: string;
  history: SourceHealthSnapshot[];
};

export type SourceHealthStats = Record<string, SourceHealthRecord>;

export type SearchSession = {
  id: string;
  createdAt: string;
  keywords: string;
  location: string;
  sourceReports: SourceReport[];
  importedCount: number;
  duplicateCount: number;
  skippedCount: number;
};

export type SearchProviderResult = {
  source: string;
  sourceQuery: string;
  status: SearchProviderStatus;
  offers: string[];
  jobs?: JobRecord[];
  sourceReports?: SourceReport[];
  skippedCount?: number;
  networkStatus?: NetworkStatus;
  networkMessage?: string;
  message: string;
};

export type JobSearchProvider = {
  search(strategy: Strategy, existingJobs: JobRecord[], draftText: string): SearchProviderResult | Promise<SearchProviderResult>;
};

export type ScoreAxis = "formationFacilitee" | "salaryPackage" | "trajectory" | "employer" | "risk" | "ai";

export type ScoreLine = {
  label: string;
  value: number;
  axis?: ScoreAxis;
};

export type RiskLevel = "faible" | "modéré" | "élevé";
export type ScoreConfidence = "faible" | "moyenne" | "bonne";
export type ExpectedVerdict = "prioritaire" | "à creuser" | "piège" | "hors trajectoire" | "";
export type ValidationTag =
  | "POEI"
  | "formation facilitée"
  | "formation"
  | "audit"
  | "indépendant"
  | "salaire flou"
  | "débutant accepté"
  | "volume";

export type ExpectedExtraction = {
  title?: string;
  company?: string;
  location?: string;
  contract?: string;
  salary?: string;
  workTime?: string;
};

export type ExpectedReview = {
  expectedVerdict: ExpectedVerdict;
  expectedTags: ValidationTag[];
  expectedExtraction?: ExpectedExtraction;
  notes: string;
};

export type OfferType =
  | "Offre tremplin"
  | "Offre cashflow"
  | "Offre stratégique"
  | "Offre piège"
  | "Offre hors trajectoire"
  | "A creuser";

export type JobAnalysis = {
  id: string;
  title: string;
  normalizedTitle: string;
  company: string;
  companyType: string;
  companySearchUrl: string;
  location: string;
  contract: string;
  workTime: string;
  salary: string;
  normalizedSalary: SalaryNormalization;
  salaryKind: "brut" | "net" | "non précisé";
  bonus: string;
  bonusEstimate: string;
  requiredExperience: string;
  experienceFit: "reconversion_ok" | "junior" | "confirme" | "unknown";
  benefits: string;
  summary: string;
  verdict: string;
  verdictReasons: string[];
  offerType: OfferType;
  riskLevel: RiskLevel;
  localScore: number;
  aiScoreAdjustment: number;
  aiScoreReasons: string[];
  scores: {
    global: number;
    formationFacilitee: number;
    salaryPackage: number;
    training: number;
    cashflow: number;
    trajectory: number;
    employer: number;
    audit: number;
    risk: number;
  };
  positiveSignals: string[];
  redFlags: string[];
  uncertainties: string[];
  questions: string[];
  applicationAngle: string;
  scoreLines: ScoreLine[];
  scoreConfidence: ScoreConfidence;
  confidenceReasons: string[];
  rawText: string;
  customAxesScores?: Record<string, number>;
};

export type ValidationComparison = {
  match: boolean;
  verdictMatch: boolean | null;
  detectedTags: ValidationTag[];
  missedTags: ValidationTag[];
  extraTags: ValidationTag[];
  extractionFieldMatches: {
    field: keyof ExpectedExtraction;
    label: string;
    expected: string;
    actual: string;
    match: boolean;
  }[];
  missedExtractionFields: string[];
  scoreWarning: string | null;
  actualVerdict: Exclude<ExpectedVerdict, "">;
};
