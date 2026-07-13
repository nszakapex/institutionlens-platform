import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { assertPermission } from "@/authorization/context";
import type { PortfolioSummaryView } from "@/application/assessment-view-models";
import type { PortfolioId } from "@/domain/ids";
import { SyntheticPortfolioRepository } from "@/repositories/synthetic-portfolio-repository";

/**
 * Thin portfolio read for methodology / foundation surfaces.
 */
export async function getPortfolioSummary(
  context: AuthorizationContext,
  portfolioId: PortfolioId,
  repository: SyntheticPortfolioRepository = new SyntheticPortfolioRepository(),
): Promise<PortfolioSummaryView> {
  assertPermission(context, "methodology:read");
  const portfolio = await repository.getById(context, portfolioId);
  const enabledCapabilityCount = portfolio.capabilities.filter(
    (item) => item.status === "enabled",
  ).length;

  return {
    name: portfolio.name,
    description: portfolio.description,
    status: portfolio.status,
    capabilityCount: portfolio.capabilities.length,
    enabledCapabilityCount,
    synthetic: true,
  };
}
