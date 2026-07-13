import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { assertPermission } from "@/authorization/context";
import { NotFoundError, ValidationError } from "@/domain/errors";
import type { AssessmentId, CapabilityId, OrganizationId } from "@/domain/ids";
import { AssessmentIdSchema, CapabilityIdSchema, OrganizationIdSchema } from "@/domain/ids";
import type { AssessmentManifest } from "@/domain/assessments/manifest";
import type { RuleLedgerEntry } from "@/domain/assessments/ledger";
import type {
  CapabilityAssessment,
  OpportunityContext,
  PortfolioAssessment,
} from "@/domain/assessments/results";
import {
  AssessmentListQuerySchema,
  MAX_PAGE_SIZE,
  type AssessmentListQueryInput,
} from "@/domain/schemas/query";
import type { PagedResult } from "@/repositories/organization-repository";
import type { AssessmentRepository } from "@/repositories/assessment-repository";
import {
  generateSyntheticAssessments,
  type SyntheticAssessmentBundle,
} from "@/verticals/financial-institutions/assessment/generate";

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    if (child && typeof child === "object" && !Object.isFrozen(child)) {
      deepFreeze(child);
    }
  }
  return value;
}

function cloneFrozen<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function paginate<T>(items: readonly T[], page: number, pageSize: number): PagedResult<T> {
  const start = (page - 1) * pageSize;
  return {
    items: Object.freeze(items.slice(start, start + pageSize).map((item) => cloneFrozen(item))),
    page,
    pageSize,
    total: items.length,
  };
}

/** Module-level lazy cache — generated once, then frozen for the process lifetime. */
let cachedBundle: SyntheticAssessmentBundle | null = null;

function loadBundle(): SyntheticAssessmentBundle {
  if (!cachedBundle) {
    cachedBundle = deepFreeze(generateSyntheticAssessments());
  }
  return cachedBundle;
}

type IndexedStore = {
  capabilityById: ReadonlyMap<string, CapabilityAssessment>;
  portfolioById: ReadonlyMap<string, PortfolioAssessment>;
  portfolioByOrg: ReadonlyMap<string, PortfolioAssessment>;
  manifestByAssessmentId: ReadonlyMap<string, AssessmentManifest>;
  capabilityAssessments: readonly CapabilityAssessment[];
  portfolioAssessments: readonly PortfolioAssessment[];
};

function indexBundle(bundle: SyntheticAssessmentBundle): IndexedStore {
  const capabilityById = new Map<string, CapabilityAssessment>();
  const portfolioById = new Map<string, PortfolioAssessment>();
  const portfolioByOrg = new Map<string, PortfolioAssessment>();
  const manifestByAssessmentId = new Map<string, AssessmentManifest>();
  const capabilityAssessments: CapabilityAssessment[] = [];
  const portfolioAssessments: PortfolioAssessment[] = [];

  for (const org of bundle.organizations) {
    for (const assessment of org.capabilityAssessments) {
      capabilityById.set(assessment.id, assessment);
      capabilityAssessments.push(assessment);
    }
    portfolioById.set(org.portfolioAssessment.id, org.portfolioAssessment);
    portfolioByOrg.set(org.organizationId, org.portfolioAssessment);
    portfolioAssessments.push(org.portfolioAssessment);
    for (const manifest of org.manifests) {
      manifestByAssessmentId.set(manifest.assessmentId, manifest);
    }
  }

  return {
    capabilityById,
    portfolioById,
    portfolioByOrg,
    manifestByAssessmentId,
    capabilityAssessments: Object.freeze(
      capabilityAssessments.slice().sort((a, b) => compareIds(a.id, b.id)),
    ),
    portfolioAssessments: Object.freeze(
      portfolioAssessments.slice().sort((a, b) => compareIds(a.id, b.id)),
    ),
  };
}

let cachedIndex: IndexedStore | null = null;

function loadIndex(): IndexedStore {
  if (!cachedIndex) {
    cachedIndex = indexBundle(loadBundle());
  }
  return cachedIndex;
}

export function __resetSyntheticAssessmentIndexForTests(): void {
  cachedBundle = null;
  cachedIndex = null;
}

export class SyntheticAssessmentRepository implements AssessmentRepository {
  private store(): IndexedStore {
    return loadIndex();
  }

  async getCapabilityAssessment(
    context: AuthorizationContext,
    assessmentId: AssessmentId,
  ): Promise<CapabilityAssessment> {
    assertPermission(context, "assessment:read");
    let id: AssessmentId;
    try {
      id = AssessmentIdSchema.parse(assessmentId);
    } catch {
      throw new ValidationError("Invalid assessment id.");
    }

    const found = this.store().capabilityById.get(id);
    if (!found || found.tenantId !== context.tenant.id) {
      throw new NotFoundError("Resource not found.");
    }
    return cloneFrozen(found);
  }

