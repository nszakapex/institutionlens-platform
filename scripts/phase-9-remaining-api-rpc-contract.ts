import fs from "node:fs";
import path from "node:path";
import { PHASE_9_API_RPC_MIGRATION_VERSION, PRIVILEGED_API_ROLE } from "./phase-9-schema-contract";

export const PHASE_9_REMAINING_API_RPC_MIGRATION_FILENAME =
  "20260715220000_phase9_remaining_read_api_rpc.sql";

export const PHASE_9_REMAINING_API_RPC_MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  PHASE_9_REMAINING_API_RPC_MIGRATION_FILENAME,
);

export const PHASE_9_REMAINING_API_RPC_ROLLBACK_PATH = path.join(
  process.cwd(),
  "supabase",
  "rollback",
  PHASE_9_REMAINING_API_RPC_MIGRATION_FILENAME,
);

export const PHASE_9_REMAINING_API_RPC_MIGRATION_VERSION = "20260715220000";

export const EXPECTED_REMAINING_API_RPC_FUNCTIONS = [
  "session_tenant_public_ref",
  "workspace_get",
  "provenance_get_by_domain_id",
  "capabilities_list",
  "assessments_list_portfolios",
  "assessments_get_portfolio_by_domain_id",
  "assessments_list_capabilities",
  "assessments_get_capability_by_domain_id",
  "assessments_get_ledger",
  "assessments_get_manifest",
  "assessments_get_opportunity_context",
  "portfolios_list",
  "portfolios_get_by_domain_id",
  "overlays_get_by_organization_domain_id",
  "overlays_list",
  "overlays_get_by_domain_id",
] as const;

/** Exact grant/revoke arities for authenticated-only EXECUTE. */
export const EXPECTED_REMAINING_API_RPC_SIGNATURES = [
  "session_tenant_public_ref()",
  "workspace_get(text)",
  "provenance_get_by_domain_id(text, text)",
  "capabilities_list(text, jsonb)",
  "assessments_list_portfolios(text, jsonb)",
  "assessments_get_portfolio_by_domain_id(text, text)",
  "assessments_list_capabilities(text, jsonb)",
  "assessments_get_capability_by_domain_id(text, text)",
  "assessments_get_ledger(text, text)",
  "assessments_get_manifest(text, text)",
  "assessments_get_opportunity_context(text, text, text)",
  "portfolios_list(text, jsonb)",
  "portfolios_get_by_domain_id(text, text)",
  "overlays_get_by_organization_domain_id(text, text)",
  "overlays_list(text, jsonb)",
  "overlays_get_by_domain_id(text, text)",
] as const;

export const EXPECTED_REMAINING_API_RPC_HELPERS = [
  "derive_tenant_domain_id(text)",
  "derive_principal_domain_id(text)",
  "map_tenant_workspace_status(text)",
  "map_provenance_access_classification(text)",
  "map_provenance_license_status(text)",
  "map_provenance_source_type(text)",
  "pad_org_key(text)",
  "capability_short(text)",
  "synthesize_capability_assessment_id(text, text)",
  "synthesize_portfolio_assessment_id(text)",
  "project_capability_id(text)",
  "project_rule_set_id(text)",
  "project_portfolio_id(text)",
  "project_overlay_id(text)",
  "project_ledger_entry_id(text)",
  "project_rule_id(text)",
  "build_fit_assessment(text, integer, integer, text)",
  "project_provenance(institutionlens.provenance_records, text)",
  "project_overlay(institutionlens.organization_overlays, text, text, text)",
  "project_capability_assessment(institutionlens.assessment_runs, institutionlens.capability_results, institutionlens.organizations, text)",
  "project_portfolio_assessment(institutionlens.assessment_runs, institutionlens.assessment_results, institutionlens.organizations, text)",
  "project_ledger_entry(institutionlens.rule_results, text, text, text)",
] as const;

