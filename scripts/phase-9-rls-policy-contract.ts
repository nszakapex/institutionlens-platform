import fs from "node:fs";
import path from "node:path";
import { CORE_TABLES, PRIVILEGED_API_ROLE } from "./phase-9-schema-contract";

export const PHASE_9_RLS_MIGRATION_FILENAME = "20260715200000_phase9_authenticated_read_rls.sql";

export const PHASE_9_RLS_MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  PHASE_9_RLS_MIGRATION_FILENAME,
);

export const PHASE_9_RLS_ROLLBACK_PATH = path.join(
  process.cwd(),
  "supabase",
  "rollback",
  PHASE_9_RLS_MIGRATION_FILENAME,
);

export const PHASE_9_RLS_MIGRATION_VERSION = "20260715200000";
export const PHASE_9_APPLIED_MIGRATION_CEILING = "20260715181000";

export const EXPECTED_SELECT_POLICIES = CORE_TABLES.map((table) => `${table}_select_authenticated`);

export const WITHHELD_COLUMNS = [
  { table: "provenance_records", column: "private_notes" },
  { table: "provenance_records", column: "source_reference" },
  { table: "organization_overlays", column: "private_notes" },
  { table: "memberships", column: "user_id" },
] as const;

/** Tables viewers must never read (owner/analyst-only policies). */
export const VIEWER_DENIED_TABLES = [
  "import_runs",
  "provenance_records",
  "organization_overlays",
  "audit_events",
] as const;

/**
 * Explicit publication-safe column allowlist for every table a viewer can reach.
 * Role-wide `authenticated` grants on these tables must equal this set. Viewer row
 * policies must further restrict research rows to publication_eligibility = 'eligible'
 * (and briefs to approved + eligible), so granted columns are never unpublished.
 */
export const VIEWER_PUBLICATION_SAFE_COLUMN_ALLOWLIST: Readonly<Record<string, readonly string[]>> =
  {
    tenants: [
      "id",
      "public_ref",
      "display_name",
      "status",
      "data_classification",
      "demo",
      "created_at",
      "updated_at",
      "suspended_at",
      "deletion_requested_at",
    ],
    tenant_verticals: [
      "id",
      "tenant_id",
      "vertical_id",
      "adapter_version",
      "status",
      "created_at",
      "updated_at",
    ],
    memberships: [
      "id",
      "tenant_id",
      "public_ref",
      "role",
      "status",
      "invited_by_membership_id",
      "invited_at",
      "joined_at",
      "suspended_at",
      "removed_at",
      "created_at",
      "updated_at",
    ],
    organizations: [
      "id",
      "tenant_id",
      "public_ref",
      "source_key",
      "vertical_id",
      "adapter_version",
      "display_name",
      "legal_name",
      "organization_type",
      "lifecycle_status",
      "primary_location",
      "summary",
      "tags",
      "external_references",
      "vertical_payload",
      "synthetic",
      "data_classification",
      "domain_schema_version",
      "created_at",
      "updated_at",
      "archived_at",
    ],
    evidence_records: [
      "id",
      "tenant_id",
      "organization_id",
      "provenance_id",
      "import_run_id",
      "source_key",
      "vertical_id",
      "adapter_version",
      "evidence_type",
      "epistemic_status",
      "access_classification",
      "title",
      "summary",
      "observation",
      "safe_search_text",
      "observed_at",
      "effective_period_start",
      "effective_period_end",
      "freshness",
      "confidence",
      "publication_eligibility",
      "calculation_descriptor",
      "rule_set_ref",
      "staleness_reason",
      "synthetic",
      "data_classification",
      "domain_schema_version",
      "created_at",
      "updated_at",
      "superseded_at",
    ],
    evidence_dependencies: [
      "id",
      "tenant_id",
      "organization_id",
      "evidence_id",
      "input_evidence_id",
      "created_at",
    ],
    assessment_runs: [
      "id",
      "tenant_id",
      "public_ref",
      "organization_id",
      "vertical_id",
      "adapter_version",
      "portfolio_ref",
      "portfolio_version",
      "methodology_version",
      "engine_version",
      "domain_schema_version",
      "evidence_fingerprint",
      "output_fingerprint",
      "manifest",
      "status",
      "publication_eligibility",
      "synthetic",
      "failure_code",
      "requested_at",
      "started_at",
      "completed_at",
      "published_at",
      "created_at",
    ],
    assessment_results: [
      "id",
      "tenant_id",
      "assessment_run_id",
      "organization_id",
      "fit_status",
      "points_awarded",
      "points_possible",
      "observed_fit_band",
      "confidence",
      "freshness",
      "completeness",
      "publication_eligibility",
      "coverage",
      "opportunity_contexts",
      "assessed_at",
      "created_at",
    ],
    capability_results: [
      "id",
      "tenant_id",
      "assessment_run_id",
      "assessment_result_id",
      "organization_id",
      "capability_ref",
      "rule_set_ref",
      "rule_set_version",
      "fit_status",
      "points_awarded",
      "points_possible",
      "observed_fit_band",
      "confidence",
      "freshness",
      "completeness",
      "publication_eligibility",
      "assessed_at",
      "created_at",
    ],
    rule_results: [
      "id",
      "tenant_id",
      "organization_id",
      "assessment_run_id",
      "capability_result_id",
      "rule_ref",
      "rule_set_version",
      "factor_category",
      "outcome",
      "points_awarded",
      "maximum_points",
      "reason",
      "reason_code",
      "epistemic_states",
      "freshness_states",
      "publication_eligibility",
      "evaluated_at",
      "engine_version",
      "synthetic",
      "created_at",
    ],
    rule_result_evidence: [
      "id",
      "tenant_id",
      "organization_id",
      "rule_result_id",
      "evidence_id",
      "created_at",
    ],
    saved_comparisons: [
      "id",
      "tenant_id",
      "public_ref",
      "created_by_membership_id",
      "name",
      "status",
      "created_at",
      "updated_at",
      "archived_at",
    ],
    saved_comparison_organizations: [
      "id",
      "tenant_id",
      "saved_comparison_id",
      "organization_id",
      "position",
      "created_at",
    ],
    brief_snapshots: [
      "id",
      "tenant_id",
      "public_ref",
      "organization_id",
      "assessment_run_id",
      "created_by_membership_id",
      "approved_by_membership_id",
      "template_version",
      "state",
      "publication_eligibility",
      "content_fingerprint",
      "content",
      "source_manifest",
      "created_at",
      "updated_at",
      "approved_at",
      "retention_expires_at",
    ],
  };