  async listCapabilityAssessments(
    context: AuthorizationContext,
    rawQuery: AssessmentListQueryInput,
  ): Promise<PagedResult<CapabilityAssessment>> {
    assertPermission(context, "assessment:read");
    const query = AssessmentListQuerySchema.parse(rawQuery);
    if (query.pageSize > MAX_PAGE_SIZE) {
      throw new ValidationError(`pageSize must be <= ${MAX_PAGE_SIZE}.`);
    }

    let items = this.store().capabilityAssessments.filter(
      (item) => item.tenantId === context.tenant.id,
    );

    if (query.organizationId) {
      let orgId: OrganizationId;
      try {
        orgId = OrganizationIdSchema.parse(query.organizationId);
      } catch {
        throw new ValidationError("Invalid organization id.");
      }
      items = items.filter((item) => item.organizationId === orgId);
    }

    if (query.capabilityId) {
      let capId: CapabilityId;
      try {
        capId = CapabilityIdSchema.parse(query.capabilityId);
      } catch {
        throw new ValidationError("Invalid capability id.");
      }
      items = items.filter((item) => item.capabilityId === capId);
    }

    return paginate(items, query.page, query.pageSize);
  }

  async getPortfolioAssessment(
    context: AuthorizationContext,
    assessmentId: AssessmentId,
  ): Promise<PortfolioAssessment> {
    assertPermission(context, "assessment:read");
    let id: AssessmentId;
    try {
      id = AssessmentIdSchema.parse(assessmentId);
    } catch {
      throw new ValidationError("Invalid assessment id.");
    }

    const found = this.store().portfolioById.get(id);
    if (!found || found.tenantId !== context.tenant.id) {
      throw new NotFoundError("Resource not found.");
    }
    return cloneFrozen(found);
  }

  async listPortfolioAssessments(
    context: AuthorizationContext,
    rawQuery: AssessmentListQueryInput,
  ): Promise<PagedResult<PortfolioAssessment>> {
    assertPermission(context, "assessment:read");
    const query = AssessmentListQuerySchema.parse(rawQuery);
    if (query.pageSize > MAX_PAGE_SIZE) {
      throw new ValidationError(`pageSize must be <= ${MAX_PAGE_SIZE}.`);
    }

    let items = this.store().portfolioAssessments.filter(
      (item) => item.tenantId === context.tenant.id,
    );

    if (query.organizationId) {
      let orgId: OrganizationId;
      try {
        orgId = OrganizationIdSchema.parse(query.organizationId);
      } catch {
        throw new ValidationError("Invalid organization id.");
      }
      items = items.filter((item) => item.organizationId === orgId);
    }

    return paginate(items, query.page, query.pageSize);
  }

  async getAssessmentLedger(
    context: AuthorizationContext,
    assessmentId: AssessmentId,
  ): Promise<readonly RuleLedgerEntry[]> {
    const assessment = await this.getCapabilityAssessment(context, assessmentId);
    return cloneFrozen(assessment.ledger);
  }

  async getAssessmentManifest(
    context: AuthorizationContext,
    assessmentId: AssessmentId,
  ): Promise<AssessmentManifest> {
    assertPermission(context, "assessment:read");
    let id: AssessmentId;
    try {
      id = AssessmentIdSchema.parse(assessmentId);
    } catch {
      throw new ValidationError("Invalid assessment id.");
    }

    const assessment = this.store().capabilityById.get(id);
    if (!assessment || assessment.tenantId !== context.tenant.id) {
      throw new NotFoundError("Resource not found.");
    }

    const manifest = this.store().manifestByAssessmentId.get(id);
    if (!manifest) {
      throw new NotFoundError("Resource not found.");
    }
    return cloneFrozen(manifest);
  }

  async getOpportunityContext(
    context: AuthorizationContext,
    organizationId: OrganizationId,
    capabilityId: CapabilityId,
  ): Promise<OpportunityContext> {
    assertPermission(context, "assessment:read");
    let orgId: OrganizationId;
    let capId: CapabilityId;
    try {
      orgId = OrganizationIdSchema.parse(organizationId);
      capId = CapabilityIdSchema.parse(capabilityId);
    } catch {
      throw new ValidationError("Invalid organization or capability id.");
    }

    const portfolio = this.store().portfolioByOrg.get(orgId);
    if (!portfolio || portfolio.tenantId !== context.tenant.id) {
      throw new NotFoundError("Resource not found.");
    }

    const match = portfolio.opportunityContexts.find((item) => item.capabilityId === capId);
    if (!match) {
      throw new NotFoundError("Resource not found.");
    }
    return cloneFrozen(match);
  }
}
