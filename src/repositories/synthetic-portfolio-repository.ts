import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { assertPermission } from "@/authorization/context";
import { NotFoundError, ValidationError } from "@/domain/errors";
import type { PortfolioId } from "@/domain/ids";
import { PortfolioIdSchema } from "@/domain/ids";
import type { CapabilityPortfolio } from "@/domain/portfolios/schemas";
import {
  MAX_PAGE_SIZE,
  PortfolioListQuerySchema,
  type PortfolioListQueryInput,
} from "@/domain/schemas/query";
import type { PagedResult } from "@/repositories/organization-repository";
import type { PortfolioRepository } from "@/repositories/portfolio-repository";
import { SYNTHETIC_FI_PORTFOLIO } from "@/verticals/financial-institutions/assessment/synthetic-portfolio";

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

const PORTFOLIOS: readonly CapabilityPortfolio[] = Object.freeze([
  deepFreeze(structuredClone(SYNTHETIC_FI_PORTFOLIO)),
]);

export class SyntheticPortfolioRepository implements PortfolioRepository {
  async getById(
    context: AuthorizationContext,
    portfolioId: PortfolioId,
  ): Promise<CapabilityPortfolio> {
    assertPermission(context, "methodology:read");
    let id: PortfolioId;
    try {
      id = PortfolioIdSchema.parse(portfolioId);
    } catch {
      throw new ValidationError("Invalid portfolio id.");
    }

    const found = PORTFOLIOS.find((item) => item.id === id);
    if (!found || found.tenantId !== context.tenant.id) {
      throw new NotFoundError("Resource not found.");
    }
    return cloneFrozen(found);
  }

  async list(
    context: AuthorizationContext,
    rawQuery: PortfolioListQueryInput,
  ): Promise<PagedResult<CapabilityPortfolio>> {
    assertPermission(context, "methodology:read");
    const query = PortfolioListQuerySchema.parse(rawQuery);
    if (query.pageSize > MAX_PAGE_SIZE) {
      throw new ValidationError(`pageSize must be <= ${MAX_PAGE_SIZE}.`);
    }

    const items = PORTFOLIOS.filter((item) => item.tenantId === context.tenant.id)
      .slice()
      .sort((a, b) => compareIds(a.id, b.id));

    return paginate(items, query.page, query.pageSize);
  }
}
