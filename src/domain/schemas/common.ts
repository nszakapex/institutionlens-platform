import { z } from "zod";

/** ISO-8601 timestamps stored as strings for deterministic serialization. */
export const IsoDateTimeSchema = z
  .string()
  .min(20)
  .max(40)
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/, "Expected UTC ISO-8601 datetime");

export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD date");

export const DataClassificationSchema = z.enum(["synthetic", "public", "internal", "restricted"]);

export type DataClassification = z.infer<typeof DataClassificationSchema>;

export const LifecycleStatusSchema = z.enum(["active", "inactive", "archived"]);
export type LifecycleStatus = z.infer<typeof LifecycleStatusSchema>;

export const LocationSchema = z.object({
  regionCode: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[A-Z0-9_]+$/, "regionCode must be uppercase synthetic code"),
  localityLabel: z.string().min(1).max(80).optional(),
  countryCode: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/)
    .optional(),
});

export type StructuredLocation = z.infer<typeof LocationSchema>;

export const ExternalReferenceSchema = z.object({
  kind: z.enum(["synthetic_internal", "example_domain", "document_label"]),
  label: z.string().min(1).max(120),
  /** Safe reference — never credentials, fragments, or local file paths. */
  reference: z
    .string()
    .min(1)
    .max(200)
    .refine(
      (value) =>
        value.startsWith("synthetic://") ||
        value.endsWith(".example") ||
        /^[a-z0-9][a-z0-9._-]{0,80}$/i.test(value),
      "Unsafe external reference",
    ),
});

export type ExternalReference = z.infer<typeof ExternalReferenceSchema>;

export const TagSchema = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, "Tags must be lowercase kebab/snake tokens");

export const BoundedTagsSchema = z.array(TagSchema).max(12);
