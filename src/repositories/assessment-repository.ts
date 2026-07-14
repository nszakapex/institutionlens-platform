import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import type { AssessmentId, CapabilityId, OrganizationId } from "@/domain/ids";
import type { AssessmentManifest } from "@/domain/assessments/manifest";
import type { RuleLedgerEntry } from "@/domain/assessments/ledger";
import type {
  CapabilityAssessment,
  OpportunityContext,
  PortfolioAssessment,
} from "@/domain/assessments/results";
import type { AssessmentListQueryInput } from "@/domain/schemas/query";
import type { PagedResult } from "@/repositories/organization-repository";

/**
 * Tenant-safe assessment repository.
 * Every operation requires AuthorizationContext — never a bare tenantId.
 * Bounded lists with stable sort; cross-tenant access fails closed without existence disclosure.
 */
export interface AssessmentRepository {
  getCapabilityAssessment(
    context: AuthorizationContext,
    assessmentId: AssessmentId,
  ): Promise<CapabilityAssessment>;

  listCapabilityAssessments(
    context: AuthorizationContext,
    query: AssessmentListQueryInput,
  ): Promise<PagedResult<CapabilityAssessment>>;

  getPortfolioAssessment(
    context: AuthorizationContext,
    assessmentId: AssessmentId,
  ): Promise<PortfolioAssessment>;

  listPortfolioAssessments(
    context: AuthorizationContext,
    query: AssessmentListQueryInput,
  ): Promise<PagedResult<PortfolioAssessment>>;

  getAssessmentLedger(
    context: AuthorizationContext,
    assessmentId: AssessmentId,
  ): Promise<readonly RuleLedgerEntry[]>;

  getAssessmentManifest(
    context: AuthorizationContext,
    assessmentId: AssessmentId,
  ): Promise<AssessmentManifest>;

  getOpportunityContext(
    context: AuthorizationContext,
    organizationId: OrganizationId,
    capabilityId: CapabilityId,
  ): Promise<OpportunityContext>;
}