function normalizeSql(sql: string): string {
  return sql
    .replace(/--[^\r\n]*/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim()
    .toLowerCase();
}

export function validatePhase9RemainingApiRpcMigration(sql: string): string[] {
  const findings: string[] = [];
  const normalized = normalizeSql(sql);

  if (!normalized.includes("security invoker")) {
    findings.push("RPC functions must declare security invoker.");
  }
  if (normalized.includes("security definer")) {
    findings.push("API RPC migration must not introduce security definer functions.");
  }
  if (
    normalized.includes("execute format(") ||
    normalized.includes("execute '") ||
    normalized.includes('execute "')
  ) {
    findings.push("API RPC migration must not use dynamic SQL execution.");
  }
  for (const banned of [
    "insert into",
    "update ",
    "delete from",
    "truncate ",
    "drop table",
    "create table",
  ]) {
    if (normalized.includes(banned)) {
      findings.push(`API RPC migration must remain read-only (found ${banned.trim()}).`);
    }
  }
  if (normalized.includes("p_tenant_id") || normalized.includes("tenant_id =>")) {
    findings.push("API RPCs must not accept client-supplied tenant identifiers.");
  }
  if (!normalized.includes("p_tenant_public_ref text")) {
    findings.push("Every public RPC must accept server-bound p_tenant_public_ref.");
  }
  if (!normalized.includes("accessible_tenant_ids()")) {
    findings.push("RPCs must verify p_tenant_public_ref against accessible_tenant_ids().");
  }
  for (const fn of EXPECTED_REMAINING_API_RPC_FUNCTIONS) {
    if (!normalized.includes(`create or replace function institutionlens_api.${fn}(`)) {
      findings.push(`Missing RPC function institutionlens_api.${fn}.`);
    }
    if (!normalized.includes(`revoke all on function institutionlens_api.${fn}`)) {
      findings.push(`Missing revoke-all before grant for ${fn}.`);
    }
  }
  for (const signature of EXPECTED_REMAINING_API_RPC_SIGNATURES) {
    const grant =
      `grant execute on function institutionlens_api.${signature} to authenticated`.toLowerCase();
    const revoke =
      `revoke all on function institutionlens_api.${signature} from public, anon, authenticated, ${PRIVILEGED_API_ROLE}`.toLowerCase();
    if (!normalized.includes(grant)) {
      findings.push(`Missing authenticated-only EXECUTE grant for ${signature}.`);
    }
    if (!normalized.includes(revoke)) {
      findings.push(`Missing exact revoke-all for ${signature}.`);
    }
  }
  if (new RegExp(`grant execute[^;]+ to (anon|${PRIVILEGED_API_ROLE}|public)`).test(normalized)) {
    findings.push("EXECUTE grants must be authenticated-only.");
  }
  if (
    normalized.includes("private_notes") ||
    normalized.includes("source_reference") ||
    normalized.includes("user_id")
  ) {
    findings.push("RPC projections must not select withheld private or Auth identity columns.");
  }
  if (!normalized.includes("set search_path = institutionlens_api, institutionlens, pg_catalog")) {
    findings.push("RPC functions must pin search_path.");
  }
  if (!normalized.includes("least(coalesce((p_query ->> 'pagesize')::integer, 12), 50)")) {
    findings.push("List RPCs must bound pageSize to at most 50.");
  }
  if (!normalized.includes("'tenantpublicref', p_tenant_public_ref")) {
    findings.push("RPC projections must carry tenantPublicRef for server-side binding checks.");
  }
  for (const helper of EXPECTED_REMAINING_API_RPC_HELPERS) {
    const revoke = `revoke all on function institutionlens_api.${helper}`.toLowerCase();
    if (!normalized.includes(revoke)) {
      findings.push(`Helper ${helper} must revoke EXECUTE from API roles.`);
    }
  }
  if (!(PHASE_9_REMAINING_API_RPC_MIGRATION_VERSION > PHASE_9_API_RPC_MIGRATION_VERSION)) {
    findings.push("Remaining API RPC migration version must follow narrow read API RPC migration.");
  }
  return findings;
}

export function validatePhase9RemainingApiRpcRollback(sql: string): string[] {
  const findings: string[] = [];
  const normalized = normalizeSql(sql);

  if (normalized.includes("drop schema if exists institutionlens_api")) {
    findings.push("Rollback must drop only Batch 5 functions, not institutionlens_api schema.");
  }
  if (normalized.includes("create ") || normalized.includes("grant ")) {
    findings.push("Rollback must only drop functions.");
  }
  for (const signature of [
    ...EXPECTED_REMAINING_API_RPC_SIGNATURES,
    ...EXPECTED_REMAINING_API_RPC_HELPERS,
  ]) {
    const drop = `drop function if exists institutionlens_api.${signature}`.toLowerCase();
    if (!normalized.includes(drop)) {
      findings.push(`Rollback must drop institutionlens_api.${signature}.`);
    }
  }
  return findings;
}

export function readAndValidatePhase9RemainingApiRpc(): string[] {
  const migration = fs.readFileSync(PHASE_9_REMAINING_API_RPC_MIGRATION_PATH, "utf8");
  const rollback = fs.readFileSync(PHASE_9_REMAINING_API_RPC_ROLLBACK_PATH, "utf8");
  return [
    ...validatePhase9RemainingApiRpcMigration(migration),
    ...validatePhase9RemainingApiRpcRollback(rollback),
  ];
}
