import fs from "node:fs";
import path from "node:path";
import { CORE_TABLES, PHASE_9_MIGRATION_PATH } from "./phase-9-schema-contract";

export const PHASE_9_LIVE_VERIFIER_PATH = path.join(
  process.cwd(),
  "scripts",
  "phase-9-live-schema-verify.sql",
);

const migrationVersionMatch = /^(\d{14})_/.exec(path.basename(PHASE_9_MIGRATION_PATH));
if (!migrationVersionMatch?.[1]) {
  throw new Error("Phase 9 migration filename must start with a 14-digit version.");
}
export const PHASE_9_MIGRATION_VERSION = migrationVersionMatch[1];

type LineageForeignKey = {
  name: string;
  sourceColumns: readonly string[];
  targetTable: string;
  targetColumns: readonly string[];
};

const REQUIRED_LINEAGE_FOREIGN_KEYS: readonly LineageForeignKey[] = [
  {
    name: "evidence_records_organization_fk",
    sourceColumns: ["tenant_id", "organization_id", "vertical_id"],
    targetTable: "organizations",
    targetColumns: ["tenant_id", "id", "vertical_id"],
  },
  {
    name: "assessment_runs_organization_fk",
    sourceColumns: ["tenant_id", "organization_id", "vertical_id"],
    targetTable: "organizations",
    targetColumns: ["tenant_id", "id", "vertical_id"],
  },
  {
    name: "assessment_results_run_fk",
    sourceColumns: ["tenant_id", "assessment_run_id", "organization_id"],
    targetTable: "assessment_runs",
    targetColumns: ["tenant_id", "id", "organization_id"],
  },
  {
    name: "capability_results_run_fk",
    sourceColumns: ["tenant_id", "assessment_run_id", "organization_id"],
    targetTable: "assessment_runs",
    targetColumns: ["tenant_id", "id", "organization_id"],
  },
  {
    name: "rule_results_run_fk",
    sourceColumns: ["tenant_id", "assessment_run_id", "organization_id"],
    targetTable: "assessment_runs",
    targetColumns: ["tenant_id", "id", "organization_id"],
  },
  {
    name: "brief_snapshots_assessment_run_fk",
    sourceColumns: ["tenant_id", "assessment_run_id", "organization_id"],
    targetTable: "assessment_runs",
    targetColumns: ["tenant_id", "id", "organization_id"],
  },
  {
    name: "capability_results_result_fk",
    sourceColumns: ["tenant_id", "assessment_result_id", "assessment_run_id", "organization_id"],
    targetTable: "assessment_results",
    targetColumns: ["tenant_id", "id", "assessment_run_id", "organization_id"],
  },
  {
    name: "rule_results_capability_result_fk",
    sourceColumns: ["tenant_id", "capability_result_id", "assessment_run_id", "organization_id"],
    targetTable: "capability_results",
    targetColumns: ["tenant_id", "id", "assessment_run_id", "organization_id"],
  },
  {
    name: "evidence_dependencies_evidence_fk",
    sourceColumns: ["tenant_id", "evidence_id", "organization_id"],
    targetTable: "evidence_records",
    targetColumns: ["tenant_id", "id", "organization_id"],
  },
  {
    name: "evidence_dependencies_input_evidence_fk",
    sourceColumns: ["tenant_id", "input_evidence_id", "organization_id"],
    targetTable: "evidence_records",
    targetColumns: ["tenant_id", "id", "organization_id"],
  },
  {
    name: "rule_result_evidence_evidence_fk",
    sourceColumns: ["tenant_id", "evidence_id", "organization_id"],
    targetTable: "evidence_records",
    targetColumns: ["tenant_id", "id", "organization_id"],
  },
  {
    name: "rule_result_evidence_rule_result_fk",
    sourceColumns: ["tenant_id", "rule_result_id", "organization_id"],
    targetTable: "rule_results",
    targetColumns: ["tenant_id", "id", "organization_id"],
  },
] as const;

