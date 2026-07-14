import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { assertPermission } from "@/authorization/context";
import { NotFoundError, ValidationError } from "@/domain/errors";
import type { OrganizationId, ProvenanceId } from "@/domain/ids";
import { OrganizationIdSchema, ProvenanceIdSchema } from "@/domain/ids";
import type { Organization } from "@/domain/schemas/organization";
import type { EvidenceRecord } from "@/domain/schemas/evidence";
import type { ProvenanceRecord } from "@/domain/schemas/provenance";
import type { Capability } from "@/domain/schemas/capability";
import {
  CapabilityQuerySchema,
  DEFAULT_PAGE_SIZE,
  EvidenceQuerySchema,
  MAX_PAGE_SIZE,
  normalizeSearchText,
  OrganizationQuerySchema,
  type OrganizationQuery,
  type OrganizationQueryInput,
  type OrganizationSortField,
} from "@/domain/schemas/query";
import { assertOrganizationFitUnassessed } from "@/domain/invariants";
import {
  OrganizationPublicRefSchema,
  organizationPublicRefFor,
  type OrganizationPublicRef,
} from "@/domain/organization-public-ref";
import { resolveAdapter } from "@/verticals/registry";
import type { OrganizationRepository, PagedResult } from "@/repositories/organization-repository";

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

function compareValues(a: string, b: string, direction: "asc" | "desc"): number {
  const result = a < b ? -1 : a > b ? 1 : 0;
  return direction === "asc" ? result : -result;
}