export const VIEWER_PUBLICATION_GATED_TABLES = [
  "evidence_records",
  "assessment_runs",
  "assessment_results",
  "capability_results",
  "rule_results",
  "brief_snapshots",
] as const;

export const SELF_ONLY_TABLES = ["memberships", "saved_comparisons"] as const;

/** Exact authenticated column-grant matrix for every core table (column-only SELECT). */
export const AUTHENTICATED_COLUMN_GRANT_MATRIX: Readonly<Record<string, readonly string[]>> = {
  ...VIEWER_PUBLICATION_SAFE_COLUMN_ALLOWLIST,
  import_runs: [
    "id",
    "tenant_id",
    "public_ref",
    "initiated_by_membership_id",
    "source_key",
    "idempotency_key",
    "input_checksum",
    "contract_version",
    "source_policy_version",
    "status",
    "dry_run",
    "record_counts",
    "safe_error_summary",
    "queued_at",
    "started_at",
    "finished_at",
    "cleanup_after",
    "created_at",
  ],
  provenance_records: [
    "id",
    "tenant_id",
    "import_run_id",
    "source_key",
    "source_type",
    "source_name",
    "retrieved_at",
    "published_at",
    "reporting_period_start",
    "reporting_period_end",
    "checksum",
    "license_status",
    "access_classification",
    "validation_status",
    "synthetic",
    "data_classification",
    "created_at",
    "updated_at",
  ],
  organization_overlays: [
    "id",
    "tenant_id",
    "organization_id",
    "schema_version",
    "relationship_status",
    "capability_usage",
    "match_status",
    "review_status",
    "source_classification",
    "effective_at",
    "created_at",
    "updated_at",
  ],
  audit_events: [
    "id",
    "tenant_id",
    "event_ref",
    "actor_membership_ref",
    "request_id",
    "event_type",
    "outcome",
    "target_type",
    "target_opaque_ref",
    "redacted_metadata",
    "occurred_at",
    "retention_expires_at",
  ],
};

