import { RuleEvaluationError } from "@/domain/errors";
import type { Predicate } from "@/domain/assessments/predicates";
import type { EvaluationContext, FieldObservation } from "@/assessment/context";
import type { EvidenceRecord } from "@/domain/schemas/evidence";

export type PredicateEvaluationResult = {
  ok: boolean;
  missingField?: boolean;
  usedEvidenceIds: string[];
};

const DECIMAL_SCALE = 8n;
const DECIMAL_FACTOR = 100_000_000n;

function uniqueSorted(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort();
}

function collectFieldTokens(predicate: Predicate, out: Set<string>): void {
  if (predicate.type === "all" || predicate.type === "any") {
    for (const child of predicate.predicates) {
      collectFieldTokens(child, out);
    }
    return;
  }
  if ("field" in predicate) {
    out.add(predicate.field);
  }
}

function assertAllowlisted(predicate: Predicate, allowlistedFields: ReadonlySet<string>): void {
  const tokens = new Set<string>();
  collectFieldTokens(predicate, tokens);
  for (const token of tokens) {
    if (!allowlistedFields.has(token)) {
      throw new RuleEvaluationError(
        "Rule references a field that is not allowlisted.",
        "invalid_input",
      );
    }
  }
}

function decimalToScaled(value: string): bigint | null {
  const match = /^(-?)(\d+)(?:\.(\d{1,8}))?$/.exec(value);
  if (!match) {
    return null;
  }
  const sign = match[1] === "-" ? -1n : 1n;
  const whole = BigInt(match[2] ?? "0");
  const frac = (match[3] ?? "").padEnd(Number(DECIMAL_SCALE), "0");
  const scaled = whole * DECIMAL_FACTOR + BigInt(frac.length > 0 ? frac : "0");
  return sign * scaled;
}

