import "server-only";

import type { RepositoryBundle } from "@/repositories/repository-contracts";
import { SyntheticAssessmentRepository } from "@/repositories/synthetic-assessment-repository";
import { SyntheticOrganizationRepository } from "@/repositories/synthetic-organization-repository";
import { SyntheticOverlayRepository } from "@/repositories/synthetic-overlay-repository";
import { SyntheticPortfolioRepository } from "@/repositories/synthetic-portfolio-repository";
import {
  SyntheticBriefSnapshotRepository,
  SyntheticSavedComparisonRepository,
} from "@/repositories/synthetic-saved-repositories";
import { SyntheticWorkspaceRepository } from "@/repositories/synthetic-workspace-repository";

/** Creates a fresh bundle; no authorization decision or tenant data is cached here. */
export function createSyntheticRepositoryBundle(): RepositoryBundle {
  return Object.freeze({
    adapter: "synthetic",
    workspace: new SyntheticWorkspaceRepository(),
    organizations: new SyntheticOrganizationRepository(),
    assessments: new SyntheticAssessmentRepository(),
    portfolios: new SyntheticPortfolioRepository(),
    overlays: new SyntheticOverlayRepository(),
    comparisons: new SyntheticSavedComparisonRepository(),
    briefSnapshots: new SyntheticBriefSnapshotRepository(),
  });
}
