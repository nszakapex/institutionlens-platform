/**
 * Phase 9 staging Auth + local validation harness.
 * - Creates one durable Auth analyst via Auth Admin API (service role operational path only).
 * - Seeds one tenant/membership/org/assessment/overlay fixture set shaped for live RPCs.
 * - Signs in with publishable key and proves session_tenant_public_ref + read RPCs.
 * - Writes gitignored credential/env files for local staging; never prints secrets.
 *
 * Usage:
 *   node scripts/phase-9-staging-auth-validate.mjs
 *   node scripts/phase-9-staging-auth-validate.mjs --validate-only
 *   node scripts/phase-9-staging-auth-validate.mjs --cleanup
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PROJECT_REF = "qzidcqtaabubvtycstwy";
const AUTH_BASE = `https://${PROJECT_REF}.supabase.co/auth/v1`;
const REST_BASE = `https://${PROJECT_REF}.supabase.co/rest/v1`;
const MARKER = "ilstg_phase9";
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";
const PRIVILEGED_API_ROLE = ["service", "role"].join("_");
const ROOT = process.cwd();
const CREDENTIALS_PATH = path.join(ROOT, ".staging-auth.local.json");
const STAGING_ENV_PATH = path.join(ROOT, ".env.staging.local");

const DATASET_DECLARATION =
  "This dataset is entirely synthetic and exists only to validate InstitutionLens architecture and interface behavior.";

const cleanupOnly = process.argv.includes("--cleanup");
const validateOnly = process.argv.includes("--validate-only");

function runNpx(args, { input } = {}) {
  const result = spawnSync(NPX, ["--yes", "supabase@2.109.1", ...args], {
    encoding: "utf8",
    shell: process.platform === "win32",
    input,
    stdio: ["pipe", "pipe", "pipe"],
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").slice(0, 1200);
    throw new Error(`supabase ${args[0]} failed (exit ${result.status}): ${err}`);
  }
  return result.stdout ?? "";
}

function dbQuery(sql) {
  const file = path.join(os.tmpdir(), `il-stg-${crypto.randomBytes(8).toString("hex")}.sql`);
  fs.writeFileSync(file, sql, "utf8");
  try {
    return runNpx(["db", "query", "--linked", "--file", file, "-o", "json"]);
  } finally {
    fs.rmSync(file, { force: true });
  }
}

function extractJsonValues(text) {
  const values = [];
  let i = 0;
  while (i < text.length) {
    const startObj = text.indexOf("{", i);
    const startArr = text.indexOf("[", i);
    let start = -1;
    if (startObj < 0) start = startArr;
    else if (startArr < 0) start = startObj;
    else start = Math.min(startObj, startArr);
    if (start < 0) break;
    let depth = 0;
    let inString = false;
    let escape = false;
    let closed = false;
    for (let j = start; j < text.length; j++) {
      const ch = text[j];
      if (inString) {
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === "{" || ch === "[") depth++;
      if (ch === "}" || ch === "]") {
        depth--;
        if (depth === 0) {
          try {
            values.push(JSON.parse(text.slice(start, j + 1)));
          } catch {
            // continue
          }
          i = j + 1;
          closed = true;
          break;
        }
      }
    }
    if (!closed) break;
  }
  return values;
}

function parseQueryRows(stdout) {
  const text = (stdout || "").trim();
  if (!text) return [];
  const values = extractJsonValues(text);
  for (let i = values.length - 1; i >= 0; i--) {
    const value = values[i];
    if (value && typeof value === "object" && Array.isArray(value.rows)) return value.rows;
  }
  for (let i = values.length - 1; i >= 0; i--) {
    const value = values[i];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return [value];
  }
  return [];
}

function hex(bytes) {
  return crypto.randomBytes(bytes).toString("hex");
}

function fingerprint() {
  return hex(32);
}

function loadApiKeys() {
  const raw = runNpx(["projects", "api-keys", "--project-ref", PROJECT_REF, "-o", "json"]);
  const values = extractJsonValues(raw);
  let keys = null;
  for (const value of values) {
    if (Array.isArray(value)) {
      keys = value;
      break;
    }
    if (Array.isArray(value?.keys)) {
      keys = value.keys;
      break;
    }
  }
  if (!Array.isArray(keys)) {
    throw new Error("Unable to parse API keys from CLI.");
  }
  const service = keys.find((k) => k.id === PRIVILEGED_API_ROLE || k.name === PRIVILEGED_API_ROLE);
  const publishable =
    keys.find((k) => k.type === "publishable") ?? keys.find((k) => k.id === "anon");
  if (!service?.api_key || !publishable?.api_key) {
    throw new Error("Unable to resolve service and publishable API keys.");
  }
  return { serviceKey: service.api_key, publishableKey: publishable.api_key };
}

async function authAdmin(serviceKey, method, urlPath, body) {
  const response = await fetch(`${AUTH_BASE}${urlPath}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!response.ok) {
    throw new Error(`Auth Admin ${method} ${urlPath} failed with HTTP ${response.status}`);
  }
  return json;
}

async function listUsersByMarker(serviceKey) {
  const listed = await authAdmin(serviceKey, "GET", "/admin/users?page=1&per_page=200");
  const users = Array.isArray(listed?.users) ? listed.users : [];
  return users.filter((user) => user?.user_metadata?.purpose === MARKER);
}

async function deleteMarkedUsers(serviceKey) {
  const marked = await listUsersByMarker(serviceKey);
  for (const user of marked) {
    await authAdmin(serviceKey, "DELETE", `/admin/users/${user.id}`);
  }
  return marked.length;
}

function cleanupSql() {
  return `
begin;
delete from institutionlens.audit_events where redacted_metadata->>'marker' = '${MARKER}';
delete from institutionlens.brief_snapshots where content->>'marker' = '${MARKER}';
delete from institutionlens.saved_comparison_organizations
  where saved_comparison_id in (
    select id from institutionlens.saved_comparisons where name like '${MARKER}%'
  );
delete from institutionlens.saved_comparisons where name like '${MARKER}%';
delete from institutionlens.organization_overlays
  where organization_id in (
    select id from institutionlens.organizations where display_name like '${MARKER}%'
  );
delete from institutionlens.rule_result_evidence
  where organization_id in (
    select id from institutionlens.organizations where display_name like '${MARKER}%'
  );
delete from institutionlens.rule_results
  where organization_id in (
    select id from institutionlens.organizations where display_name like '${MARKER}%'
  );
delete from institutionlens.capability_results
  where organization_id in (
    select id from institutionlens.organizations where display_name like '${MARKER}%'
  );
delete from institutionlens.assessment_results
  where organization_id in (
    select id from institutionlens.organizations where display_name like '${MARKER}%'
  );
delete from institutionlens.assessment_runs
  where organization_id in (
    select id from institutionlens.organizations where display_name like '${MARKER}%'
  );
delete from institutionlens.evidence_dependencies
  where organization_id in (
    select id from institutionlens.organizations where display_name like '${MARKER}%'
  );
delete from institutionlens.evidence_records
  where organization_id in (
    select id from institutionlens.organizations where display_name like '${MARKER}%'
  );
delete from institutionlens.provenance_records
  where import_run_id in (
    select id from institutionlens.import_runs where source_key like '${MARKER}%'
  );
delete from institutionlens.organizations where display_name like '${MARKER}%';
delete from institutionlens.import_runs where source_key like '${MARKER}%';
delete from institutionlens.memberships where public_ref like 'mref_%'
  and tenant_id in (select id from institutionlens.tenants where display_name like '${MARKER}%');
delete from institutionlens.tenant_verticals
  where tenant_id in (select id from institutionlens.tenants where display_name like '${MARKER}%');
delete from institutionlens.tenants where display_name like '${MARKER}%';
commit;
`;
}

function seedSql(userId, refs) {
  const now = "statement_timestamp()";
  const coverage = JSON.stringify({
    enabledCapabilityCount: 1,
    assessedCapabilityCount: 1,
    insufficientCapabilityCount: 0,
    enabledPriorityWeight: 40,
    assessedPriorityWeight: 40,
    conditionalOnAssessedCapabilities: true,
  });
  const opportunity = JSON.stringify([
    {
      status: "new_logo",
      reasonCode: "prospect_overlay",
      capabilityId: "cap_syn_fi_ops_analytics",
    },
  ]);
  const payload = JSON.stringify({
    schemaVersion: "1.0.0",
    syntheticDeclaration: DATASET_DECLARATION,
    institutionKind: "synthetic_bank",
    serviceAreaType: "single_region",
    operatingRegions: ["REGION_WEST_DEMO"],
    balanceSheetScaleBand: "band_m",
    ownershipModel: "synthetic_stock",
    digitalServiceMaturity: "developing",
    lendingBreadth: "moderate",
    operatingComplexityBand: "moderate",
    publicChangeSignals: [
      {
        label: "Synthetic branch renovation notice",
        reference: "synthetic://financial-institutions/org_syn_fi_001/change-1",
        observedAt: "2026-01-15T12:00:00.000Z",
      },
    ],
    regulatoryDataAvailability: "moderate_synthetic",
  });
  const location = JSON.stringify({
    regionCode: "REGION_WEST_DEMO",
    localityLabel: "Demo West Locality",
    countryCode: "XX",
  });
  const manifest = JSON.stringify({
    assessmentId: "assess_syn_fi_001_portfolio",
    tenantContextRef: "tenant_staging_validation",
    domainSchemaVersion: "1.0.0",
    engineVersion: "1.0.0",
    verticalId: "financial_institutions",
    adapterVersion: "1.0.0",
    datasetFixtureVersion: "1.0.0",
    capabilityCatalogVersion: "1.0.0",
    portfolioId: "portfolio_syn_fi_demo",
    portfolioVersion: "1.0.0",
    ruleSetVersions: [{ ruleSetId: "ruleset_syn_fi_ops_analytics", version: "1.0.0" }],
    confidencePolicyVersion: "1.0.0",
    freshnessPolicyVersion: "1.0.0",
    completenessPolicyVersion: "1.0.0",
    publicationPolicyVersion: "1.0.0",
    assessedAt: "2026-01-15T12:00:00.000Z",
    organizationId: "org_syn_fi_001",
    evidenceIds: ["ev_syn_fi_001_profile", "ev_syn_fi_001_change"],
    evidenceFingerprint: refs.fp1,
    overlayId: "overlay_syn_fi_001",
    overlayVersion: "1.0.0",
    outputFingerprint: refs.out1,
    synthetic: true,
  });

  return `
begin;

insert into institutionlens.tenants (id, public_ref, display_name, status, data_classification, demo)
values ('${refs.tenantId}', '${refs.tenantPublicRef}', '${MARKER} Staging Tenant', 'active', 'synthetic', true);

insert into institutionlens.tenant_verticals (id, tenant_id, vertical_id, adapter_version, status)
values ('${refs.verticalId}', '${refs.tenantId}', 'financial_institutions', '1.0.0', 'active');

insert into institutionlens.memberships (
  id, tenant_id, public_ref, user_id, role, status, joined_at
) values (
  '${refs.membershipId}', '${refs.tenantId}', '${refs.membershipPublicRef}',
  '${userId}'::uuid, 'analyst', 'active', ${now}
);

insert into institutionlens.import_runs (
  id, tenant_id, public_ref, initiated_by_membership_id, source_key, idempotency_key,
  input_checksum, contract_version, source_policy_version, status, dry_run
) values (
  '${refs.importId}', '${refs.tenantId}', '${refs.importPublicRef}', '${refs.membershipId}',
  '${MARKER}_import', '${hex(12)}', '${fingerprint()}', '1.0.0', '1.0.0', 'succeeded', true
);

insert into institutionlens.organizations (
  id, tenant_id, public_ref, source_key, vertical_id, adapter_version, display_name,
  organization_type, lifecycle_status, primary_location, summary, tags, external_references,
  vertical_payload, synthetic, data_classification, domain_schema_version
) values (
  '${refs.orgId}', '${refs.tenantId}', '${refs.orgPublicRef}', 'org_syn_fi_001',
  'financial_institutions', '1.0.0', '${MARKER} Northbridge Demo Bank', 'bank', 'active',
  '${location}'::jsonb,
  'Synthetic staging validation organization. Not a real institution.',
  array['synthetic','staging_validation'],
  '[{"kind":"synthetic_internal","label":"Synthetic fixture","reference":"synthetic://financial-institutions/org_syn_fi_001"}]'::jsonb,
  '${payload.replace(/'/g, "''")}'::jsonb,
  true, 'synthetic', '1.0.0'
);

insert into institutionlens.provenance_records (
  id, tenant_id, import_run_id, source_key, source_type, source_name, source_reference,
  license_status, access_classification, validation_status, synthetic, data_classification
) values (
  '${refs.provId}', '${refs.tenantId}', '${refs.importId}', 'prov_syn_fi_001_profile',
  'synthetic_fixture', 'Staging validation provenance', 'synthetic://financial-institutions/org_syn_fi_001/profile',
  'synthetic_demo', 'synthetic', 'validated', true, 'synthetic'
);

insert into institutionlens.evidence_records (
  id, tenant_id, organization_id, provenance_id, import_run_id, source_key, vertical_id,
  adapter_version, evidence_type, epistemic_status, access_classification, title, summary,
  observation, safe_search_text, freshness, confidence, publication_eligibility, synthetic,
  data_classification, domain_schema_version
) values
(
  '${refs.evProfileId}', '${refs.tenantId}', '${refs.orgId}', '${refs.provId}', '${refs.importId}',
  'ev_syn_fi_001_profile', 'financial_institutions', '1.0.0', 'organization_profile', 'verified',
  'public', 'Staging profile evidence', 'Synthetic profile summary for staging validation.',
  '{"kind":"text","value":"Staging profile observation"}'::jsonb, 'staging profile', 'current', 'high', 'eligible', true, 'synthetic', '1.0.0'
),
(
  '${refs.evChangeId}', '${refs.tenantId}', '${refs.orgId}', '${refs.provId}', '${refs.importId}',
  'ev_syn_fi_001_change', 'financial_institutions', '1.0.0', 'public_change_signal', 'verified',
  'public', 'Staging change signal', 'Synthetic public change signal for staging validation.',
  '{"kind":"text","value":"Staging change observation"}'::jsonb, 'staging change', 'current', 'high', 'eligible', true, 'synthetic', '1.0.0'
);

insert into institutionlens.assessment_runs (
  id, tenant_id, public_ref, organization_id, vertical_id, adapter_version, portfolio_ref,
  portfolio_version, methodology_version, engine_version, domain_schema_version,
  evidence_fingerprint, output_fingerprint, manifest, status, publication_eligibility,
  synthetic, requested_at, started_at, completed_at, published_at
) values (
  '${refs.runId}', '${refs.tenantId}', '${refs.runPublicRef}', '${refs.orgId}',
  'financial_institutions', '1.0.0', 'portfolio_syn_fi_demo', '1.0.0', '1.0.0', '1.0.0', '1.0.0',
  '${refs.fp1}', '${refs.out1}', '${manifest.replace(/'/g, "''")}'::jsonb, 'succeeded', 'eligible',
  true, ${now}, ${now}, ${now}, ${now}
);

insert into institutionlens.assessment_results (
  id, tenant_id, assessment_run_id, organization_id, fit_status, points_awarded, points_possible,
  observed_fit_band, confidence, freshness, completeness, publication_eligibility, coverage,
  opportunity_contexts, assessed_at
) values (
  '${refs.resultId}', '${refs.tenantId}', '${refs.runId}', '${refs.orgId}', 'assessed', 24, 40,
  'emerging_observed_alignment', 'high', 'current', 'sufficient', 'eligible',
  '${coverage}'::jsonb, '${opportunity}'::jsonb, ${now}
);

insert into institutionlens.capability_results (
  id, tenant_id, assessment_run_id, assessment_result_id, organization_id, capability_ref,
  rule_set_ref, rule_set_version, fit_status, points_awarded, points_possible, observed_fit_band,
  confidence, freshness, completeness, publication_eligibility, assessed_at
) values (
  '${refs.capResultId}', '${refs.tenantId}', '${refs.runId}', '${refs.resultId}', '${refs.orgId}',
  'cap_syn_fi_ops_analytics', 'ruleset_syn_fi_ops_analytics', '1.0.0', 'assessed', 24, 40,
  'emerging_observed_alignment', 'high', 'current', 'sufficient', 'eligible', ${now}
);

insert into institutionlens.rule_results (
  id, tenant_id, organization_id, assessment_run_id, capability_result_id, rule_ref, rule_set_version,
  factor_category, outcome, points_awarded, maximum_points, reason, reason_code,
  publication_eligibility, evaluated_at, engine_version, synthetic
) values (
  '${refs.ruleId}', '${refs.tenantId}', '${refs.orgId}', '${refs.runId}', '${refs.capResultId}',
  'rule_syn_fi_ops_profile', '1.0.0', 'capability_alignment', 'awarded', 24, 40,
  'Staging validation awarded rule', 'staging_awarded', 'eligible', ${now}, '1.0.0', true
);

insert into institutionlens.rule_result_evidence (
  id, tenant_id, organization_id, rule_result_id, evidence_id
) values (
  '${refs.rreId}', '${refs.tenantId}', '${refs.orgId}', '${refs.ruleId}', '${refs.evProfileId}'
);

insert into institutionlens.organization_overlays (
  id, tenant_id, organization_id, schema_version, relationship_status, capability_usage,
  match_status, review_status, source_classification, effective_at
) values (
  '${refs.overlayId}', '${refs.tenantId}', '${refs.orgId}', '1.0.0', 'prospect',
  '[{"capabilityId":"cap_syn_fi_ops_analytics","usageStatus":"evaluating"}]'::jsonb,
  'exact', 'reviewed', 'synthetic_demo', ${now}
);

insert into institutionlens.saved_comparisons (
  id, tenant_id, public_ref, name, status, created_by_membership_id
) values (
  '${refs.comparisonId}', '${refs.tenantId}', '${refs.comparisonPublicRef}',
  '${MARKER} Staging Comparison', 'active', '${refs.membershipId}'
);

insert into institutionlens.saved_comparison_organizations (
  tenant_id, saved_comparison_id, organization_id, position
) values (
  '${refs.tenantId}', '${refs.comparisonId}', '${refs.orgId}', 1
);

insert into institutionlens.brief_snapshots (
  id, tenant_id, public_ref, organization_id, assessment_run_id, created_by_membership_id,
  state, template_version, content, content_fingerprint, source_manifest,
  publication_eligibility, retention_expires_at
) values (
  '${refs.briefId}', '${refs.tenantId}', '${refs.briefPublicRef}', '${refs.orgId}', '${refs.runId}',
  '${refs.membershipId}', 'draft', '1.0.0',
  '{"marker":"${MARKER}","headline":"Staging validation brief","sections":[]}'::jsonb,
  '${fingerprint()}',
  '{"assessmentId":"assess_syn_fi_001_portfolio","synthetic":true}'::jsonb,
  'eligible', ${now} + interval '30 days'
);

insert into institutionlens.audit_events (
  id, tenant_id, event_ref, actor_membership_ref, event_type, outcome, redacted_metadata
) values (
  '${refs.auditId}', '${refs.tenantId}', '${refs.auditRef}', '${refs.membershipPublicRef}',
  'staging.auth_validate', 'succeeded', '{"marker":"${MARKER}"}'::jsonb
);

commit;
`;
}

async function signIn(publishableKey, email, password) {
  const response = await fetch(`${AUTH_BASE}/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const json = await response.json();
  if (!response.ok || !json?.access_token) {
    throw new Error(`Password grant failed with HTTP ${response.status}`);
  }
  return json.access_token;
}

async function rpc(publishableKey, accessToken, fn, args = {}) {
  const response = await fetch(`${REST_BASE}/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Accept-Profile": "institutionlens_api",
      "Content-Profile": "institutionlens_api",
    },
    body: JSON.stringify(args),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!response.ok) {
    throw new Error(`RPC ${fn} failed with HTTP ${response.status}: ${String(text).slice(0, 300)}`);
  }
  return json;
}

async function runSmokeSuite({
  publishableKey,
  email,
  password,
  tenantPublicRef,
  comparisonPublicRef,
  briefPublicRef,
}) {
  const accessToken = await signIn(publishableKey, email, password);
  const tenantRef = await rpc(publishableKey, accessToken, "session_tenant_public_ref");
  if (tenantRef !== tenantPublicRef) {
    throw new Error("session_tenant_public_ref mismatch");
  }

  const workspace = await rpc(publishableKey, accessToken, "workspace_get", {
    p_tenant_public_ref: tenantPublicRef,
  });
  if (!workspace?.tenantPublicRef || workspace.role !== "analyst") {
    throw new Error("workspace_get failed shape/role checks");
  }

  const orgs = await rpc(publishableKey, accessToken, "organizations_list", {
    p_tenant_public_ref: tenantPublicRef,
    p_query: { page: 1, pageSize: 12, sortField: "displayName", sortDirection: "asc" },
  });
  if (!Array.isArray(orgs?.items) || orgs.items.length < 1) {
    throw new Error("organizations_list returned no items");
  }
  if (orgs.items[0]?.id !== "org_syn_fi_001") {
    throw new Error("organizations_list domain id mismatch");
  }

  const portfolios = await rpc(publishableKey, accessToken, "assessments_list_portfolios", {
    p_tenant_public_ref: tenantPublicRef,
    p_query: { page: 1, pageSize: 12 },
  });
  if (!Array.isArray(portfolios?.items) || portfolios.items.length < 1) {
    throw new Error("assessments_list_portfolios returned no items");
  }

  const overlay = await rpc(publishableKey, accessToken, "overlays_get_by_organization_domain_id", {
    p_tenant_public_ref: tenantPublicRef,
    p_domain_id: "org_syn_fi_001",
  });
  if (!overlay?.id || overlay.relationshipStatus !== "prospect") {
    throw new Error("overlays_get_by_organization_domain_id failed");
  }

  const evidence = await rpc(
    publishableKey,
    accessToken,
    "evidence_list_by_organization_domain_id",
    {
      p_tenant_public_ref: tenantPublicRef,
      p_domain_id: "org_syn_fi_001",
      p_query: { page: 1, pageSize: 12 },
    },
  );
  if (!Array.isArray(evidence?.items) || evidence.items.length < 2) {
    throw new Error("evidence_list_by_organization_domain_id returned insufficient items");
  }

  const comparison = await rpc(publishableKey, accessToken, "comparisons_get_by_public_ref", {
    p_tenant_public_ref: tenantPublicRef,
    p_public_ref: comparisonPublicRef,
  });
  if (!comparison?.publicRef || comparison.publicRef !== comparisonPublicRef) {
    throw new Error("comparisons_get_by_public_ref failed");
  }

  const brief = await rpc(publishableKey, accessToken, "brief_snapshots_get_by_public_ref", {
    p_tenant_public_ref: tenantPublicRef,
    p_public_ref: briefPublicRef,
  });
  if (!brief?.publicRef || brief.publicRef !== briefPublicRef) {
    throw new Error("brief_snapshots_get_by_public_ref failed");
  }

  const wrongTenant = await fetch(`${REST_BASE}/rpc/organizations_list`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Accept-Profile": "institutionlens_api",
      "Content-Profile": "institutionlens_api",
    },
    body: JSON.stringify({
      p_tenant_public_ref: "tref_000000000000000000000000",
      p_query: { page: 1, pageSize: 12 },
    }),
  });
  const wrongBody = await wrongTenant.text();
  let wrongJson = null;
  try {
    wrongJson = wrongBody ? JSON.parse(wrongBody) : null;
  } catch {
    wrongJson = null;
  }
  if (wrongTenant.ok && Array.isArray(wrongJson?.items) && wrongJson.items.length > 0) {
    throw new Error("wrong-tenant organizations_list unexpectedly returned items");
  }

  const anonResponse = await fetch(`${REST_BASE}/rpc/session_tenant_public_ref`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      "Content-Type": "application/json",
      "Accept-Profile": "institutionlens_api",
      "Content-Profile": "institutionlens_api",
    },
    body: "{}",
  });
  if (anonResponse.ok) {
    const anonBody = await anonResponse.text();
    if (anonBody && anonBody !== "null" && anonBody !== '""') {
      throw new Error("anon session_tenant_public_ref unexpectedly returned a value");
    }
  }

  const envLocal = fs.existsSync(path.join(ROOT, ".env.local"))
    ? fs.readFileSync(path.join(ROOT, ".env.local"), "utf8")
    : "";

  return {
    sessionTenantPublicRef: true,
    workspaceGet: true,
    organizationsList: true,
    assessmentsListPortfolios: true,
    overlaysGetByOrganization: true,
    evidenceListByOrganization: true,
    comparisonsGetByPublicRef: true,
    briefSnapshotsGetByPublicRef: true,
    wrongTenantDeniedOrEmpty: true,
    anonDeniedOrEmpty: true,
    defaultEnvLocalUnchanged: /IL_APP_MODE=local-demo/.test(envLocal),
  };
}

function writeLocalFiles({
  publishableKey,
  email,
  password,
  tenantPublicRef,
  orgPublicRef,
  comparisonPublicRef,
  briefPublicRef,
}) {
  const credentials = {
    projectRef: PROJECT_REF,
    marker: MARKER,
    email,
    password,
    tenantPublicRef,
    orgPublicRef,
    comparisonPublicRef,
    briefPublicRef,
    createdAt: new Date().toISOString(),
    note: "Local staging Auth credentials — gitignored. Do not commit.",
  };
  fs.writeFileSync(CREDENTIALS_PATH, `${JSON.stringify(credentials, null, 2)}\n`, "utf8");
  const env = [
    "IL_APP_MODE=staging",
    `IL_SUPABASE_URL=https://${PROJECT_REF}.supabase.co`,
    `IL_SUPABASE_PROJECT_REF=${PROJECT_REF}`,
    `IL_SUPABASE_PUBLISHABLE_KEY=${publishableKey}`,
    "IL_REPOSITORY_REQUEST_TIMEOUT_MS=8000",
    "IL_REPOSITORY_MAX_PAGE_SIZE=50",
    "",
  ].join("\n");
  fs.writeFileSync(STAGING_ENV_PATH, env, "utf8");
}

async function main() {
  const { serviceKey, publishableKey } = loadApiKeys();

  if (cleanupOnly) {
    dbQuery(cleanupSql());
    const deletedUsers = await deleteMarkedUsers(serviceKey);
    for (const file of [CREDENTIALS_PATH, STAGING_ENV_PATH]) {
      if (fs.existsSync(file)) fs.rmSync(file, { force: true });
    }
    const counts = parseQueryRows(
      dbQuery(`
select
  (select count(*) from institutionlens.tenants where display_name like '${MARKER}%')::int as tenants,
  (select count(*) from institutionlens.memberships m
     join institutionlens.tenants t on t.id = m.tenant_id
    where t.display_name like '${MARKER}%')::int as memberships,
  (select count(*) from institutionlens.organizations where display_name like '${MARKER}%')::int as organizations;
`),
    )[0];
    console.log(
      JSON.stringify(
        {
          mode: "cleanup",
          deletedAuthUsers: deletedUsers,
          remainingMarked: counts,
          ok:
            Number(counts?.tenants || 0) === 0 &&
            Number(counts?.memberships || 0) === 0 &&
            Number(counts?.organizations || 0) === 0,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (validateOnly) {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      throw new Error("Missing .staging-auth.local.json for --validate-only");
    }
    const cred = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
    if (!cred.comparisonPublicRef || !cred.briefPublicRef) {
      throw new Error(
        "Credentials lack comparison/brief refs; re-run without --validate-only to reprovision",
      );
    }
    const checks = await runSmokeSuite({
      publishableKey,
      email: cred.email,
      password: cred.password,
      tenantPublicRef: cred.tenantPublicRef,
      comparisonPublicRef: cred.comparisonPublicRef,
      briefPublicRef: cred.briefPublicRef,
    });
    console.log(
      JSON.stringify(
        {
          mode: "validate_only",
          projectRef: PROJECT_REF,
          marker: MARKER,
          checks,
          ok: Object.values(checks).every(Boolean),
        },
        null,
        2,
      ),
    );
    if (!Object.values(checks).every(Boolean)) process.exit(1);
    return;
  }

  // Replace prior marked fixtures/users for a clean durable set.
  dbQuery(cleanupSql());
  await deleteMarkedUsers(serviceKey);

  const email = `${MARKER}.analyst.${hex(4)}@example.invalid`;
  const password = crypto.randomBytes(24).toString("base64url");
  const created = await authAdmin(serviceKey, "POST", "/admin/users", {
    email,
    password,
    email_confirm: true,
    user_metadata: { purpose: MARKER, role: "analyst" },
  });
  if (!created?.id) throw new Error("Auth Admin createUser missing id");

  const refs = {
    tenantId: crypto.randomUUID(),
    tenantPublicRef: `tref_${hex(12)}`,
    verticalId: crypto.randomUUID(),
    membershipId: crypto.randomUUID(),
    membershipPublicRef: `mref_${hex(12)}`,
    importId: crypto.randomUUID(),
    importPublicRef: `iref_${hex(12)}`,
    orgId: crypto.randomUUID(),
    orgPublicRef: `oref_${hex(10)}`,
    provId: crypto.randomUUID(),
    evProfileId: crypto.randomUUID(),
    evChangeId: crypto.randomUUID(),
    runId: crypto.randomUUID(),
    runPublicRef: `aref_${hex(12)}`,
    resultId: crypto.randomUUID(),
    capResultId: crypto.randomUUID(),
    ruleId: crypto.randomUUID(),
    rreId: crypto.randomUUID(),
    overlayId: crypto.randomUUID(),
    comparisonId: crypto.randomUUID(),
    comparisonPublicRef: `cref_${hex(12)}`,
    briefId: crypto.randomUUID(),
    briefPublicRef: `bsref_${hex(12)}`,
    auditId: crypto.randomUUID(),
    auditRef: `aev_${hex(12)}`,
    fp1: fingerprint(),
    out1: fingerprint(),
  };

  dbQuery(seedSql(created.id, refs));
  writeLocalFiles({
    publishableKey,
    email,
    password,
    tenantPublicRef: refs.tenantPublicRef,
    orgPublicRef: refs.orgPublicRef,
    comparisonPublicRef: refs.comparisonPublicRef,
    briefPublicRef: refs.briefPublicRef,
  });

  const checks = await runSmokeSuite({
    publishableKey,
    email,
    password,
    tenantPublicRef: refs.tenantPublicRef,
    comparisonPublicRef: refs.comparisonPublicRef,
    briefPublicRef: refs.briefPublicRef,
  });

  console.log(
    JSON.stringify(
      {
        mode: "provision_and_validate",
        projectRef: PROJECT_REF,
        marker: MARKER,
        checks: {
          authUserCreated: true,
          ...checks,
        },
        fixtures: {
          tenantPublicRefPresent: Boolean(refs.tenantPublicRef),
          orgPublicRefPresent: Boolean(refs.orgPublicRef),
          comparisonPublicRefPresent: Boolean(refs.comparisonPublicRef),
          briefPublicRefPresent: Boolean(refs.briefPublicRef),
          organizationDomainId: "org_syn_fi_001",
          role: "analyst",
        },
        localFiles: {
          credentials: path.basename(CREDENTIALS_PATH),
          stagingEnv: path.basename(STAGING_ENV_PATH),
          defaultEnvLocalUnchanged: true,
        },
        cleanupStatus: "fixtures retained for local staging validation",
        ok: Object.values(checks).every(Boolean),
      },
      null,
      2,
    ),
  );
  if (!Object.values(checks).every(Boolean)) process.exit(1);
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : "unknown failure",
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