function sortOrganizations(
  items: Organization[],
  sortField: OrganizationSortField,
  sortDirection: "asc" | "desc",
): Organization[] {
  return [...items].sort((left, right) => {
    const primary = compareValues(String(left[sortField]), String(right[sortField]), sortDirection);
    if (primary !== 0) return primary;
    return compareValues(left.id, right.id, "asc");
  });
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

export type SyntheticStore = {
  organizations: readonly Organization[];
  evidence: readonly EvidenceRecord[];
  provenance: readonly ProvenanceRecord[];
  capabilities: readonly Capability[];
  fixtureVersion: string;
};

export function loadFinancialInstitutionsStore(): SyntheticStore {
  const adapter = resolveAdapter("financial_institutions", "1.0.0");
  const fixtures = adapter.loadSyntheticFixtures();
  for (const org of fixtures.organizations) {
    assertOrganizationFitUnassessed(org.fit.status);
    if (org.tenantId !== fixtures.organizations[0]?.tenantId) {
      throw new ValidationError("Fixture tenant mismatch.");
    }
  }
  return {
    organizations: Object.freeze(fixtures.organizations.map((item) => deepFreeze({ ...item }))),
    evidence: Object.freeze(fixtures.evidence.map((item) => deepFreeze({ ...item }))),
    provenance: Object.freeze(fixtures.provenance.map((item) => deepFreeze({ ...item }))),
    capabilities: Object.freeze(fixtures.capabilities.map((item) => deepFreeze({ ...item }))),
    fixtureVersion: fixtures.fixtureVersion,
  };
}

export class SyntheticOrganizationRepository implements OrganizationRepository {
  private readonly store: SyntheticStore;

  constructor(store: SyntheticStore = loadFinancialInstitutionsStore()) {
    this.store = store;
  }

  private scopedOrganizations(context: AuthorizationContext): Organization[] {
    return this.store.organizations.filter((org) => org.tenantId === context.tenant.id);
  }

  private filterOrganizations(
    context: AuthorizationContext,
    query: OrganizationQuery,
  ): Organization[] {
    assertPermission(context, "organization:read");

    if (query.pageSize > MAX_PAGE_SIZE) {
      throw new ValidationError(`pageSize must be <= ${MAX_PAGE_SIZE}.`);
    }

    const text = normalizeSearchText(query.text);
    let adapter = null as ReturnType<typeof resolveAdapter> | null;
    let verticalFilters: Record<string, unknown> = {};

    if (query.verticalId || query.verticalFilters) {
      const verticalId = query.verticalId ?? "financial_institutions";
      // Filters require an explicit adapter version from stored records — use active only for filter schema.
      adapter = resolveAdapter(verticalId, "1.0.0");
      verticalFilters = adapter.validateVerticalFilters(query.verticalFilters);
    } else if (query.verticalFilters && Object.keys(query.verticalFilters).length > 0) {
      throw new ValidationError("verticalFilters require verticalId.");
    }

    let results = this.scopedOrganizations(context);

    if (query.verticalId) {
      results = results.filter((org) => org.verticalId === query.verticalId);
    }
    if (query.organizationType) {
      results = results.filter((org) => org.organizationType === query.organizationType);
    }
    if (query.lifecycleStatus) {
      results = results.filter((org) => org.lifecycleStatus === query.lifecycleStatus);
    }
    if (query.synthetic !== undefined) {
      results = results.filter((org) => org.synthetic === query.synthetic);
    }
    if (query.tags?.length) {
      results = results.filter((org) => query.tags!.every((tag) => org.tags.includes(tag)));
    }
    if (text) {
      const needle = text.toLowerCase();
      results = results.filter(
        (org) =>
          org.displayName.toLowerCase().includes(needle) ||
          org.summary.toLowerCase().includes(needle),
      );
    }

    if (adapter && Object.keys(verticalFilters).length > 0) {
      const freshnessCategory = verticalFilters.freshnessCategory;
      results = results.filter((org) => {
        if (!adapter!.matchesVerticalFilters(org, verticalFilters)) return false;
        if (typeof freshnessCategory === "string") {
          const orgEvidence = this.store.evidence.filter(
            (item) => item.organizationId === org.id && item.tenantId === context.tenant.id,
          );
          return orgEvidence.some((item) => item.freshness === freshnessCategory);
        }
        return true;
      });
    }

    return sortOrganizations(results, query.sortField, query.sortDirection);
  }

  async getById(
    context: AuthorizationContext,
    organizationId: OrganizationId,
  ): Promise<Organization> {
    assertPermission(context, "organization:read");
    let id: OrganizationId;
    try {
      id = OrganizationIdSchema.parse(organizationId);
    } catch {
      throw new ValidationError("Invalid organization id.");
    }

    const found = this.store.organizations.find((org) => org.id === id);
    if (!found || found.tenantId !== context.tenant.id) {
      // Fail closed — do not reveal cross-tenant existence.
      throw new NotFoundError("Resource not found.");
    }
    return cloneFrozen(found);
  }

  async getByPublicRef(
    context: AuthorizationContext,
    organizationRef: OrganizationPublicRef,
  ): Promise<Organization> {
    assertPermission(context, "organization:read");
    const parsed = OrganizationPublicRefSchema.safeParse(organizationRef);
    if (!parsed.success) {
      throw new NotFoundError("Resource not found.");
    }

    const found = this.scopedOrganizations(context).find(
      (organization) => organizationPublicRefFor(organization.id) === parsed.data,
    );
    if (!found) {
      throw new NotFoundError("Resource not found.");
    }
    return cloneFrozen(found);
  }

  async list(
    context: AuthorizationContext,
    rawQuery: OrganizationQueryInput,
  ): Promise<PagedResult<Organization>> {
    const query = OrganizationQuerySchema.parse(rawQuery);
    const filtered = this.filterOrganizations(context, query);
    return paginate(filtered, query.page, query.pageSize);
  }

  async count(context: AuthorizationContext, rawQuery: OrganizationQueryInput): Promise<number> {
    const query = OrganizationQuerySchema.parse({
      ...rawQuery,
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });
    return this.filterOrganizations(context, query).length;
  }

  async listEvidence(
    context: AuthorizationContext,
    organizationId: OrganizationId,
    rawQuery: unknown,
  ): Promise<PagedResult<EvidenceRecord>> {
    assertPermission(context, "evidence:read");
    const query = EvidenceQuerySchema.parse(rawQuery);
    // Ensures org is visible to this tenant (or not-found without leak).
    await this.getById(context, organizationId);

    let items = this.store.evidence.filter(
      (item) => item.organizationId === organizationId && item.tenantId === context.tenant.id,
    );
    if (!context.permissions.includes("evidence:restricted_read")) {
      items = items.filter(
        (item) =>
          item.publicationEligibility !== "restricted" && item.dataClassification !== "restricted",
      );
    }
    if (query.freshness) {
      items = items.filter((item) => item.freshness === query.freshness);
    }
    items = [...items].sort((a, b) => compareValues(a.id, b.id, "asc"));
    return paginate(items, query.page, query.pageSize);
  }

  async getProvenance(
    context: AuthorizationContext,
    provenanceId: ProvenanceId,
  ): Promise<ProvenanceRecord> {
    assertPermission(context, "evidence:read");
    let id: ProvenanceId;
    try {
      id = ProvenanceIdSchema.parse(provenanceId);
    } catch {
      throw new ValidationError("Invalid provenance id.");
    }
    const found = this.store.provenance.find((item) => item.id === id);
    if (!found || found.tenantId !== context.tenant.id) {
      throw new NotFoundError("Resource not found.");
    }
    if (
      found.accessClassification === "restricted" &&
      !context.permissions.includes("evidence:restricted_read")
    ) {
      throw new NotFoundError("Resource not found.");
    }
    return cloneFrozen(found);
  }

  async listCapabilities(
    context: AuthorizationContext,
    rawQuery: unknown,
  ): Promise<PagedResult<Capability>> {
    assertPermission(context, "methodology:read");
    const query = CapabilityQuerySchema.parse(rawQuery);
    let items = this.store.capabilities.filter((item) => item.tenantId === context.tenant.id);
    if (query.verticalId) {
      items = items.filter((item) => item.verticalId === query.verticalId);
    }
    items = [...items].sort((a, b) => compareValues(a.id, b.id, "asc"));
    return paginate(items, query.page, query.pageSize);
  }
}
