export type MethodologyRuleView = {
  title: string;
  factorCategoryLabel: string;
  rationale: string;
  maximumPoints: number;
  evidenceRequirements: readonly string[];
  requiresValidatedProvenance: boolean;
  missingEvidencePolicy: string;
  staleEvidencePolicy: string;
  restrictedEvidencePolicy: string;
  methodologyNotes: string;
  enabled: boolean;
};

export type MethodologyCapabilityView = {
  name: string;
  description: string;
  category: string;
  priority: number;
  rulePointTotal: number;
  declaredMaximumPoints: number;
  requiredGates: readonly {
    description: string;
    requiredEvidenceTypes: readonly string[];
  }[];
  rules: readonly MethodologyRuleView[];
};

export type MethodologyPageView = {
  state: "ready" | "unauthorized" | "unavailable" | "error";
  stateMessage?: string;
  verticalLabel: string;
  syntheticNotice: string;
  heuristicDisclaimer: string;
  manifest: {
    engineVersion: string;
    domainSchemaVersion: string;
    adapterVersion: string;
    methodologyVersion: string;
    catalogVersion: string;
    portfolioVersion: string;
    overlaySetVersion: string;
    assessedAt: string;
    synthetic: true;
  };
  capabilities: readonly MethodologyCapabilityView[];
  thresholds: {
    bandThresholds: readonly {
      label: string;
      min: number;
      max: number;
    }[];
    confidenceThresholds: readonly {
      label: string;
      value: string;
    }[];
  };
  policies: {
    completenessPolicy: readonly string[];
    aggregationPolicy: readonly string[];
    confidencePolicy: readonly string[];
    freshnessPolicy: readonly string[];
    conditionalScoreBehavior: string;
    opportunityRulesSummary: string;
    publicationPolicy: readonly string[];
    humanReviewRequirement: string;
  };
  disclaimers: readonly string[];
};
