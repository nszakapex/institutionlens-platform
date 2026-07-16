import fs from "node:fs";
import path from "node:path";

export const PHASE_9_MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260713190000_phase9_initial_schema.sql",
);

export const PHASE_9_ROLLBACK_PATH = path.join(
  process.cwd(),
  "supabase",
  "rollback",
  "20260713190000_phase9_initial_schema.sql",
);

export const PHASE_9_CORRECTIVE_MIGRATION_FILENAME =
  "20260715181000_phase9_default_function_privileges.sql";

export const PHASE_9_CORRECTIVE_MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  PHASE_9_CORRECTIVE_MIGRATION_FILENAME,
);

export const PHASE_9_CORRECTIVE_ROLLBACK_PATH = path.join(
  process.cwd(),
  "supabase",
  "rollback",
  PHASE_9_CORRECTIVE_MIGRATION_FILENAME,
);

export const PHASE_9_INITIAL_MIGRATION_VERSION = "20260713190000";
export const PHASE_9_CORRECTIVE_MIGRATION_VERSION = "20260715181000";
export const PHASE_9_RLS_MIGRATION_VERSION = "20260715200000";
export const PHASE_9_API_RPC_MIGRATION_VERSION = "20260715210000";
export const PHASE_9_REMAINING_API_RPC_MIGRATION_VERSION = "20260715220000";
export const PHASE_9_API_HELPER_CORE_EXECUTE_MIGRATION_VERSION = "20260716230000";
export const PHASE_9_OVERLAY_COLUMN_SAFE_MIGRATION_VERSION = "20260716231000";

export const PHASE_9_EXPECTED_MIGRATION_VERSIONS = [
  PHASE_9_INITIAL_MIGRATION_VERSION,
  PHASE_9_CORRECTIVE_MIGRATION_VERSION,
  PHASE_9_RLS_MIGRATION_VERSION,
  PHASE_9_API_RPC_MIGRATION_VERSION,
  PHASE_9_REMAINING_API_RPC_MIGRATION_VERSION,
  PHASE_9_API_HELPER_CORE_EXECUTE_MIGRATION_VERSION,
  PHASE_9_OVERLAY_COLUMN_SAFE_MIGRATION_VERSION,
] as const;

export const CORE_TABLES = [
  "tenants",
  "tenant_verticals",
  "memberships",
  "organizations",
  "import_runs",
  "provenance_records",
  "evidence_records",
  "evidence_dependencies",
  "assessment_runs",
  "assessment_results",
  "capability_results",
  "rule_results",
  "rule_result_evidence",
  "organization_overlays",
  "saved_comparisons",
  "saved_comparison_organizations",
  "brief_snapshots",
  "audit_events",
] as const;

export const PRIVILEGED_API_ROLE = ["service", "role"].join("_");
const API_ROLES = ["anon", "authenticated", PRIVILEGED_API_ROLE];

