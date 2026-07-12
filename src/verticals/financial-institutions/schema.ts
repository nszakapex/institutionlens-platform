import { z } from "zod";

/**
 * Synthetic financial-institutions payload — designed independently.
 * Prefer categorical bands; no realistic regulatory IDs or dollar figures.
 *
 * Field rationale:
 * - institutionKind: distinguishes synthetic bank vs credit-union demo shapes
 * - serviceAreaType / operatingRegions: exercise region filters without real geographies
 * - balanceSheetScaleBand: categorical scale only (not assets/revenue)
 * - ownershipModel: cooperative vs stock-like synthetic labels
 * - digitalServiceMaturity / lendingBreadth / operatingComplexityBand: demo observations
 * - publicChangeSignals: structured synthetic references for timing-signal UI later
 * - regulatoryDataAvailability: data-availability category, not a regulatory claim
 */

export const FINANCIAL_INSTITUTIONS_VERTICAL_ID = "financial_institutions" as const;
export const FINANCIAL_INSTITUTIONS_ADAPTER_VERSION = "1.0.0" as const;
export const FINANCIAL_INSTITUTIONS_FIXTURE_VERSION = "1.0.0" as const;

export const DATASET_DECLARATION =
  "This dataset is entirely synthetic and exists only to validate InstitutionLens architecture and interface behavior." as const;

export const InstitutionKindSchema = z.enum(["synthetic_bank", "synthetic_credit_union"]);
export type InstitutionKind = z.infer<typeof InstitutionKindSchema>;

export const ServiceAreaTypeSchema = z.enum([
  "single_region",
  "multi_region",
  "national_synthetic",
]);

export const ScaleBandSchema = z.enum(["band_s", "band_m", "band_l", "band_xl"]);
export type ScaleBand = z.infer<typeof ScaleBandSchema>;

export const OwnershipModelSchema = z.enum([
  "synthetic_cooperative",
  "synthetic_stock",
  "synthetic_mutual",
]);

export const MaturityBandSchema = z.enum(["emerging", "developing", "established"]);
export const BreadthBandSchema = z.enum(["narrow", "moderate", "broad"]);
export const ComplexityBandSchema = z.enum(["low", "moderate", "high"]);

export const DataAvailabilitySchema = z.enum([
  "abundant_synthetic",
  "moderate_synthetic",
  "sparse_synthetic",
  "restricted_synthetic",
]);
export type DataAvailability = z.infer<typeof DataAvailabilitySchema>;

export const OperatingRegionSchema = z.enum([
  "REGION_NORTH_DEMO",
  "REGION_MID_DEMO",
  "REGION_SOUTH_DEMO",
  "REGION_WEST_DEMO",
  "REGION_COAST_DEMO",
]);
export type OperatingRegion = z.infer<typeof OperatingRegionSchema>;

export const PublicChangeSignalSchema = z.object({
  label: z.string().min(1).max(120),
  reference: z
    .string()
    .min(1)
    .max(200)
    .refine((value) => value.startsWith("synthetic://"), "Change signals must be synthetic://"),
  observedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
});

export const FinancialInstitutionPayloadSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    syntheticDeclaration: z.literal(DATASET_DECLARATION),
    institutionKind: InstitutionKindSchema,
    serviceAreaType: ServiceAreaTypeSchema,
    operatingRegions: z.array(OperatingRegionSchema).min(1).max(5),
    balanceSheetScaleBand: ScaleBandSchema,
    ownershipModel: OwnershipModelSchema,
    digitalServiceMaturity: MaturityBandSchema,
    lendingBreadth: BreadthBandSchema,
    operatingComplexityBand: ComplexityBandSchema,
    publicChangeSignals: z.array(PublicChangeSignalSchema).max(5),
    regulatoryDataAvailability: DataAvailabilitySchema,
  })
  .strict();

export type FinancialInstitutionPayload = z.infer<typeof FinancialInstitutionPayloadSchema>;
