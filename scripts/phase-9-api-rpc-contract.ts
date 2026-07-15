import fs from "node:fs";
import path from "node:path";
import { PRIVILEGED_API_ROLE } from "./phase-9-schema-contract";

export const PHASE_9_API_RPC_MIGRATION_FILENAME = "20260715210000_phase9_narrow_read_api_rpc.sql";

export const PHASE_9_API_RPC_MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  PHASE_9_API_RPC_MIGRATION_FILENAME,
);

export const PHASE_9_API_RPC_ROLLBACK_PATH = path.join(
  process.cwd(),
  "supabase",
  "rollback",
  PHASE_9_API_RPC_MIGRATION_FILENAME,
);

export const PHASE_9_API_RPC_MIGRATION_VERSION = "20260715210000";

export const EXPECTED_API_RPC_FUNCTIONS = [
  "organizations_get_by_public_ref",
  "organizations_get_by_domain_id",
  "organizations_list",
  "organizations_count",
  "evidence_list_by_organization_domain_id",
  "comparisons_get_by_public_ref",
  "comparisons_list",
  "brief_snapshots_get_by_public_ref",
  "brief_snapshots_list",
] as const;

/** Exact grant/revoke arities for authenticated-only EXECUTE. */
export const EXPECTED_API_RPC_SIGNATURES = [
  "organizations_get_by_public_ref(text, text)",
  "organizations_get_by_domain_id(text, text)",
  "organizations_list(text, jsonb)",
  "organizations_count(text, jsonb)",
  "evidence_list_by_organization_domain_id(text, text, jsonb)",
  "comparisons_get_by_public_ref(text, text)",
  "comparisons_list(text, jsonb)",
  "brief_snapshots_get_by_public_ref(text, text)",
  "brief_snapshots_list(text, jsonb)",
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

export function validatePhase9ApiRpcMigration(sql: string): string[] {
  const findings: string[] = [];
  const normalized = normalizeSql(sql);

  if (!normalized.includes("create schema if not exists institutionlens_api")) {
    findings.push("Migration must create institutionlens_api schema.");
  }
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
  for (const fn of EXPECTED_API_RPC_FUNCTIONS) {
    if (!normalized.includes(`create or replace function institutionlens_api.${fn}(`)) {
      findings.push(`Missing RPC function institutionlens_api.${fn}.`);
    }
    if (!normalized.includes(`revoke all on function institutionlens_api.${fn}`)) {
      findings.push(`Missing revoke-all before grant for ${fn}.`);
    }
  }
  for (const signature of EXPECTED_API_RPC_SIGNATURES) {
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
  if (!normalized.includes("grant usage on schema institutionlens_api to authenticated")) {
    findings.push("authenticated must receive USAGE on institutionlens_api.");
  }
  if (
    !normalized.includes(
      `revoke all on schema institutionlens_api from public, anon, authenticated, ${PRIVILEGED_API_ROLE}`,
    )
  ) {
    findings.push("institutionlens_api must revoke schema privileges from PUBLIC/API roles first.");
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
  return findings;
}

export function validatePhase9ApiRpcRollback(sql: string): string[] {
  const findings: string[] = [];
  const normalized = normalizeSql(sql);
  if (!normalized.includes("drop schema if exists institutionlens_api cascade")) {
    findings.push("Rollback must drop institutionlens_api cascade.");
  }
  if (normalized.includes("create ") || normalized.includes("grant ")) {
    findings.push("Rollback must only drop the API schema.");
  }
  return findings;
}

export function readAndValidatePhase9ApiRpc(): string[] {
  const migration = fs.readFileSync(PHASE_9_API_RPC_MIGRATION_PATH, "utf8");
  const rollback = fs.readFileSync(PHASE_9_API_RPC_ROLLBACK_PATH, "utf8");
  return [...validatePhase9ApiRpcMigration(migration), ...validatePhase9ApiRpcRollback(rollback)];
}
