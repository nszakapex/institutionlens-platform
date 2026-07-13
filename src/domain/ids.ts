/**
 * Branded domain identifiers — parse unknown input through schemas only.
 * Synthetic prefixes are intentional and must not resemble regulatory IDs.
 */

import { z } from "zod";

const MAX_ID_LENGTH = 64;

function prefixedId(prefix: string, example: string) {
  const pattern = new RegExp(`^${prefix}[a-z0-9_]{1,48}$`);
  return z
    .string()
    .min(prefix.length + 1)
    .max(MAX_ID_LENGTH)
    .regex(pattern, `Expected ${example}-style identifier`);
}

export const TenantIdSchema = prefixedId("tenant_", "tenant_demo_research");
export const PrincipalIdSchema = prefixedId("principal_", "principal_demo_analyst");
export const OrganizationIdSchema = prefixedId("org_", "org_syn_fi_001");
export const EvidenceIdSchema = prefixedId("ev_", "ev_syn_fi_001_profile");
export const ProvenanceIdSchema = prefixedId("prov_", "prov_syn_fi_001_profile");
export const CapabilityIdSchema = prefixedId("cap_", "cap_syn_fi_ops_analytics");
export const AssessmentIdSchema = prefixedId("assess_", "assess_syn_fi_001_fit");
export const PortfolioIdSchema = prefixedId("portfolio_", "portfolio_syn_fi_demo");
export const OverlayIdSchema = prefixedId("overlay_", "overlay_syn_fi_001");
export const RuleIdSchema = prefixedId("rule_", "rule_syn_fi_ops_profile");
export const RuleSetIdSchema = prefixedId("ruleset_", "ruleset_syn_fi_ops_analytics");
export const LedgerEntryIdSchema = prefixedId("ledger_", "ledger_syn_fi_001_rule_01");

export const VerticalIdSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, "Vertical ID must be lowercase snake_case");

export const AdapterVersionSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^\d+\.\d+\.\d+$/, "Adapter version must be semver MAJOR.MINOR.PATCH");

export type TenantId = z.infer<typeof TenantIdSchema>;
export type PrincipalId = z.infer<typeof PrincipalIdSchema>;
export type OrganizationId = z.infer<typeof OrganizationIdSchema>;
export type EvidenceId = z.infer<typeof EvidenceIdSchema>;
export type ProvenanceId = z.infer<typeof ProvenanceIdSchema>;
export type CapabilityId = z.infer<typeof CapabilityIdSchema>;
export type AssessmentId = z.infer<typeof AssessmentIdSchema>;
export type PortfolioId = z.infer<typeof PortfolioIdSchema>;
export type OverlayId = z.infer<typeof OverlayIdSchema>;
export type RuleId = z.infer<typeof RuleIdSchema>;
export type RuleSetId = z.infer<typeof RuleSetIdSchema>;
export type LedgerEntryId = z.infer<typeof LedgerEntryIdSchema>;
export type VerticalId = z.infer<typeof VerticalIdSchema>;
export type AdapterVersion = z.infer<typeof AdapterVersionSchema>;

export const DOMAIN_SCHEMA_VERSION = "1.0.0" as const;
