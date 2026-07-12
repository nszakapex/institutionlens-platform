import { z } from "zod";

/**
 * Bounded structured observation values.
 * Missing evidence must not carry a fabricated value (see invariants).
 */
export const ObservationValueSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text"),
    value: z.string().min(1).max(500),
  }),
  z.object({
    kind: z.literal("integer"),
    value: z.number().int().min(-1_000_000_000).max(1_000_000_000),
    unit: z.string().min(1).max(32).optional(),
  }),
  z.object({
    kind: z.literal("decimal"),
    /** Decimal as string — avoid float assumptions for future amounts. */
    value: z.string().regex(/^-?\d+(\.\d{1,8})?$/, "Invalid decimal encoding"),
    unit: z.string().min(1).max(32).optional(),
  }),
  z.object({
    kind: z.literal("boolean"),
    value: z.boolean(),
  }),
  z.object({
    kind: z.literal("date"),
    value: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    kind: z.literal("category"),
    value: z.string().min(1).max(64),
  }),
  z.object({
    kind: z.literal("category_list"),
    values: z.array(z.string().min(1).max(64)).min(1).max(20),
  }),
  z.object({
    kind: z.literal("band"),
    value: z.string().min(1).max(64),
    label: z.string().min(1).max(128).optional(),
  }),
]);

export type ObservationValue = z.infer<typeof ObservationValueSchema>;