const REQUIRED_CHECK_NAMES = [
  "schema_exists",
  "table_set",
  "index_set",
  "domain_foreign_key_set",
  "foreign_key_shape",
  "same_organization_lineage",
  "rls_enabled_and_forced",
  "rls_policy_count",
  "api_roles_exist",
  "api_role_privileges",
  "application_row_count",
  "migration_history",
] as const;

const REQUIRED_API_ROLES = ["anon", "authenticated", ["service", "role"].join("_")] as const;

const REQUIRED_CATALOG_TOKENS = [
  "pg_catalog.pg_namespace",
  "pg_catalog.pg_class",
  "pg_catalog.pg_constraint",
  "pg_catalog.pg_index",
  "pg_catalog.pg_policy",
  "pg_catalog.pg_default_acl",
  "aclexplode(",
  "has_schema_privilege(",
  "has_table_privilege(",
  "supabase_migrations.schema_migrations",
] as const;

function normalizedSet(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function sameSet(actual: readonly string[], expected: readonly string[]): boolean {
  return JSON.stringify(normalizedSet(actual)) === JSON.stringify(normalizedSet(expected));
}

function normalizeSql(sql: string): string {
  return sql
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ",")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

function extractExpectedValues(sql: string, cteName: string): string[] {
  const escaped = cteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(
    `${escaped}\\s*\\([^)]*\\)\\s+as\\s*\\(\\s*values([\\s\\S]*?)\\n\\),`,
    "i",
  ).exec(sql);
  if (!match?.[1]) return [];
  return [...match[1].matchAll(/\(\s*'([^']+)'/g)].flatMap((value) => (value[1] ? [value[1]] : []));
}

function extractExpectedNames(sql: string, cteName: string): string[] {
  return extractExpectedValues(sql, cteName).map((value) => value.split("|", 1)[0] ?? "");
}

function stripCommentsAndStrings(sql: string): string {
  return sql
    .replace(/--[^\r\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:''|[^'])*'/g, "''");
}

function countMatches(value: string, pattern: RegExp): number {
  return [...value.matchAll(pattern)].length;
}

function explicitForeignKeySignatures(migration: string): string[] {
  const signatures: string[] = [];
  const tablePattern = /create\s+table\s+institutionlens\.([a-z0-9_]+)\s*\(([\s\S]*?)\n\);/gi;

  for (const tableMatch of migration.matchAll(tablePattern)) {
    const sourceTable = tableMatch[1];
    const tableBody = tableMatch[2]?.replace(/\s+/g, " ");
    if (!sourceTable || !tableBody) continue;

    const foreignKeyPattern =
      /constraint\s+([a-z0-9_]+)\s+foreign\s+key\s*\(([^)]+)\)\s+references\s+institutionlens\.([a-z0-9_]+)\s*\(([^)]+)\)/gi;
    for (const foreignKeyMatch of tableBody.matchAll(foreignKeyPattern)) {
      const [, name, sourceColumns, targetTable, targetColumns] = foreignKeyMatch;
      if (!name || !sourceColumns || !targetTable || !targetColumns) continue;
      const compactColumns = (columns: string): string =>
        columns
          .split(",")
          .map((column) => column.trim())
          .join(",");
      signatures.push(
        `${name}|${sourceTable}|${compactColumns(sourceColumns)}|${targetTable}|${compactColumns(targetColumns)}`,
      );
    }
  }

  return signatures;
}

function migrationExpectations(migration: string): {
  tables: string[];
  indexes: string[];
  domainForeignKeys: string[];
  domainForeignKeySignatures: string[];
  totalForeignKeys: number;
} {
  const domainForeignKeySignatures = explicitForeignKeySignatures(migration);
  const domainForeignKeys = domainForeignKeySignatures.map(
    (signature) => signature.split("|", 1)[0] ?? "",
  );
  const tenantOwnershipForeignKeys = countMatches(
    migration,
    /tenant_id\s+uuid\s+not\s+null\s+references\s+institutionlens\.tenants\(id\)/gi,
  );
  const authUserForeignKeys = countMatches(
    migration,
    /user_id\s+uuid\s+references\s+auth\.users\(id\)/gi,
  );

  return {
    tables: [...migration.matchAll(/create\s+table\s+institutionlens\.([a-z0-9_]+)/gi)].flatMap(
      (match) => (match[1] ? [match[1]] : []),
    ),
    indexes: [...migration.matchAll(/create\s+(?:unique\s+)?index\s+([a-z0-9_]+)/gi)].flatMap(
      (match) => (match[1] ? [match[1]] : []),
    ),
    domainForeignKeys,
    domainForeignKeySignatures,
    totalForeignKeys: domainForeignKeys.length + tenantOwnershipForeignKeys + authUserForeignKeys,
  };
}

function validateLineage(sql: string, migration: string, findings: string[]): void {
  const normalizedVerifier = normalizeSql(sql);
  const normalizedMigration = normalizeSql(migration);
  const lineageNames = extractExpectedNames(sql, "expected_lineage_foreign_keys");
  const requiredNames = REQUIRED_LINEAGE_FOREIGN_KEYS.map((foreignKey) => foreignKey.name);

  if (!sameSet(lineageNames, requiredNames)) {
    findings.push("Live verifier must retain every same-organization lineage constraint.");
  }

  for (const foreignKey of REQUIRED_LINEAGE_FOREIGN_KEYS) {
    const migrationDefinition =
      `constraint ${foreignKey.name} foreign key (${foreignKey.sourceColumns.join(",")}) ` +
      `references institutionlens.${foreignKey.targetTable}(${foreignKey.targetColumns.join(",")})`;
    const verifierDefinition =
      `'${foreignKey.name}',array['${foreignKey.sourceColumns.join("','")}']::text[],` +
      `'${foreignKey.targetTable}',array['${foreignKey.targetColumns.join("','")}']::text[]`;

    if (!normalizedMigration.includes(migrationDefinition)) {
      findings.push(`Committed migration lineage definition changed: ${foreignKey.name}.`);
    }
    if (!normalizedVerifier.includes(verifierDefinition)) {
      findings.push(`Live verifier lineage columns must match the migration: ${foreignKey.name}.`);
    }
  }
}

export function validatePhase9LiveVerifier(sql: string, migration: string): string[] {
  const findings: string[] = [];
  const executable = stripCommentsAndStrings(sql);
  const statements = executable
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
  const normalizedExecutable = normalizeSql(executable);
  const normalizedSql = normalizeSql(sql);
  const forbidden =
    /\b(insert|update|delete|merge|drop|alter|create|truncate|grant|revoke|copy|call|do|execute|set|reset|vacuum|analyze|refresh|comment)\b/i;

  if (statements.length !== 1 || !normalizedExecutable.startsWith("with ")) {
    findings.push("Live verifier must contain exactly one CTE-backed SELECT statement.");
  }
  if (forbidden.test(executable)) {
    findings.push("Live verifier must not contain a mutating or administrative SQL command.");
  }
  if (
    !/select\s+check_name,\s*passed,\s*expected_value,\s*actual_value\s+from\s+checks/i.test(sql)
  ) {
    findings.push("Live verifier must return only bounded check summaries.");
  }

  const expected = migrationExpectations(migration);
  if (!sameSet(extractExpectedNames(sql, "expected_tables"), CORE_TABLES)) {
    findings.push("Live verifier table set must match the 18 Phase 9 migration tables.");
  }
  if (!sameSet(extractExpectedNames(sql, "expected_tables"), expected.tables)) {
    findings.push("Live verifier table set must match the committed migration.");
  }
  if (!sameSet(extractExpectedNames(sql, "expected_indexes"), expected.indexes)) {
    findings.push("Live verifier index set must match the committed migration.");
  }
  if (
    !sameSet(
      extractExpectedValues(sql, "expected_domain_foreign_keys"),
      expected.domainForeignKeySignatures,
    )
  ) {
    findings.push("Live verifier foreign-key set must match the committed migration.");
  }
  if (
    !normalizedSql.includes(`(select count(*) from foreign_keys) = ${expected.totalForeignKeys}`)
  ) {
    findings.push("Live verifier total foreign-key count must match the committed migration.");
  }

  validateLineage(sql, migration, findings);

  if (!sameSet(extractExpectedNames(sql, "expected_api_roles"), REQUIRED_API_ROLES)) {
    findings.push("Live verifier must check every API role revoked by the migration.");
  }
  const normalizedMigration = normalizeSql(migration);
  const apiGrantees = ["public", ...REQUIRED_API_ROLES].join(",");
  const requiredRevocations = [
    `revoke all on schema institutionlens from ${apiGrantees}`,
    `revoke all on all tables in schema institutionlens from ${apiGrantees}`,
    `revoke all on all sequences in schema institutionlens from ${apiGrantees}`,
    `revoke execute on all functions in schema institutionlens from ${apiGrantees}`,
  ];
  if (requiredRevocations.some((revocation) => !normalizedMigration.includes(revocation))) {
    findings.push("Committed migration API-role revocations changed.");
  }

  const checkNames = [...sql.matchAll(/select\s+'([a-z0-9_]+)'/gi)].flatMap((match) =>
    match[1] ? [match[1]] : [],
  );
  if (
    checkNames.length !== REQUIRED_CHECK_NAMES.length ||
    !sameSet(checkNames, REQUIRED_CHECK_NAMES)
  ) {
    findings.push("Live verifier must retain exactly the 12 required checks.");
  }

  for (const token of REQUIRED_CATALOG_TOKENS) {
    if (!sql.toLowerCase().includes(token)) {
      findings.push(`Live verifier is missing catalog gate: ${token}.`);
    }
  }
  for (const table of CORE_TABLES) {
    const escapedTable = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rowProbeCount = countMatches(
      sql,
      new RegExp(`select\\s+1\\s+from\\s+institutionlens\\.${escapedTable}\\b`, "gi"),
    );
    const directReferenceCount = countMatches(
      sql,
      new RegExp(`from\\s+institutionlens\\.${escapedTable}\\b`, "gi"),
    );
    if (rowProbeCount !== 1 || directReferenceCount !== 1) {
      findings.push(
        `Live verifier may reference ${table} only through its bounded zero-row probe.`,
      );
    }
  }

  if (
    !normalizedSql.includes("or not relation.relrowsecurity or not relation.relforcerowsecurity")
  ) {
    findings.push("Live verifier must fail unless RLS is enabled and forced on every table.");
  }
  if (
    !normalizedSql.includes(
      "'index_set',count(*) = 0 and (select count(*) from index_validity_violations) = 0",
    )
  ) {
    findings.push("Live verifier must fail on missing, extra, or unusable indexes.");
  }
  if (!normalizedSql.includes("select 'rls_policy_count',value = 0,'0',value::text")) {
    findings.push("Live verifier must fail on any RLS policy.");
  }

  const privilegeCheck = normalizedSql.match(
    /'api_role_privileges',([\s\S]*?)union all select 'application_row_count'/,
  )?.[1];
  const privilegeSources = [
    "schema_acl_violations",
    "relation_acl_violations",
    "function_acl_violations",
    "default_acl_violations",
    "effective_role_privilege_violations",
  ];
  if (
    !privilegeCheck ||
    privilegeSources.some(
      (source) => countMatches(privilegeCheck, new RegExp(`from ${source}\\b`, "g")) !== 2,
    )
  ) {
    findings.push("Live verifier must fail on any API-role privilege.");
  }
  if (!normalizedSql.includes("select 'application_row_count',not value,'0 rows'")) {
    findings.push("Live verifier must fail when any Phase 9 application row exists.");
  }
  if (!sql.includes(`version = '${PHASE_9_MIGRATION_VERSION}'`)) {
    findings.push("Live verifier must require only the expected Phase 9 migration version.");
  }
  if (!normalizedSql.includes("total_count = 1 and expected_count = 1")) {
    findings.push("Live verifier must reject additional migration-history rows.");
  }

  return findings;
}

export function readAndValidatePhase9LiveVerifier(): string[] {
  const sql = fs.readFileSync(PHASE_9_LIVE_VERIFIER_PATH, "utf8");
  const migration = fs.readFileSync(PHASE_9_MIGRATION_PATH, "utf8");
  return validatePhase9LiveVerifier(sql, migration);
}