function normalizeSql(sql: string): string {
  return sql
    .replace(/--[^\r\n]*/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim()
    .toLowerCase();
}

function tableDefinition(sql: string, table: string): string | null {
  const expression = new RegExp(
    `create\\s+table\\s+institutionlens\\.${table}\\s*\\(([\\s\\S]*?)\\n\\);`,
    "i",
  );
  return expression.exec(sql)?.[1] ?? null;
}

export function validatePhase9Migration(sql: string): string[] {
  const findings: string[] = [];
  const normalized = normalizeSql(sql);

  if (!normalized.startsWith("begin;")) findings.push("Migration must start in a transaction.");
  if (!normalized.endsWith("commit;")) findings.push("Migration must commit its transaction.");
  if (!normalized.includes("create schema if not exists institutionlens;")) {
    findings.push("Missing dedicated institutionlens schema.");
  }

  for (const table of CORE_TABLES) {
    const definition = tableDefinition(sql, table);
    if (!definition) {
      findings.push(`Missing core table: ${table}.`);
      continue;
    }

    const normalizedDefinition = normalizeSql(definition);
    if (table !== "tenants") {
      if (
        !normalizedDefinition.includes(
          "tenant_id uuid not null references institutionlens.tenants(id) on delete cascade",
        )
      ) {
        findings.push(`${table} must have a cascading tenant ownership foreign key.`);
      }
      if (!/unique\s*\(tenant_id,\s*id\)/.test(normalizedDefinition)) {
        findings.push(`${table} must expose a composite tenant/id candidate key.`);
      }
    }

    if (!normalized.includes(`alter table institutionlens.${table} enable row level security;`)) {
      findings.push(`${table} must enable RLS.`);
    }
    if (!normalized.includes(`alter table institutionlens.${table} force row level security;`)) {
      findings.push(`${table} must force RLS.`);
    }
  }

  const foreignKeys = normalized.matchAll(
    /foreign key\s*\(([^)]*)\)\s*references institutionlens\.([a-z_]+)\s*\(([^)]*)\)/g,
  );
  for (const match of foreignKeys) {
    const childColumns = match[1]?.split(",").map((column) => column.trim()) ?? [];
    const parentTable = match[2] ?? "unknown";
    const parentColumns = match[3]?.split(",").map((column) => column.trim()) ?? [];
    if (parentTable !== "tenants") {
      if (childColumns[0] !== "tenant_id" || parentColumns[0] !== "tenant_id") {
        findings.push(`Foreign key to ${parentTable} is not tenant-composite.`);
      }
    }
  }

  const sameEntityReferences: ReadonlyArray<readonly [string, number]> = [
    ["references institutionlens.organizations(tenant_id, id, vertical_id)", 2],
    ["references institutionlens.assessment_runs(tenant_id, id, organization_id)", 4],
    [
      "references institutionlens.assessment_results(tenant_id, id, assessment_run_id, organization_id)",
      1,
    ],
    [
      "references institutionlens.capability_results(tenant_id, id, assessment_run_id, organization_id)",
      1,
    ],
    ["references institutionlens.evidence_records(tenant_id, id, organization_id)", 3],
    ["references institutionlens.rule_results(tenant_id, id, organization_id)", 1],
  ];
  for (const [reference, minimumCount] of sameEntityReferences) {
    const count = normalized.split(reference).length - 1;
    if (count < minimumCount) {
      findings.push(`Missing or incomplete same-entity lineage constraint: ${reference}.`);
    }
  }

  if (normalized.includes("create policy")) {
    findings.push("Batch 1 must not add an RLS allow policy.");
  }
  const apiRoleGrant = new RegExp(`\\bgrant\\b[^;]*\\b(to|from)\\b[^;]*(${API_ROLES.join("|")})`);
  if (apiRoleGrant.test(normalized)) {
    findings.push("Batch 1 must not grant an API role access.");
  }
  for (const role of API_ROLES) {
    const expected = `revoke all on schema institutionlens from public, anon, authenticated, ${PRIVILEGED_API_ROLE};`;
    if (!normalized.includes(expected)) {
      findings.push(`Missing schema-level API role revocation for ${role}.`);
    }
  }
  if (!normalized.includes("revoke all on all tables in schema institutionlens")) {
    findings.push("Missing table-level API role revocation.");
  }

  if (!normalized.includes("user_id uuid references auth.users(id) on delete set null")) {
    findings.push("Memberships must reference the Supabase auth.users primary key.");
  }
  if (!normalized.includes("role in ('owner', 'analyst', 'viewer')")) {
    findings.push("Production membership roles must be owner, analyst, and viewer.");
  }
  if (!normalized.includes("access_classification <> 'restricted' or safe_search_text = ''")) {
    findings.push("Restricted evidence must be excluded from safe search text.");
  }
  if (
    !normalized.includes("where safe_search_text <> '' and access_classification <> 'restricted'")
  ) {
    findings.push("The evidence search index must exclude restricted evidence.");
  }
  if (!normalized.includes("position between 1 and 3")) {
    findings.push("Saved comparison positions must be capped at three.");
  }
  if (!normalized.includes("references institutionlens.memberships(tenant_id, public_ref)")) {
    findings.push("Audit actors must resolve through tenant-scoped opaque membership refs.");
  }
  if (!normalized.includes("jsonb_typeof(redacted_metadata) = 'object'")) {
    findings.push("Audit metadata must be explicitly redacted and bounded.");
  }

  const separatedAssessmentFields = [
    "fit_status text not null",
    "confidence text not null",
    "freshness text not null",
    "completeness text not null",
    "publication_eligibility text not null",
  ];
  const assessmentResult = normalizeSql(tableDefinition(sql, "assessment_results") ?? "");
  for (const field of separatedAssessmentFields) {
    if (!assessmentResult.includes(field)) {
      findings.push(`Assessment results must retain separate ${field.split(" ")[0]} state.`);
    }
  }

  if (/\binsert\s+into\b/.test(normalized)) {
    findings.push("The initial production schema migration must not seed data.");
  }
  if (/\bdrop\s+(schema|table)\b/.test(normalized)) {
    findings.push("The forward migration must not contain destructive schema/table drops.");
  }

  return findings;
}

export function validatePhase9Rollback(sql: string): string[] {
  const findings: string[] = [];
  const normalized = normalizeSql(sql);

  if (!sql.includes("DESTRUCTIVE")) {
    findings.push("Rollback must carry an explicit DESTRUCTIVE warning.");
  }
  if (!normalized.includes("drop schema if exists institutionlens cascade;")) {
    findings.push("Rollback must target only the Phase 9 institutionlens schema.");
  }
  if (!normalized.startsWith("begin;")) findings.push("Rollback must start in a transaction.");
  if (!normalized.endsWith("commit;")) findings.push("Rollback must commit its transaction.");

  return findings;
}

