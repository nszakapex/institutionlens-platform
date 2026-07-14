import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { assertPermission } from "@/authorization/context";
import { NotFoundError } from "@/domain/errors";
import type { PagedResult } from "@/repositories/organization-repository";
import {
  BriefSnapshotListQuerySchema,
  BriefSnapshotPublicRefSchema,
  BriefSnapshotRecordSchema,
  SavedComparisonListQuerySchema,
  SavedComparisonPublicRefSchema,
  SavedComparisonRecordSchema,
  type BriefSnapshotListQueryInput,
  type BriefSnapshotRecord,
  type BriefSnapshotRepository,
  type SavedComparisonListQueryInput,
  type SavedComparisonRecord,
  type SavedComparisonRepository,
} from "@/repositories/repository-contracts";

function cloneFrozen<T>(value: T): T {
  const clone = structuredClone(value);
  function freezeDeep(current: unknown): void {
    if (current === null || typeof current !== "object" || Object.isFrozen(current)) return;
    Object.freeze(current);
    for (const child of Object.values(current as Record<string, unknown>)) freezeDeep(child);
  }
  freezeDeep(clone);
  return clone;
}

function paginate<T>(items: readonly T[], page: number, pageSize: number): PagedResult<T> {
  const start = (page - 1) * pageSize;
  return Object.freeze({
    items: Object.freeze(items.slice(start, start + pageSize).map(cloneFrozen)),
    page,
    pageSize,
    total: items.length,
  });
}

function compareStrings(left: string, right: string, direction: "asc" | "desc"): number {
  const result = left < right ? -1 : left > right ? 1 : 0;
  return direction === "asc" ? result : -result;
}

export class SyntheticSavedComparisonRepository implements SavedComparisonRepository {
  private readonly records: readonly SavedComparisonRecord[];

  constructor(records: readonly SavedComparisonRecord[] = []) {
    this.records = Object.freeze(
      records.map((record) => SavedComparisonRecordSchema.parse(record)),
    );
  }

  async getByPublicRef(
    context: AuthorizationContext,
    comparisonRef: SavedComparisonRecord["publicRef"],
  ): Promise<SavedComparisonRecord> {
    assertPermission(context, "organization:read");
    assertPermission(context, "assessment:read");
    const parsed = SavedComparisonPublicRefSchema.safeParse(comparisonRef);
    if (!parsed.success) throw new NotFoundError("Resource not found.");
    const found = this.records.find(
      (record) => record.tenantId === context.tenant.id && record.publicRef === parsed.data,
    );
    if (!found) throw new NotFoundError("Resource not found.");
    return cloneFrozen(found);
  }

  async list(
    context: AuthorizationContext,
    rawQuery: SavedComparisonListQueryInput,
  ): Promise<PagedResult<SavedComparisonRecord>> {
    assertPermission(context, "organization:read");
    assertPermission(context, "assessment:read");
    const query = SavedComparisonListQuerySchema.parse(rawQuery);
    let records = this.records.filter((record) => record.tenantId === context.tenant.id);
    if (query.status) records = records.filter((record) => record.status === query.status);
    records = records.slice().sort((left, right) => {
      const primary = compareStrings(
        String(left[query.sortField]),
        String(right[query.sortField]),
        query.sortDirection,
      );
      return primary || compareStrings(left.publicRef, right.publicRef, "asc");
    });
    return paginate(records, query.page, query.pageSize);
  }
}

export class SyntheticBriefSnapshotRepository implements BriefSnapshotRepository {
  private readonly records: readonly BriefSnapshotRecord[];

  constructor(records: readonly BriefSnapshotRecord[] = []) {
    this.records = Object.freeze(records.map((record) => BriefSnapshotRecordSchema.parse(record)));
  }

  async getByPublicRef(
    context: AuthorizationContext,
    briefSnapshotRef: BriefSnapshotRecord["publicRef"],
  ): Promise<BriefSnapshotRecord> {
    assertPermission(context, "brief:read");
    const parsed = BriefSnapshotPublicRefSchema.safeParse(briefSnapshotRef);
    if (!parsed.success) throw new NotFoundError("Resource not found.");
    const found = this.records.find(
      (record) => record.tenantId === context.tenant.id && record.publicRef === parsed.data,
    );
    if (!found) throw new NotFoundError("Resource not found.");
    return cloneFrozen(found);
  }

  async list(
    context: AuthorizationContext,
    rawQuery: BriefSnapshotListQueryInput,
  ): Promise<PagedResult<BriefSnapshotRecord>> {
    assertPermission(context, "brief:read");
    const query = BriefSnapshotListQuerySchema.parse(rawQuery);
    let records = this.records.filter((record) => record.tenantId === context.tenant.id);
    if (query.organizationRef) {
      records = records.filter((record) => record.organizationRef === query.organizationRef);
    }
    if (query.state) records = records.filter((record) => record.state === query.state);
    records = records.slice().sort((left, right) => {
      const primary = compareStrings(
        String(left[query.sortField]),
        String(right[query.sortField]),
        query.sortDirection,
      );
      return primary || compareStrings(left.publicRef, right.publicRef, "asc");
    });
    return paginate(records, query.page, query.pageSize);
  }
}
