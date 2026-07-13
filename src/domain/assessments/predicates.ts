import { z } from "zod";
import { InvalidRuleDefinitionError } from "@/domain/errors";
import { EvidenceTypeSchema } from "@/domain/schemas/evidence";
import { FreshnessStatusSchema } from "@/domain/schemas/assessment";

export const MAX_PREDICATE_DEPTH = 4;
export const MAX_PREDICATES_PER_RULE = 24;

/** Adapter-allowlisted observation field token (not an arbitrary object path). */
export const PredicateFieldSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, "Predicate field must be a lowercase snake_case token");

export const DecimalStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,8})?$/, "Invalid decimal encoding");

const EvidenceExistsPredicateSchema = z
  .object({
    type: z.literal("evidence_exists"),
    evidenceTypes: z.array(EvidenceTypeSchema).min(1).max(5).optional(),
    minCount: z.number().int().min(1).max(5).optional(),
  })
  .strict();

const CategoryEqualsPredicateSchema = z
  .object({
    type: z.literal("category_equals"),
    field: PredicateFieldSchema,
    value: z.string().min(1).max(64),
  })
  .strict();

const CategoryInPredicateSchema = z
  .object({
    type: z.literal("category_in"),
    field: PredicateFieldSchema,
    values: z.array(z.string().min(1).max(64)).min(1).max(20),
  })
  .strict();

const CategoryListContainsPredicateSchema = z
  .object({
    type: z.literal("category_list_contains"),
    field: PredicateFieldSchema,
    value: z.string().min(1).max(64),
  })
  .strict();

const IntegerBetweenPredicateSchema = z
  .object({
    type: z.literal("integer_between"),
    field: PredicateFieldSchema,
    min: z.number().int().optional(),
    max: z.number().int().optional(),
  })
  .strict();

const DecimalBetweenPredicateSchema = z
  .object({
    type: z.literal("decimal_between"),
    field: PredicateFieldSchema,
    min: DecimalStringSchema.optional(),
    max: DecimalStringSchema.optional(),
  })
  .strict();

const BooleanEqualsPredicateSchema = z
  .object({
    type: z.literal("boolean_equals"),
    field: PredicateFieldSchema,
    value: z.boolean(),
  })
  .strict();

/** Compares the named date field against assessedAt using withinDays. */
const DateWithinPeriodPredicateSchema = z
  .object({
    type: z.literal("date_within_period"),
    field: PredicateFieldSchema,
    withinDays: z.number().int().min(1).max(3650),
  })
  .strict();

const FreshnessIsPredicateSchema = z
  .object({
    type: z.literal("freshness_is"),
    evidenceTypes: z.array(EvidenceTypeSchema).min(1).max(5).optional(),
    statuses: z.array(FreshnessStatusSchema).min(1).max(4),
  })
  .strict();

const LeafPredicateSchema = z.discriminatedUnion("type", [
  EvidenceExistsPredicateSchema,
  CategoryEqualsPredicateSchema,
  CategoryInPredicateSchema,
  CategoryListContainsPredicateSchema,
  IntegerBetweenPredicateSchema,
  DecimalBetweenPredicateSchema,
  BooleanEqualsPredicateSchema,
  DateWithinPeriodPredicateSchema,
  FreshnessIsPredicateSchema,
]);

export type LeafPredicate = z.infer<typeof LeafPredicateSchema>;

export type Predicate =
  | LeafPredicate
  | { type: "all"; predicates: Predicate[] }
  | { type: "any"; predicates: Predicate[] };

export const PredicateSchema: z.ZodType<Predicate> = z.lazy(() =>
  z.union([
    LeafPredicateSchema,
    z
      .object({
        type: z.literal("all"),
        predicates: z.array(PredicateSchema).min(1).max(8),
      })
      .strict(),
    z
      .object({
        type: z.literal("any"),
        predicates: z.array(PredicateSchema).min(1).max(8),
      })
      .strict(),
  ]),
);

export function countPredicates(predicate: Predicate): number {
  if (predicate.type === "all" || predicate.type === "any") {
    return 1 + predicate.predicates.reduce((sum, child) => sum + countPredicates(child), 0);
  }
  return 1;
}

export function predicateDepth(predicate: Predicate): number {
  if (predicate.type === "all" || predicate.type === "any") {
    const childDepths = predicate.predicates.map(predicateDepth);
    const deepest = childDepths.length > 0 ? Math.max(...childDepths) : 0;
    return 1 + deepest;
  }
  return 1;
}

function assertRangeBounds(predicate: Predicate): void {
  if (predicate.type === "integer_between" || predicate.type === "decimal_between") {
    if (predicate.min === undefined && predicate.max === undefined) {
      throw new InvalidRuleDefinitionError(
        "Range predicates require at least one bound.",
        "predicate_range_unbounded",
      );
    }
  }

  if (predicate.type === "all" || predicate.type === "any") {
    for (const child of predicate.predicates) {
      assertRangeBounds(child);
    }
  }
}

/**
 * Fail closed on nesting depth, total predicate count, and unbounded ranges.
 * Public messages must not include rule IDs or field paths.
 */
export function assertPredicateBounds(predicate: Predicate): void {
  const count = countPredicates(predicate);
  if (count > MAX_PREDICATES_PER_RULE) {
    throw new InvalidRuleDefinitionError(
      "Rule predicate exceeds the allowed size.",
      "predicate_count_exceeded",
    );
  }

  if (predicateDepth(predicate) > MAX_PREDICATE_DEPTH) {
    throw new InvalidRuleDefinitionError(
      "Rule predicate exceeds the allowed nesting depth.",
      "predicate_depth_exceeded",
    );
  }

  assertRangeBounds(predicate);
}
