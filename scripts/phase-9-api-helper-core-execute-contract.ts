import fs from "node:fs";
import path from "node:path";
import { PHASE_9_API_HELPER_CORE_EXECUTE_MIGRATION_VERSION } from "./phase-9-schema-contract";

export const PHASE_9_API_HELPER_CORE_EXECUTE_MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  `${PHASE_9_API_HELPER_CORE_EXECUTE_MIGRATION_VERSION}_phase9_api_helper_core_execute.sql`,
);

export const PHASE_9_API_HELPER_CORE_EXECUTE_ROLLBACK_PATH = path.join(
  process.cwd(),
  "supabase",
  "rollback",
  `${PHASE_9_API_HELPER_CORE_EXECUTE_MIGRATION_VERSION}_phase9_api_helper_core_execute.sql`,
);

export const EXPECTED_CORE_HELPER_GRANT_SIGNATURES = [
  "as_utc_iso(timestamptz)",
  "map_data_classification(text)",
  "map_lifecycle_status(text)",
  "project_organization(institutionlens.organizations, text)",
  "project_evidence(institutionlens.evidence_records, text, text, text, text[])",
  "project_comparison(institutionlens.saved_comparisons, text)",
  "project_brief_snapshot(institutionlens.brief_snapshots, text, text)",
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

export function validatePhase9ApiHelperCoreExecuteMigration(sql: string): string[] {
  const findings: string[] = [];
  const normalized = normalizeSql(sql);

  if (/\bsecurity\s+definer\b/.test(normalized.replace(/'[^']*'/g, "''"))) {
    findings.push("Helper-core-execute migration must not introduce SECURITY DEFINER.");
  }
  if (
    normalized.includes("grant execute on all functions in schema") ||
    normalized.includes("grant all on all functions in schema")
  ) {
    findings.push("Must not grant EXECUTE on all functions in a schema.");
  }
  if (!normalized.includes("set schema institutionlens")) {
    findings.push("Helpers must move into the unexposed institutionlens schema.");
  }
  if (!normalized.includes("still in institutionlens_api")) {
    findings.push("Migration must assert helpers no longer remain in institutionlens_api.");
  }
  for (const signature of EXPECTED_CORE_HELPER_GRANT_SIGNATURES) {
    const grant = `grant execute on function institutionlens.${signature} to authenticated`.toLowerCase();
    const revoke = `revoke all on function institutionlens.${signature} from public, anon, authenticated, service_role`.toLowerCase();
    if (!normalized.includes(grant)) {
      findings.push(`Missing authenticated EXECUTE grant for institutionlens.${signature}.`);
    }
    if (!normalized.includes(revoke)) {
      findings.push(`Missing revoke-before-grant for institutionlens.${signature}.`);
    }
  }
  if (
    normalized.includes("private_notes") ||
    normalized.includes("source_reference") ||
    /\buser_id\b/.test(normalized)
  ) {
    findings.push("Migration must not project withheld private or Auth identity columns.");
  }
  return findings;
}

export function validatePhase9ApiHelperCoreExecuteRollback(sql: string): string[] {
  const findings: string[] = [];
  const normalized = normalizeSql(sql);
  if (normalized.includes("security definer")) {
    findings.push("Rollback must not introduce SECURITY DEFINER.");
  }
  if (!normalized.includes("set schema institutionlens_api")) {
    findings.push("Rollback must move helpers back to institutionlens_api.");
  }
  if (!normalized.includes("revoke all on function institutionlens_api.as_utc_iso")) {
    findings.push("Rollback must revoke helper EXECUTE after restoring API-schema helpers.");
  }
  return findings;
}

export function readAndValidatePhase9ApiHelperCoreExecute(): string[] {
  const migration = fs.readFileSync(PHASE_9_API_HELPER_CORE_EXECUTE_MIGRATION_PATH, "utf8");
  const rollback = fs.readFileSync(PHASE_9_API_HELPER_CORE_EXECUTE_ROLLBACK_PATH, "utf8");
  return [
    ...validatePhase9ApiHelperCoreExecuteMigration(migration),
    ...validatePhase9ApiHelperCoreExecuteRollback(rollback),
  ];
}