export function authenticatedColumnGrantPairs(): readonly {
  table: string;
  column: string;
}[] {
  return Object.entries(AUTHENTICATED_COLUMN_GRANT_MATRIX).flatMap(([table, columns]) =>
    columns.map((column) => ({ table, column })),
  );
}

function normalizeSql(sql: string): string {
  return sql
    .replace(/--[^\r\n]*/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim()
    .toLowerCase();
}

function extractGrantSelectBlocks(normalized: string): string[] {
  return [...normalized.matchAll(/grant select\b[^;]*;/g)].map((match) => match[0] ?? "");
}

export function parseColumnGrants(normalized: string): Map<string, string[]> {
  const grants = new Map<string, string[]>();
  for (const block of extractGrantSelectBlocks(normalized)) {
    const match = block.match(
      /grant select\s*\((?<columns>[^)]*)\)\s*on table institutionlens\.(?<table>[a-z0-9_]+)/,
    );
    const columnsText = match?.groups?.columns;
    const table = match?.groups?.table;
    if (!columnsText || !table) {
      continue;
    }
    const columns = columnsText
      .split(",")
      .map((column) => column.trim())
      .filter(Boolean)
      .sort();
    grants.set(table, columns);
  }
  return grants;
}

function extractPolicyBody(normalized: string, table: string): string | null {
  const match = normalized.match(
    new RegExp(
      `create policy ${table}_select_authenticated on institutionlens\\.${table} for select to authenticated using \\((?<body>[\\s\\S]*?)\\);`,
    ),
  );
  return match?.groups?.body ?? null;
}