export function validatePhase9CorrectiveMigration(sql: string): string[] {
  const findings: string[] = [];
  const normalized = normalizeSql(sql);

  if (!normalized.startsWith("begin;")) {
    findings.push("Corrective migration must start in a transaction.");
  }
  if (!normalized.endsWith("commit;")) {
    findings.push("Corrective migration must commit its transaction.");
  }
  if (!normalized.includes("alter default privileges for role")) {
    findings.push("Corrective migration must alter default privileges for the schema owner role.");
  }
  const apiGrantees = `public, anon, authenticated, ${PRIVILEGED_API_ROLE}`;
  if (!normalized.includes(`revoke all on functions from ${apiGrantees}`)) {
    findings.push(
      "Corrective migration must revoke default function execute from public and API roles.",
    );
  }
  if (!normalized.includes(`revoke all on tables from ${apiGrantees}`)) {
    findings.push("Corrective migration must retain deny-default table privileges.");
  }
  if (!normalized.includes(`revoke all on sequences from ${apiGrantees}`)) {
    findings.push("Corrective migration must retain deny-default sequence privileges.");
  }
  if (!normalized.includes("raise exception")) {
    findings.push(
      "Corrective migration must fail closed when the function default ACL is not established.",
    );
  }
  if (!normalized.includes("defaclobjtype = 'f'")) {
    findings.push("Corrective migration must require a materialized function default-ACL row.");
  }
  if (!normalized.includes("acldefault(")) {
    findings.push(
      "Corrective migration must evaluate default privileges through acldefault fallback.",
    );
  }
  if (normalized.includes("create policy")) {
    findings.push("Corrective migration must not add an RLS allow policy.");
  }
  const apiGrant = new RegExp(
    `\\bgrant\\b[^;]*\\bto\\b[^;]*\\b(public|anon|authenticated|${PRIVILEGED_API_ROLE})\\b`,
  );
  if (apiGrant.test(normalized)) {
    findings.push("Corrective migration must not grant privileges to public or API roles.");
  }
  if (
    /\b(insert|update|delete)\s+into\b/.test(normalized) ||
    /\binsert\s+into\b/.test(normalized)
  ) {
    findings.push("Corrective migration must not mutate application data.");
  }
  if (/\bdrop\s+(schema|table|function)\b/.test(normalized)) {
    findings.push("Corrective migration must not drop schema objects.");
  }

  return findings;
}

export function validatePhase9CorrectiveRollback(sql: string): string[] {
  const findings: string[] = [];
  const normalized = normalizeSql(sql);

  if (!sql.includes("DESTRUCTIVE")) {
    findings.push("Corrective rollback must carry an explicit DESTRUCTIVE warning.");
  }
  if (!/security-reverting|emergency/i.test(sql)) {
    findings.push(
      "Corrective rollback must be labeled as a security-reverting emergency operation.",
    );
  }
  if (!/not a safe production rollback/i.test(sql)) {
    findings.push("Corrective rollback must state it is not a safe production rollback.");
  }
  if (!sql.toLowerCase().includes("public execute") && !sql.includes("PUBLIC EXECUTE")) {
    findings.push("Corrective rollback must disclose that PUBLIC EXECUTE is restored.");
  }
  if (!normalized.includes("grant execute on functions to public")) {
    findings.push("Corrective rollback must reverse the function default-privilege lockdown.");
  }
  if (normalized.includes("drop schema")) {
    findings.push("Corrective rollback must not drop the institutionlens schema.");
  }
  if (!normalized.startsWith("begin;")) {
    findings.push("Corrective rollback must start in a transaction.");
  }
  if (!normalized.endsWith("commit;")) {
    findings.push("Corrective rollback must commit its transaction.");
  }

  return findings;
}

export function readAndValidatePhase9Schema(): string[] {
  const migration = fs.readFileSync(PHASE_9_MIGRATION_PATH, "utf8");
  const rollback = fs.readFileSync(PHASE_9_ROLLBACK_PATH, "utf8");
  const correctiveMigration = fs.readFileSync(PHASE_9_CORRECTIVE_MIGRATION_PATH, "utf8");
  const correctiveRollback = fs.readFileSync(PHASE_9_CORRECTIVE_ROLLBACK_PATH, "utf8");
  const findings = [
    ...validatePhase9Migration(migration),
    ...validatePhase9Rollback(rollback),
    ...validatePhase9CorrectiveMigration(correctiveMigration),
    ...validatePhase9CorrectiveRollback(correctiveRollback),
  ];

  if (PHASE_9_CORRECTIVE_MIGRATION_VERSION <= PHASE_9_INITIAL_MIGRATION_VERSION) {
    findings.push("Corrective migration version must be later than the initial schema migration.");
  }
  if (!fs.existsSync(PHASE_9_CORRECTIVE_MIGRATION_PATH)) {
    findings.push("Corrective default-privilege migration file is missing.");
  }
  if (!fs.existsSync(PHASE_9_CORRECTIVE_ROLLBACK_PATH)) {
    findings.push("Corrective default-privilege rollback file is missing.");
  }

  return findings;
}
