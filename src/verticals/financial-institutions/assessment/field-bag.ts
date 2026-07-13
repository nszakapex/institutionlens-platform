import "server-only";

import type { FieldSourceRef } from "@/assessment/context";
import type { EvidenceRecord, EvidenceType } from "@/domain/schemas/evidence";
import type { ObservationValue } from "@/domain/schemas/observation";
import type { Organization } from "@/domain/schemas/organization";
import { FinancialInstitutionPayloadSchema } from "@/verticals/financial-institutions/schema";

/**
 * Allowlisted observation field tokens for the financial-institutions vertical.
 * The assessment engine must only read these keys — never arbitrary payload paths.
 */
export const FI_ALLOWLISTED_FIELDS: ReadonlySet<string> = Object.freeze(
  new Set([
    "institution_kind",
    "balance_sheet_scale_band",
    "digital_service_maturity",
    "operating_complexity_band",
    "regulatory_data_availability",
    "lending_breadth",
    "ownership_model",
    "has_public_change_signal",
    "latest_public_change_date",
    "operating_region_count",
  ]),
);

/**
 * Declares which evidence types authorize each allowlisted adapter field.
 * Adapter payload fields are scoring inputs only when backed by matching evidence.
 */
export const FI_FIELD_EVIDENCE_TYPES: Readonly<Record<string, readonly EvidenceType[]>> =
  Object.freeze({
    institution_kind: Object.freeze(["organization_profile"] as const),
    balance_sheet_scale_band: Object.freeze(["organization_profile"] as const),
    digital_service_maturity: Object.freeze(["organization_profile"] as const),
    operating_complexity_band: Object.freeze(["organization_profile"] as const),
    lending_breadth: Object.freeze(["organization_profile"] as const),
    ownership_model: Object.freeze(["organization_profile"] as const),
    regulatory_data_availability: Object.freeze(["data_availability"] as const),
    has_public_change_signal: Object.freeze(["public_change_signal"] as const),
    latest_public_change_date: Object.freeze(["public_change_signal"] as const),
    operating_region_count: Object.freeze(["operating_context", "organization_profile"] as const),
  });

function latestChangeDate(observedAts: readonly string[]): string | null {
  if (observedAts.length === 0) {
    return null;
  }
  let max = observedAts[0]!;
  for (let i = 1; i < observedAts.length; i += 1) {
    const candidate = observedAts[i]!;
    if (candidate > max) {
      max = candidate;
    }
  }
  return max.slice(0, 10);
}

function evidenceIdsForField(
  field: string,
  evidence: readonly EvidenceRecord[],
): readonly string[] {
  const types = FI_FIELD_EVIDENCE_TYPES[field];
  if (!types || types.length === 0) {
    return Object.freeze([]);
  }
  for (const evidenceType of types) {
    const matched = evidence
      .filter(
        (record) => record.evidenceType === evidenceType && record.epistemicStatus !== "missing",
      )
      .map((record) => record.id)
      .sort();
    if (matched.length > 0) {
      return Object.freeze(matched);
    }
  }
  return Object.freeze([]);
}

export type FinancialInstitutionFieldBag = {
  fields: Record<string, ObservationValue | null>;
  fieldSources: Record<string, FieldSourceRef>;
};

/**
 * Build a deterministic, allowlisted field bag from a synthetic organization payload,
 * with explicit evidence lineage for every field token.
 */
export function buildFinancialInstitutionFieldBag(
  org: Organization,
  evidence: readonly EvidenceRecord[] = [],
): FinancialInstitutionFieldBag {
  const payload = FinancialInstitutionPayloadSchema.parse(org.verticalPayload);
  const latestDate = latestChangeDate(
    payload.publicChangeSignals.map((signal) => signal.observedAt),
  );

  const fields: Record<string, ObservationValue | null> = {
    institution_kind: { kind: "category", value: payload.institutionKind },
    balance_sheet_scale_band: { kind: "category", value: payload.balanceSheetScaleBand },
    digital_service_maturity: { kind: "category", value: payload.digitalServiceMaturity },
    operating_complexity_band: { kind: "category", value: payload.operatingComplexityBand },
    regulatory_data_availability: {
      kind: "category",
      value: payload.regulatoryDataAvailability,
    },
    lending_breadth: { kind: "category", value: payload.lendingBreadth },
    ownership_model: { kind: "category", value: payload.ownershipModel },
    has_public_change_signal: {
      kind: "boolean",
      value: payload.publicChangeSignals.length > 0,
    },
    latest_public_change_date: latestDate ? { kind: "date", value: latestDate } : null,
    operating_region_count: {
      kind: "integer",
      value: payload.operatingRegions.length,
    },
  };

  const fieldSources: Record<string, FieldSourceRef> = {};
  for (const key of Object.keys(fields)) {
    if (!FI_ALLOWLISTED_FIELDS.has(key)) {
      throw new Error(`Field bag produced a non-allowlisted field: ${key}`);
    }
    fieldSources[key] = { evidenceIds: evidenceIdsForField(key, evidence) };
  }

  return { fields, fieldSources };
}