function sortedEqual(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

function countMatches(value: string, pattern: RegExp): number {
  return [...value.matchAll(pattern)].length;
}

export function validateAuthenticatedColumnGrantMatrix(sql: string): string[] {
  const findings: string[] = [];
  const normalized = normalizeSql(sql);
  const grants = parseColumnGrants(normalized);
  const matrixTables = Object.keys(AUTHENTICATED_COLUMN_GRANT_MATRIX).sort();
  const coreSorted = [...CORE_TABLES].sort();
  if (!sortedEqual(matrixTables, coreSorted)) {
    findings.push(
      "Authenticated column-grant matrix must cover every InstitutionLens core table exactly once.",
    );
  }

  for (const table of CORE_TABLES) {
    const granted = grants.get(table);
    const expected = [...(AUTHENTICATED_COLUMN_GRANT_MATRIX[table] ?? [])].sort();
    if (!granted) {
      findings.push(`Missing required column SELECT grants for ${table}.`);
      continue;
    }
    if (!sortedEqual(granted, expected)) {
      findings.push(
        `Authenticated column-grant matrix mismatch for ${table}: missing or extra column grants are not acceptable.`,
      );
    }
  }

  for (const withheld of WITHHELD_COLUMNS) {
    const granted = grants.get(withheld.table) ?? [];
    if (granted.includes(withheld.column)) {
      findings.push(
        `Authenticated grants must not expose withheld column ${withheld.table}.${withheld.column}.`,
      );
    }
    const matrixColumns = AUTHENTICATED_COLUMN_GRANT_MATRIX[withheld.table] ?? [];
    if (matrixColumns.includes(withheld.column)) {
      findings.push(
        `Authenticated column-grant matrix must not include withheld column ${withheld.table}.${withheld.column}.`,
      );
    }
  }

  return findings;
}

export function validateViewerPublicationSafeAllowlist(sql: string): string[] {
  const findings: string[] = [];
  const normalized = normalizeSql(sql);
  const grants = parseColumnGrants(normalized);

  const allowlistedTables = Object.keys(VIEWER_PUBLICATION_SAFE_COLUMN_ALLOWLIST).sort();
  const expectedViewerTables = [...allowlistedTables, ...VIEWER_DENIED_TABLES].sort();
  const coreSorted = [...CORE_TABLES].sort();
  if (!sortedEqual(expectedViewerTables, coreSorted)) {
    findings.push(
      "Viewer allowlist plus denied tables must cover every InstitutionLens core table exactly once.",
    );
  }

  findings.push(...validateAuthenticatedColumnGrantMatrix(sql));

  for (const [table, allowedColumns] of Object.entries(VIEWER_PUBLICATION_SAFE_COLUMN_ALLOWLIST)) {
    const granted = grants.get(table);
    if (!granted) {
      findings.push(`Missing column grants for viewer-accessible table ${table}.`);
      continue;
    }
    const expected = [...allowedColumns].sort();
    if (!sortedEqual(granted, expected)) {
      findings.push(
        `Viewer allowlist mismatch for ${table}: granted columns must equal the publication-safe allowlist.`,
      );
    }
    for (const withheld of WITHHELD_COLUMNS) {
      if (withheld.table === table && granted.includes(withheld.column)) {
        findings.push(
          `Viewer-accessible table ${table} must not grant withheld column ${withheld.column}.`,
        );
      }
    }
    if (granted.includes("private_notes") || granted.includes("source_reference")) {
      findings.push(
        `Viewer-accessible table ${table} must not grant private or raw-reference fields.`,
      );
    }
  }

  for (const table of VIEWER_DENIED_TABLES) {
    const body = extractPolicyBody(normalized, table);
    if (!body) {
      findings.push(`Missing policy body for viewer-denied table ${table}.`);
      continue;
    }
    if (body.includes("array['viewer']") || body.includes('array["viewer"]')) {
      findings.push(`Viewer-denied table ${table} must not include a viewer role allow path.`);
    }
    if (
      !body.includes("active_member_has_roles(tenant_id, array['owner'") &&
      !body.includes("active_member_has_roles(tenant_id, array['owner', 'analyst']")
    ) {
      findings.push(`Viewer-denied table ${table} must require owner or owner/analyst roles.`);
    }
  }

  for (const table of VIEWER_PUBLICATION_GATED_TABLES) {
    const body = extractPolicyBody(normalized, table);
    if (!body) {
      findings.push(`Missing policy body for publication-gated table ${table}.`);
      continue;
    }
    if (
      !body.includes("array['viewer']") ||
      !body.includes("publication_eligibility = 'eligible'")
    ) {
      findings.push(
        `Publication-gated table ${table} must require viewer + publication_eligibility = 'eligible'.`,
      );
    }
  }

  const briefBody = extractPolicyBody(normalized, "brief_snapshots");
  if (briefBody) {
    if (
      briefBody.includes(
        "created_by_membership_id in (select institutionlens.own_membership_ids())",
      ) &&
      !briefBody.includes(
        "created_by_membership_id in (select institutionlens.own_membership_ids()) and institutionlens.active_member_has_roles(tenant_id, array['owner', 'analyst']",
      )
    ) {
      findings.push(
        "Brief drafts must be owner/analyst creator-scoped only; viewers cannot read unpublished brief content.",
      );
    }
    if (!briefBody.includes("state = 'approved'")) {
      findings.push("Viewer brief access must require approved state.");
    }
  }

  return findings;
}

export function validatePhase9RlsMigration(sql: string): string[] {
  const findings: string[] = [];
  const normalized = normalizeSql(sql);
  const grantBlocks = extractGrantSelectBlocks(normalized);

  if (!normalized.startsWith("begin;")) {
    findings.push("RLS migration must start in a transaction.");
  }
  if (!normalized.endsWith("commit;")) {
    findings.push("RLS migration must commit its transaction.");
  }
  if (!normalized.includes("auth.uid()")) {
    findings.push("RLS migration must bind principals through auth.uid().");
  }
  if (!normalized.includes("memberships.user_id = (select auth.uid())")) {
    findings.push("RLS migration must resolve tenants from memberships.user_id = auth.uid().");
  }
  if (!normalized.includes("memberships.status = 'active'")) {
    findings.push("RLS migration must require active memberships.");
  }
  if (
    normalized.includes("current_setting(") ||
    normalized.includes("request.jwt") ||
    normalized.includes("auth.jwt(")
  ) {
    findings.push("RLS migration must not derive tenant identity from JWT claims or settings.");
  }
  if (normalized.includes("using (true)") || normalized.includes("with check (true)")) {
    findings.push("RLS migration must not use permissive true predicates.");
  }
  if (/\bfor\s+(all|insert|update|delete)\b/.test(normalized)) {
    findings.push("RLS migration must not create write or FOR ALL policies.");
  }
  const deniedRoleAlternation = `public|anon|${PRIVILEGED_API_ROLE}`;
  if (new RegExp(`\\bto\\s+(${deniedRoleAlternation})\\b`).test(normalized)) {
    findings.push(
      `RLS migration must not target public, anon, or ${PRIVILEGED_API_ROLE} in policies.`,
    );
  }
  if (!normalized.includes("grant usage on schema institutionlens to authenticated")) {
    findings.push("RLS migration must grant schema usage to authenticated only.");
  }
  if (
    new RegExp(`\\bgrant\\b[^;]*\\bto\\b[^;]*\\b(${deniedRoleAlternation})\\b`).test(normalized)
  ) {
    findings.push(
      `RLS migration must not grant privileges to public, anon, or ${PRIVILEGED_API_ROLE}.`,
    );
  }
  if (!normalized.includes("revoke insert, update, delete, truncate, references, trigger")) {
    findings.push("RLS migration must revoke write privileges from authenticated.");
  }

  if (
    /grant select on table\b/.test(normalized) ||
    /grant select on institutionlens\./.test(normalized)
  ) {
    findings.push(
      "RLS migration must not use table-level SELECT grants; use explicit column grants only.",
    );
  }
  for (const table of CORE_TABLES) {
    const hasColumnGrant = grantBlocks.some(
      (block) => block.includes("grant select (") && block.includes(`institutionlens.${table}`),
    );
    if (!hasColumnGrant) {
      findings.push(`RLS migration must declare an explicit column SELECT grant for ${table}.`);
    }
  }

  for (const withheld of WITHHELD_COLUMNS) {
    const granted = grantBlocks.some(
      (block) =>
        block.includes(`institutionlens.${withheld.table}`) &&
        new RegExp(`\\b${withheld.column}\\b`).test(block),
    );
    if (granted) {
      findings.push(`RLS migration must not grant select on ${withheld.table}.${withheld.column}.`);
    }
    if (
      !normalized.includes(
        `revoke select (${withheld.column}) on table institutionlens.${withheld.table}`,
      )
    ) {
      findings.push(
        `RLS migration must explicitly revoke ${withheld.table}.${withheld.column} from authenticated.`,
      );
    }
  }

  if (!/access_classification\s*<>\s*'restricted'/.test(normalized)) {
    findings.push("RLS migration must gate restricted evidence/provenance rows.");
  }
  if (!normalized.includes("array['owner', 'analyst']")) {
    findings.push("RLS migration must require owner/analyst roles for overlay reads.");
  }
  if (!normalized.includes("array['owner']")) {
    findings.push("RLS migration must require owner role for restricted and audit reads.");
  }
  if (!normalized.includes("publication_eligibility = 'eligible'")) {
    findings.push(
      "RLS migration must constrain viewer research reads to publication-eligible rows.",
    );
  }
  if (!normalized.includes("using (user_id = (select auth.uid()))")) {
    findings.push("RLS migration must keep memberships self-only via auth.uid().");
  }
  if (
    !normalized.includes(
      "created_by_membership_id in (select institutionlens.own_membership_ids())",
    )
  ) {
    findings.push("RLS migration must keep creator-scoped tables bound to own_membership_ids().");
  }
  if (!normalized.includes("security definer")) {
    findings.push("RLS migration must use narrow security-definer membership helpers.");
  }
  if (!normalized.includes("set search_path = institutionlens, pg_catalog")) {
    findings.push("RLS helpers must pin search_path.");
  }
  if (!normalized.includes("own_membership_ids()")) {
    findings.push("RLS migration must expose own_membership_ids for self-owned row predicates.");
  }
  if (normalized.includes("execute(") || normalized.includes("format(")) {
    findings.push("RLS helpers must not use dynamic SQL.");
  }
  if (/\bcreate\s+(or\s+replace\s+)?(materialized\s+)?view\b/.test(normalized)) {
    findings.push("RLS migration must not create views that could re-expose withheld columns.");
  }
  if (/\binsert\s+into\b/.test(normalized) || /\bupdate\s+institutionlens\./.test(normalized)) {
    findings.push("RLS migration must not insert or mutate application data.");
  }
  if (/\b(alter\s+table|drop\s+table|create\s+table)\b/.test(normalized)) {
    findings.push("RLS migration must not perform unintended table DDL.");
  }

  const membershipBody = extractPolicyBody(normalized, "memberships");
  if (membershipBody && membershipBody !== "user_id = (select auth.uid())") {
    findings.push("Memberships policy must be exactly self-only via auth.uid().");
  }
  const comparisonsBody = extractPolicyBody(normalized, "saved_comparisons");
  if (
    comparisonsBody &&
    !comparisonsBody.includes(
      "created_by_membership_id in (select institutionlens.own_membership_ids())",
    )
  ) {
    findings.push("Saved comparisons must be creator-scoped via own_membership_ids().");
  }
  const comparisonOrgsBody = extractPolicyBody(normalized, "saved_comparison_organizations");
  if (
    comparisonOrgsBody &&
    !comparisonOrgsBody.includes("from institutionlens.saved_comparisons comparison")
  ) {
    findings.push(
      "Saved comparison organization edges must require a visible parent comparison under RLS.",
    );
  }

  // Helpers must only project caller membership ids/tenants/booleans.
  for (const match of normalized.matchAll(
    /security definer set search_path = institutionlens, pg_catalog as \$\$([\s\S]*?)\$\$/g,
  )) {
    const body = match[1] ?? "";
    if (/private_notes|source_reference/.test(body)) {
      findings.push("SECURITY DEFINER helpers must not project private or raw-reference fields.");
    }
    if (
      !/memberships\.(tenant_id|id|user_id|status|role)\b/.test(body) &&
      body.includes("select")
    ) {
      findings.push("SECURITY DEFINER helpers must read only membership binding columns.");
    }
  }

  for (const policyName of EXPECTED_SELECT_POLICIES) {
    const clause = `create policy ${policyName}`;
    if (!normalized.includes(clause)) {
      findings.push(`Missing SELECT policy: ${policyName}.`);
    } else if (!normalized.includes(`${clause} on institutionlens.`)) {
      findings.push(`Policy ${policyName} must target the institutionlens schema.`);
    }
  }

  const policyCount = countMatches(normalized, /create policy /g);
  if (policyCount !== EXPECTED_SELECT_POLICIES.length) {
    findings.push(
      `RLS migration must define exactly ${EXPECTED_SELECT_POLICIES.length} SELECT policies.`,
    );
  }

  findings.push(...validateViewerPublicationSafeAllowlist(sql));

  return findings;
}

export function validatePhase9RlsRollback(sql: string): string[] {
  const findings: string[] = [];
  const normalized = normalizeSql(sql);

  if (!sql.includes("DESTRUCTIVE")) {
    findings.push("RLS rollback must carry an explicit DESTRUCTIVE warning.");
  }
  if (!normalized.startsWith("begin;") || !normalized.endsWith("commit;")) {
    findings.push("RLS rollback must be transactional.");
  }
  if (!normalized.includes("drop policy if exists")) {
    findings.push("RLS rollback must drop authenticated SELECT policies.");
  }
  for (const policyName of EXPECTED_SELECT_POLICIES) {
    if (!normalized.includes(`drop policy if exists ${policyName}`)) {
      findings.push(`RLS rollback must drop ${policyName}.`);
    }
  }
  if (
    !normalized.includes(
      `revoke all on all tables in schema institutionlens from public, anon, authenticated, ${PRIVILEGED_API_ROLE}`,
    )
  ) {
    findings.push("RLS rollback must revoke authenticated and denied-role table privileges.");
  }
  if (!normalized.includes("drop function if exists institutionlens.accessible_tenant_ids")) {
    findings.push("RLS rollback must drop accessible_tenant_ids helper.");
  }
  if (!normalized.includes("drop function if exists institutionlens.own_membership_ids")) {
    findings.push("RLS rollback must drop own_membership_ids helper.");
  }
  if (!normalized.includes("drop function if exists institutionlens.active_member_has_roles")) {
    findings.push("RLS rollback must drop active_member_has_roles helper.");
  }
  if (normalized.includes("drop schema")) {
    findings.push("RLS rollback must not drop the institutionlens schema.");
  }
  if (/\bgrant\b/.test(normalized)) {
    findings.push("RLS rollback must not grant privileges (deny-all restore only).");
  }

  return findings;
}

export function readAndValidatePhase9RlsPolicies(): string[] {
  const migration = fs.readFileSync(PHASE_9_RLS_MIGRATION_PATH, "utf8");
  const rollback = fs.readFileSync(PHASE_9_RLS_ROLLBACK_PATH, "utf8");
  const findings = [
    ...validatePhase9RlsMigration(migration),
    ...validatePhase9RlsRollback(rollback),
  ];
  if (PHASE_9_RLS_MIGRATION_VERSION <= PHASE_9_APPLIED_MIGRATION_CEILING) {
    findings.push(
      "RLS migration version must be later than the currently applied migration ceiling.",
    );
  }
  return findings;
}
