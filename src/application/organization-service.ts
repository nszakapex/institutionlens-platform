import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { assertPermission } from "@/authorization/context";
import type { OrganizationId } from "@/domain/ids";
import type {
  CapabilityQueryInput,
  EvidenceQueryInput,
  OrganizationQueryInput,
} from "@/domain/schemas/query";
import {
  toCapabilitySummaryView,
  toEvidenceSummaryView,
  toOrganizationSummaryView,
  type CapabilitySummaryView,
  type EvidenceSummaryView,
  type OrganizationSummaryView,
} from "@/domain/view-models";
import type { PagedResult } from "@/repositories/organization-repository";
import type { OrganizationRepository } from "@/repositories/organization-repository";
import { resolveAdapter } from "@/verticals/registry";

export class OrganizationService {
  constructor(private readonly repository: OrganizationRepository) {}

  async getSummary(
    context: AuthorizationContext,
    organizationId: OrganizationId,
  ): Promise<OrganizationSummaryView> {
    assertPermission(context, "organization:read");
    const org = await this.repository.getById(context, organizationId);
    const adapter = resolveAdapter(org.verticalId, org.adapterVersion);
    return toOrganizationSummaryView(org, adapter.organizationNoun);
  }

  async listSummaries(
    context: AuthorizationContext,
    query: OrganizationQueryInput,
  ): Promise<PagedResult<OrganizationSummaryView>> {
    assertPermission(context, "organization:read");
    const page = await this.repository.list(context, query);
    return {
      ...page,
      items: Object.freeze(
        page.items.map((org) => {
          const adapter = resolveAdapter(org.verticalId, org.adapterVersion);
          return toOrganizationSummaryView(org, adapter.organizationNoun);
        }),
      ),
    };
  }

  async listEvidenceSummaries(
    context: AuthorizationContext,
    organizationId: OrganizationId,
    query: EvidenceQueryInput,
  ): Promise<PagedResult<EvidenceSummaryView>> {
    assertPermission(context, "evidence:read");
    const page = await this.repository.listEvidence(context, organizationId, query);
    return {
      ...page,
      items: Object.freeze(page.items.map(toEvidenceSummaryView)),
    };
  }

  async listCapabilitySummaries(
    context: AuthorizationContext,
    query: CapabilityQueryInput,
  ): Promise<PagedResult<CapabilitySummaryView>> {
    assertPermission(context, "methodology:read");
    const page = await this.repository.listCapabilities(context, query);
    return {
      ...page,
      items: Object.freeze(page.items.map(toCapabilitySummaryView)),
    };
  }
}
