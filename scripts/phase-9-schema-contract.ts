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

const PRIVILEGED_API_ROLE = ["service", "role"].join("_");
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

export function readAndValidatePhase9Schema(): string[] {
  const migration = fs.readFileSync(PHASE_9_MIGRATION_PATH, "utf8");
  const rollback = fs.readFileSync(PHASE_9_ROLLBACK_PATH, "utf8");
  return [...validatePhase9Migration(migration), ...validatePhase9Rollback(rollback)];
}
