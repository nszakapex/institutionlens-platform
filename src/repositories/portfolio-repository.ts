import type { AuthorizationContext } from "@/authorization/context";
import type { PortfolioId } from "@/domain/ids";
import type { CapabilityPortfolio } from "@/domain/portfolios/schemas";
import type { PortfolioListQueryInput } from "@/domain/schemas/query";
import type { PagedResult } from "@/repositories/organization-repository";

/**
 * Tenant-safe capability portfolio repository.
 * Every operation requires AuthorizationContext — never a bare tenantId.
 */
export interface PortfolioRepository {
  getById(context: AuthorizationContext, portfolioId: PortfolioId): Promise<CapabilityPortfolio>;
  list(
    context: AuthorizationContext,
    query: PortfolioListQueryInput,
  ): Promise<PagedResult<CapabilityPortfolio>>;
}