function compareDecimal(value: string, bound: string): number | null {
  const left = decimalToScaled(value);
  const right = decimalToScaled(bound);
  if (left === null || right === null) {
    return null;
  }
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function utcDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function daysBetweenUtcDates(a: string, b: string): number {
  const aMs = Date.UTC(Number(a.slice(0, 4)), Number(a.slice(5, 7)) - 1, Number(a.slice(8, 10)));
  const bMs = Date.UTC(Number(b.slice(0, 4)), Number(b.slice(5, 7)) - 1, Number(b.slice(8, 10)));
  return Math.abs(Math.trunc((aMs - bMs) / 86_400_000));
}

function readField(
  fields: Readonly<Record<string, FieldObservation>>,
  field: string,
): FieldObservation {
  return fields[field] ?? null;
}

function fieldSourceIds(ctx: EvaluationContext, field: string): string[] {
  return uniqueSorted(ctx.fieldSources[field]?.evidenceIds ?? []);
}

function filterEvidence(
  evidence: readonly EvidenceRecord[],
  evidenceTypes: readonly string[] | undefined,
): EvidenceRecord[] {
  if (!evidenceTypes || evidenceTypes.length === 0) {
    return [...evidence];
  }
  const allowed = new Set(evidenceTypes);
  return evidence.filter((record) => allowed.has(record.evidenceType));
}

function evaluateLeaf(
  predicate: Predicate & { type: Exclude<Predicate["type"], "all" | "any"> },
  ctx: EvaluationContext,
): PredicateEvaluationResult {
  switch (predicate.type) {
    case "evidence_exists": {
      const matched = filterEvidence(ctx.evidence, predicate.evidenceTypes).filter(
        (record) => record.epistemicStatus !== "missing",
      );
      const minCount = predicate.minCount ?? 1;
      const ids = uniqueSorted(matched.map((record) => record.id));
      return {
        ok: matched.length >= minCount,
        usedEvidenceIds: ids,
      };
    }
    case "freshness_is": {
      const matched = filterEvidence(ctx.evidence, predicate.evidenceTypes);
      if (matched.length === 0) {
        return { ok: false, usedEvidenceIds: [] };
      }
      const statusSet = new Set(predicate.statuses);
      const ok = matched.every((record) => statusSet.has(record.freshness));
      return {
        ok,
        usedEvidenceIds: uniqueSorted(matched.map((record) => record.id)),
      };
    }
    case "category_equals": {
      const observation = readField(ctx.fields, predicate.field);
      const usedEvidenceIds = fieldSourceIds(ctx, predicate.field);
      if (!observation || observation.kind !== "category") {
        return { ok: false, missingField: true, usedEvidenceIds };
      }
      return {
        ok: observation.value === predicate.value,
        usedEvidenceIds,
      };
    }
    case "category_in": {
      const observation = readField(ctx.fields, predicate.field);
      const usedEvidenceIds = fieldSourceIds(ctx, predicate.field);
      if (!observation || observation.kind !== "category") {
        return { ok: false, missingField: true, usedEvidenceIds };
      }
      return {
        ok: predicate.values.includes(observation.value),
        usedEvidenceIds,
      };
    }
    case "category_list_contains": {
      const observation = readField(ctx.fields, predicate.field);
      const usedEvidenceIds = fieldSourceIds(ctx, predicate.field);
      if (!observation || observation.kind !== "category_list") {
        return { ok: false, missingField: true, usedEvidenceIds };
      }
      return {
        ok: observation.values.includes(predicate.value),
        usedEvidenceIds,
      };
    }
    case "integer_between": {
      const observation = readField(ctx.fields, predicate.field);
      const usedEvidenceIds = fieldSourceIds(ctx, predicate.field);
      if (!observation || observation.kind !== "integer") {
        return { ok: false, missingField: true, usedEvidenceIds };
      }
      const value = observation.value;
      if (predicate.min !== undefined && value < predicate.min) {
        return { ok: false, usedEvidenceIds };
      }
      if (predicate.max !== undefined && value > predicate.max) {
        return { ok: false, usedEvidenceIds };
      }
      return { ok: true, usedEvidenceIds };
    }
    case "decimal_between": {
      const observation = readField(ctx.fields, predicate.field);
      const usedEvidenceIds = fieldSourceIds(ctx, predicate.field);
      if (!observation || observation.kind !== "decimal") {
        return { ok: false, missingField: true, usedEvidenceIds };
      }
      if (predicate.min !== undefined) {
        const cmp = compareDecimal(observation.value, predicate.min);
        if (cmp === null || cmp < 0) {
          return { ok: false, usedEvidenceIds };
        }
      }
      if (predicate.max !== undefined) {
        const cmp = compareDecimal(observation.value, predicate.max);
        if (cmp === null || cmp > 0) {
          return { ok: false, usedEvidenceIds };
        }
      }
      return { ok: true, usedEvidenceIds };
    }
    case "boolean_equals": {
      const observation = readField(ctx.fields, predicate.field);
      const usedEvidenceIds = fieldSourceIds(ctx, predicate.field);
      if (!observation || observation.kind !== "boolean") {
        return { ok: false, missingField: true, usedEvidenceIds };
      }
      return {
        ok: observation.value === predicate.value,
        usedEvidenceIds,
      };
    }
    case "date_within_period": {
      const observation = readField(ctx.fields, predicate.field);
      const usedEvidenceIds = fieldSourceIds(ctx, predicate.field);
      if (!observation || observation.kind !== "date") {
        return { ok: false, missingField: true, usedEvidenceIds };
      }
      const assessedDate = utcDateOnly(ctx.assessedAt);
      const delta = daysBetweenUtcDates(observation.value, assessedDate);
      return {
        ok: delta <= predicate.withinDays,
        usedEvidenceIds,
      };
    }
    default: {
      const _exhaustive: never = predicate;
      void _exhaustive;
      throw new RuleEvaluationError("Unsupported predicate operator.", "invalid_input");
    }
  }
}

/**
 * Evaluate a typed predicate against an allowlisted evaluation context.
 * Rejects non-allowlisted field tokens with RuleEvaluationError.
 */
export function evaluatePredicate(
  predicate: Predicate,
  ctx: EvaluationContext,
  allowlistedFields: ReadonlySet<string> = ctx.allowlistedFields,
): PredicateEvaluationResult {
  assertAllowlisted(predicate, allowlistedFields);

  if (predicate.type === "all") {
    const results = predicate.predicates.map((child) =>
      evaluatePredicate(child, ctx, allowlistedFields),
    );
    const ok = results.every((result) => result.ok);
    const missingField =
      !ok &&
      results.some((result) => result.missingField) &&
      results.every((result) => result.ok || result.missingField);
    return {
      ok,
      ...(missingField ? { missingField: true } : {}),
      usedEvidenceIds: uniqueSorted(results.flatMap((result) => result.usedEvidenceIds)),
    };
  }

  if (predicate.type === "any") {
    const results = predicate.predicates.map((child) =>
      evaluatePredicate(child, ctx, allowlistedFields),
    );
    const ok = results.some((result) => result.ok);
    const missingField = !ok && results.every((result) => result.missingField);
    const usedEvidenceIds = ok
      ? uniqueSorted(
          results.filter((result) => result.ok).flatMap((result) => result.usedEvidenceIds),
        )
      : uniqueSorted(results.flatMap((result) => result.usedEvidenceIds));
    return {
      ok,
      ...(missingField ? { missingField: true } : {}),
      usedEvidenceIds,
    };
  }

  return evaluateLeaf(predicate, ctx);
}
