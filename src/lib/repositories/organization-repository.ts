/**
 * Future repository seam. Phase 0–1 has no organization store yet.
 * PostgreSQL can implement this interface later without rewriting callers.
 */
export type OrganizationId = string;

export type OrganizationSummary = {
  id: OrganizationId;
  displayName: string;
  verticalId: string;
  dataClass: "synthetic";
};

export interface OrganizationRepository {
  listSummaries(tenantId: string): Promise<readonly OrganizationSummary[]>;
  getById(tenantId: string, id: OrganizationId): Promise<OrganizationSummary | null>;
}

export class NotImplementedOrganizationRepository implements OrganizationRepository {
  async listSummaries(): Promise<readonly OrganizationSummary[]> {
    return [];
  }

  async getById(): Promise<OrganizationSummary | null> {
    return null;
  }
}
