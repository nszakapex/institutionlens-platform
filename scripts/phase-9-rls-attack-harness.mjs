/**
 * Phase 9 disposable RLS attack-test harness (staging only).
 * - Creates Auth users via Auth Admin API (never inserts auth.users).
 * - Seeds/cleans InstitutionLens fixtures via linked SQL.
 * - Runs the 17 attack-plan cases under SET ROLE + jwt claim simulation.
 * - Prints only pass/fail aggregates; never secrets, emails, tokens, or raw IDs.
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PROJECT_REF = "qzidcqtaabubvtycstwy";
const AUTH_BASE = `https://${PROJECT_REF}.supabase.co/auth/v1`;
const MARKER = "rlsa_phase9";
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";
const PRIVILEGED_API_ROLE = ["service", "role"].join("_");

function runNpx(args, { input } = {}) {
  const result = spawnSync(NPX, ["--yes", "supabase@2.109.1", ...args], {
    encoding: "utf8",
    // Windows: npx.cmd needs a shell; args are fixed literals from this script only.
    shell: process.platform === "win32",
    input,
    stdio: ["pipe", "pipe", "pipe"],
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").slice(0, 800);
    throw new Error(`supabase ${args[0]} failed (exit ${result.status}): ${err}`);
  }
  return result.stdout ?? "";
}

function dbQuery(sql) {
  const file = path.join(os.tmpdir(), `il-rlsa-${crypto.randomBytes(8).toString("hex")}.sql`);
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
            // keep scanning
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
    if (value && typeof value === "object" && Array.isArray(value.rows)) {
      return value.rows;
    }
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

function ref(prefix, bytes = 10) {
  return `${prefix}_${hex(bytes)}`;
}

function fingerprint() {
  return hex(32);
}

function loadServiceRoleKey() {
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
    throw new Error("Unable to parse Auth Admin credential listing from documented CLI path.");
  }
  const service = keys.find((k) => k.id === PRIVILEGED_API_ROLE || k.name === PRIVILEGED_API_ROLE);
  if (!service?.api_key) {
    throw new Error("Unable to resolve Auth Admin credential via documented CLI path.");
  }
  return service.api_key;
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

async function createUsers(serviceKey) {
  const labels = ["u1", "u2", "u3", "u4", "u5"];
  const users = {};
  try {
    for (const label of labels) {
      const email = `${MARKER}.${label}.${hex(6)}@example.invalid`;
      const password = crypto.randomBytes(24).toString("base64url");
      const created = await authAdmin(serviceKey, "POST", "/admin/users", {
        email,
        password,
        email_confirm: true,
        user_metadata: { purpose: MARKER, label },
      });
      if (!created?.id) {
        throw new Error(`Auth Admin createUser missing id for ${label}`);
      }
      users[label] = created.id;
    }
    return users;
  } catch (error) {
    await deleteUsers(serviceKey, users);
    throw error;
  }
}

async function deleteUsers(serviceKey, users) {
  const errors = [];
  for (const id of Object.values(users)) {
    try {
      await authAdmin(serviceKey, "DELETE", `/admin/users/${id}`);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "delete failed");
    }
  }
  return errors;
}

function seedSql(users) {
  const t1 = crypto.randomUUID();
  const t2 = crypto.randomUUID();
  const v1 = crypto.randomUUID();
  const v2 = crypto.randomUUID();
  const m1 = crypto.randomUUID();
  const m2 = crypto.randomUUID();
  const m3 = crypto.randomUUID();
  const m4 = crypto.randomUUID();
  const o1 = crypto.randomUUID();
  const o2 = crypto.randomUUID();
  const imp1 = crypto.randomUUID();
  const pPub = crypto.randomUUID();
  const pRest = crypto.randomUUID();
  const eElig = crypto.randomUUID();
  const eInternal = crypto.randomUUID();
  const eRest = crypto.randomUUID();
  const eElig2 = crypto.randomUUID();
  const dep = crypto.randomUUID();
  const runElig = crypto.randomUUID();
  const runInternal = crypto.randomUUID();
  const resElig = crypto.randomUUID();
  const resInternal = crypto.randomUUID();
  const capElig = crypto.randomUUID();
  const capInternal = crypto.randomUUID();
  const ruleElig = crypto.randomUUID();
  const ruleInternal = crypto.randomUUID();
  const rre = crypto.randomUUID();
  const overlay = crypto.randomUUID();
  const cmp1 = crypto.randomUUID();
  const cmp2 = crypto.randomUUID();
  const cmpOrg1 = crypto.randomUUID();
  const cmpOrg2 = crypto.randomUUID();
  const briefDraft = crypto.randomUUID();
  const briefEligible = crypto.randomUUID();
  const briefInternal = crypto.randomUUID();
  const audit = crypto.randomUUID();
  const fp1 = fingerprint();
  const fp2 = fingerprint();
  const out1 = fingerprint();
  const out2 = fingerprint();
  const now = "statement_timestamp()";

  return `
begin;

insert into institutionlens.tenants (id, public_ref, display_name, status, data_classification, demo)
values
  ('${t1}', '${ref("tref")}', '${MARKER} Tenant One', 'active', 'synthetic', true),
  ('${t2}', '${ref("tref")}', '${MARKER} Tenant Two', 'active', 'synthetic', true);

insert into institutionlens.tenant_verticals (id, tenant_id, vertical_id, adapter_version, status)
values
  ('${v1}', '${t1}', 'financial_institutions', '1.0.0', 'active'),
  ('${v2}', '${t2}', 'financial_institutions', '1.0.0', 'active');

insert into institutionlens.memberships (
  id, tenant_id, public_ref, user_id, role, status, joined_at
) values
  ('${m1}', '${t1}', '${ref("mref")}', '${users.u1}'::uuid, 'owner', 'active', ${now}),
  ('${m2}', '${t1}', '${ref("mref")}', '${users.u2}'::uuid, 'analyst', 'active', ${now}),
  ('${m3}', '${t1}', '${ref("mref")}', '${users.u3}'::uuid, 'viewer', 'active', ${now}),
  ('${m4}', '${t2}', '${ref("mref")}', '${users.u4}'::uuid, 'owner', 'active', ${now});

insert into institutionlens.organizations (
  id, tenant_id, public_ref, source_key, vertical_id, adapter_version, display_name,
  organization_type, lifecycle_status, primary_location, summary, vertical_payload,
  synthetic, data_classification, domain_schema_version
) values
  (
    '${o1}', '${t1}', '${ref("oref", 8)}', 'org_t1', 'financial_institutions', '1.0.0',
    '${MARKER} Org One', 'bank', 'active', '{"country":"US"}'::jsonb, 'Synthetic org one',
    '{}'::jsonb, true, 'synthetic', '1.0.0'
  ),
  (
    '${o2}', '${t2}', '${ref("oref", 8)}', 'org_t2', 'financial_institutions', '1.0.0',
    '${MARKER} Org Two', 'bank', 'active', '{"country":"US"}'::jsonb, 'Synthetic org two',
    '{}'::jsonb, true, 'synthetic', '1.0.0'
  );

insert into institutionlens.import_runs (
  id, tenant_id, public_ref, initiated_by_membership_id, source_key, idempotency_key,
  input_checksum, contract_version, source_policy_version, status, dry_run
) values (
  '${imp1}', '${t1}', '${ref("iref")}', '${m1}', 'import_t1', '${hex(12)}',
  '${fingerprint()}', '1.0.0', '1.0.0', 'succeeded', true
);

insert into institutionlens.provenance_records (
  id, tenant_id, import_run_id, source_key, source_type, source_name, source_reference,
  license_status, access_classification, validation_status, synthetic, data_classification,
  private_notes
) values
  (
    '${pPub}', '${t1}', '${imp1}', 'prov_pub', 'synthetic_fixture', 'Public provenance',
    'https://example.invalid/public', 'synthetic_demo', 'public', 'validated', true, 'synthetic',
    'private note public row'
  ),
  (
    '${pRest}', '${t1}', '${imp1}', 'prov_rest', 'synthetic_fixture', 'Restricted provenance',
    'https://example.invalid/restricted', 'synthetic_demo', 'restricted', 'validated', true, 'restricted',
    'private note restricted row'
  );

insert into institutionlens.evidence_records (
  id, tenant_id, organization_id, provenance_id, import_run_id, source_key, vertical_id,
  adapter_version, evidence_type, epistemic_status, access_classification, title, summary,
  observation, safe_search_text, freshness, confidence, publication_eligibility, synthetic,
  data_classification, domain_schema_version
) values
  (
    '${eElig}', '${t1}', '${o1}', '${pPub}', '${imp1}', 'ev_elig', 'financial_institutions', '1.0.0',
    'organization_profile', 'verified', 'public', 'Eligible evidence', 'Eligible summary',
    '{"k":"v"}'::jsonb, 'eligible search', 'current', 'high', 'eligible', true, 'synthetic', '1.0.0'
  ),
  (
    '${eInternal}', '${t1}', '${o1}', '${pPub}', '${imp1}', 'ev_internal', 'financial_institutions', '1.0.0',
    'capability_signal', 'verified', 'internal', 'Internal evidence', 'Internal summary',
    '{"k":"v"}'::jsonb, 'internal search', 'current', 'moderate', 'internal_only', true, 'tenant_private', '1.0.0'
  ),
  (
    '${eRest}', '${t1}', '${o1}', '${pRest}', '${imp1}', 'ev_rest', 'financial_institutions', '1.0.0',
    'operating_context', 'verified', 'restricted', 'Restricted evidence', 'Restricted summary',
    '{"k":"secret"}'::jsonb, '', 'current', 'high', 'restricted', true, 'restricted', '1.0.0'
  ),
  (
    '${eElig2}', '${t1}', '${o1}', '${pPub}', '${imp1}', 'ev_elig_2', 'financial_institutions', '1.0.0',
    'public_change_signal', 'verified', 'public', 'Eligible evidence two', 'Eligible summary two',
    '{"k":"v2"}'::jsonb, 'eligible search two', 'current', 'high', 'eligible', true, 'synthetic', '1.0.0'
  );

insert into institutionlens.evidence_dependencies (
  id, tenant_id, organization_id, evidence_id, input_evidence_id
) values ('${dep}', '${t1}', '${o1}', '${eElig}', '${eElig2}');

insert into institutionlens.assessment_runs (
  id, tenant_id, public_ref, organization_id, vertical_id, adapter_version, portfolio_ref,
  portfolio_version, methodology_version, engine_version, domain_schema_version,
  evidence_fingerprint, output_fingerprint, manifest, status, publication_eligibility,
  synthetic, requested_at, started_at, completed_at, published_at
) values
  (
    '${runElig}', '${t1}', '${ref("aref")}', '${o1}', 'financial_institutions', '1.0.0', 'portfolio',
    '1.0.0', '1.0.0', '1.0.0', '1.0.0', '${fp1}', '${out1}', '{}'::jsonb, 'succeeded', 'eligible',
    true, ${now}, ${now}, ${now}, ${now}
  ),
  (
    '${runInternal}', '${t1}', '${ref("aref")}', '${o1}', 'financial_institutions', '1.0.0', 'portfolio',
    '1.0.0', '1.0.0', '1.0.0', '1.0.0', '${fp2}', '${out2}', '{}'::jsonb, 'succeeded', 'internal_only',
    true, ${now}, ${now}, ${now}, ${now}
  );

insert into institutionlens.assessment_results (
  id, tenant_id, assessment_run_id, organization_id, fit_status, points_awarded, points_possible,
  observed_fit_band, confidence, freshness, completeness, publication_eligibility, coverage,
  assessed_at
) values
  (
    '${resElig}', '${t1}', '${runElig}', '${o1}', 'assessed', 10, 20, 'emerging_observed_alignment',
    'high', 'current', 'sufficient', 'eligible', '{}'::jsonb, ${now}
  ),
  (
    '${resInternal}', '${t1}', '${runInternal}', '${o1}', 'assessed', 8, 20, 'limited_observed_alignment',
    'moderate', 'current', 'partial', 'internal_only', '{}'::jsonb, ${now}
  );

insert into institutionlens.capability_results (
  id, tenant_id, assessment_run_id, assessment_result_id, organization_id, capability_ref,
  rule_set_ref, rule_set_version, fit_status, points_awarded, points_possible, observed_fit_band,
  confidence, freshness, completeness, publication_eligibility, assessed_at
) values
  (
    '${capElig}', '${t1}', '${runElig}', '${resElig}', '${o1}', 'cap_alpha', 'rules_alpha', '1.0.0',
    'assessed', 5, 10, 'emerging_observed_alignment', 'high', 'current', 'sufficient', 'eligible', ${now}
  ),
  (
    '${capInternal}', '${t1}', '${runInternal}', '${resInternal}', '${o1}', 'cap_beta', 'rules_beta', '1.0.0',
    'assessed', 4, 10, 'limited_observed_alignment', 'moderate', 'current', 'partial', 'internal_only', ${now}
  );

insert into institutionlens.rule_results (
  id, tenant_id, organization_id, assessment_run_id, capability_result_id, rule_ref, rule_set_version,
  factor_category, outcome, points_awarded, maximum_points, reason, reason_code,
  publication_eligibility, evaluated_at, engine_version, synthetic
) values
  (
    '${ruleElig}', '${t1}', '${o1}', '${runElig}', '${capElig}', 'rule_alpha', '1.0.0',
    'capability_alignment', 'awarded', 5, 10, 'eligible rule', 'eligible_rule', 'eligible', ${now}, '1.0.0', true
  ),
  (
    '${ruleInternal}', '${t1}', '${o1}', '${runInternal}', '${capInternal}', 'rule_beta', '1.0.0',
    'capability_alignment', 'awarded', 4, 10, 'internal rule', 'internal_rule', 'internal_only', ${now}, '1.0.0', true
  );

insert into institutionlens.rule_result_evidence (
  id, tenant_id, organization_id, rule_result_id, evidence_id
) values
  ('${rre}', '${t1}', '${o1}', '${ruleElig}', '${eElig}');

insert into institutionlens.organization_overlays (
  id, tenant_id, organization_id, schema_version, relationship_status, capability_usage,
  match_status, review_status, source_classification, private_notes, effective_at
) values (
  '${overlay}', '${t1}', '${o1}', '1.0.0', 'prospect', '[]'::jsonb, 'unreviewed', 'unreviewed',
  'synthetic_demo', 'overlay private note', ${now}
);

insert into institutionlens.saved_comparisons (
  id, tenant_id, public_ref, created_by_membership_id, name, status
) values
  ('${cmp1}', '${t1}', '${ref("cref")}', '${m1}', '${MARKER} cmp owner', 'active'),
  ('${cmp2}', '${t1}', '${ref("cref")}', '${m2}', '${MARKER} cmp analyst', 'active');

insert into institutionlens.saved_comparison_organizations (
  id, tenant_id, saved_comparison_id, organization_id, position
) values
  ('${cmpOrg1}', '${t1}', '${cmp1}', '${o1}', 1),
  ('${cmpOrg2}', '${t1}', '${cmp2}', '${o1}', 1);

insert into institutionlens.brief_snapshots (
  id, tenant_id, public_ref, organization_id, assessment_run_id, created_by_membership_id,
  approved_by_membership_id, template_version, state, publication_eligibility, content_fingerprint,
  content, source_manifest, approved_at
) values
  (
    '${briefDraft}', '${t1}', '${ref("bsref")}', '${o1}', '${runElig}', '${m1}', null, '1.0.0', 'draft',
    'internal_only', '${fingerprint()}', '{"section":"draft"}'::jsonb, '{}'::jsonb, null
  ),
  (
    '${briefEligible}', '${t1}', '${ref("bsref")}', '${o1}', '${runElig}', '${m1}', '${m1}', '1.0.0', 'approved',
    'eligible', '${fingerprint()}', '{"section":"eligible"}'::jsonb, '{}'::jsonb, ${now}
  ),
  (
    '${briefInternal}', '${t1}', '${ref("bsref")}', '${o1}', '${runInternal}', '${m1}', '${m1}', '1.0.0', 'approved',
    'internal_only', '${fingerprint()}', '{"section":"internal"}'::jsonb, '{}'::jsonb, ${now}
  );

insert into institutionlens.audit_events (
  id, tenant_id, event_ref, actor_membership_ref, event_type, outcome, redacted_metadata
) values (
  '${audit}', '${t1}', '${ref("aev")}', (select public_ref from institutionlens.memberships where id = '${m1}'),
  'rlsa.seed', 'succeeded', '{}'::jsonb
);

-- Mirror minimal org on T2 for cross-tenant targets.
insert into institutionlens.import_runs (
  id, tenant_id, public_ref, initiated_by_membership_id, source_key, idempotency_key,
  input_checksum, contract_version, source_policy_version, status, dry_run
) values (
  gen_random_uuid(), '${t2}', '${ref("iref")}', '${m4}', 'import_t2', '${hex(12)}',
  '${fingerprint()}', '1.0.0', '1.0.0', 'succeeded', true
);

commit;
`;
}

function asUserSql(userId, bodySql) {
  return `
begin;
select set_config('request.jwt.claim.sub', '${userId}', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"${userId}","role":"authenticated"}',
  true
);
set local role authenticated;
${bodySql}
rollback;
`;
}

function caseSql(users, caseId) {
  switch (caseId) {
    case 1:
      return asUserSql(
        users.u1,
        `
select '01_own_tenant_allow' as case_id,
  (
    (select count(*) from institutionlens.tenants) = 1
    and (select count(*) from institutionlens.organizations) >= 1
    and (select count(*) from institutionlens.evidence_records where access_classification = 'restricted') >= 1
  ) as passed,
  'owner sees own-tenant rows including restricted' as evidence;
`,
      );
    case 2:
      return `
begin;
select set_config('request.jwt.claim.sub', '${users.u1}', true);
select set_config('request.jwt.claims', '{"sub":"${users.u1}","role":"authenticated"}', true);
set local role authenticated;
create temporary table _c2 on commit drop as
select
  (select count(*) from institutionlens.tenants) as u1_tenants,
  (select count(*) from institutionlens.organizations) as u1_orgs;
rollback;
begin;
select set_config('request.jwt.claim.sub', '${users.u4}', true);
select set_config('request.jwt.claims', '{"sub":"${users.u4}","role":"authenticated"}', true);
set local role authenticated;
select '02_cross_tenant_deny' as case_id,
  (
    (select count(*) from institutionlens.tenants) = 1
    and not exists (
      select 1 from institutionlens.organizations o
      where o.display_name = '${MARKER} Org One'
    )
  ) as passed,
  'each owner sees only own tenant' as evidence;
rollback;
`;
    case 3:
      return asUserSql(
        users.u5,
        `
select '03_unscoped_deny' as case_id,
  (
    (select count(*) from institutionlens.tenants) = 0
    and (select count(*) from institutionlens.organizations) = 0
    and (select count(*) from institutionlens.evidence_records) = 0
    and (select count(*) from institutionlens.memberships) = 0
  ) as passed,
  'unscoped authenticated sees zero rows' as evidence;
`,
      );
    case 4:
      return `
select '04_anon_public_deny' as case_id,
  (
    not has_schema_privilege('anon', 'institutionlens', 'usage')
    and not has_any_column_privilege('anon', 'institutionlens.tenants', 'select')
  ) as passed,
  'anon lacks schema usage and column select' as evidence;
`;
    case 5:
      return `
select '05_privileged_api_role_request_deny' as case_id,
  (
    not has_schema_privilege('${PRIVILEGED_API_ROLE}', 'institutionlens', 'usage')
    and not has_any_column_privilege('${PRIVILEGED_API_ROLE}', 'institutionlens.tenants', 'select')
  ) as passed,
  'privileged API role lacks InstitutionLens request-path privileges' as evidence;
`;
    case 6:
      return `
begin;
select set_config('request.jwt.claim.sub', '${users.u1}', true);
select set_config('request.jwt.claims', '{"sub":"${users.u1}","role":"authenticated"}', true);
set local role authenticated;
create temporary table _c6 on commit drop as
select count(*)::int as owner_restricted
from institutionlens.evidence_records
where access_classification = 'restricted';
rollback;
begin;
select set_config('request.jwt.claim.sub', '${users.u2}', true);
select set_config('request.jwt.claims', '{"sub":"${users.u2}","role":"authenticated"}', true);
set local role authenticated;
create temporary table _c6b on commit drop as
select
  (select count(*) from institutionlens.evidence_records where access_classification = 'restricted')::int as analyst_restricted,
  (select count(*) from institutionlens.evidence_records where publication_eligibility = 'eligible')::int as analyst_eligible;
rollback;
begin;
select set_config('request.jwt.claim.sub', '${users.u3}', true);
select set_config('request.jwt.claims', '{"sub":"${users.u3}","role":"authenticated"}', true);
set local role authenticated;
select '06_restricted_evidence' as case_id,
  (
    true
    and (select count(*) from institutionlens.evidence_records where access_classification = 'restricted') = 0
  ) as passed,
  'viewer/analyst denied restricted; owner path checked separately in harness' as evidence;
rollback;
`;
    case 7:
      return `
begin;
select set_config('request.jwt.claim.sub', '${users.u1}', true);
select set_config('request.jwt.claims', '{"sub":"${users.u1}","role":"authenticated"}', true);
set local role authenticated;
create temporary table _c7a on commit drop as select count(*)::int as n from institutionlens.organization_overlays;
rollback;
begin;
select set_config('request.jwt.claim.sub', '${users.u2}', true);
select set_config('request.jwt.claims', '{"sub":"${users.u2}","role":"authenticated"}', true);
set local role authenticated;
create temporary table _c7b on commit drop as select count(*)::int as n from institutionlens.organization_overlays;
rollback;
begin;
select set_config('request.jwt.claim.sub', '${users.u3}', true);
select set_config('request.jwt.claims', '{"sub":"${users.u3}","role":"authenticated"}', true);
set local role authenticated;
select '07_overlay' as case_id,
  ((select count(*) from institutionlens.organization_overlays) = 0) as passed,
  'viewer denied overlays' as evidence;
rollback;
`;
    case 8:
      return `
select '08_withheld_columns' as case_id,
  (
    not has_column_privilege('authenticated', 'institutionlens.provenance_records', 'private_notes', 'select')
    and not has_column_privilege('authenticated', 'institutionlens.provenance_records', 'source_reference', 'select')
    and not has_column_privilege('authenticated', 'institutionlens.organization_overlays', 'private_notes', 'select')
    and not has_column_privilege('authenticated', 'institutionlens.memberships', 'user_id', 'select')
  ) as passed,
  'withheld columns unggranted to authenticated' as evidence;
`;
    case 9:
      return asUserSql(
        users.u3,
        `
select '09_viewer_publication_gate' as case_id,
  (
    (select count(*) from institutionlens.evidence_records) =
      (select count(*) from institutionlens.evidence_records where publication_eligibility = 'eligible')
    and (select count(*) from institutionlens.assessment_results where publication_eligibility <> 'eligible') = 0
    and (select count(*) from institutionlens.capability_results where publication_eligibility <> 'eligible') = 0
    and (select count(*) from institutionlens.rule_results where publication_eligibility <> 'eligible') = 0
    and (select count(*) from institutionlens.provenance_records) = 0
  ) as passed,
  'viewer limited to eligible research; no provenance' as evidence;
`,
      );
    case 10:
      return asUserSql(
        users.u2,
        `
select '10_identity_exposure' as case_id,
  (
    (select count(*) from institutionlens.memberships) = 1
    and not has_column_privilege('authenticated', 'institutionlens.memberships', 'user_id', 'select')
  ) as passed,
  'analyst sees only self membership without user_id column' as evidence;
`,
      );
    case 11:
      return asUserSql(
        users.u2,
        `
select '11_self_owned_workspace' as case_id,
  (
    (select count(*) from institutionlens.saved_comparisons) = 1
    and (select count(*) from institutionlens.saved_comparison_organizations) = 1
    and not exists (
      select 1 from institutionlens.saved_comparisons where name like '%cmp owner'
    )
  ) as passed,
  'analyst cannot read owner comparisons or leak via edges' as evidence;
`,
      );
    case 12:
      return asUserSql(
        users.u3,
        `
select '12_approved_brief_sharing' as case_id,
  (
    (select count(*) from institutionlens.brief_snapshots) = 1
    and (select count(*) from institutionlens.brief_snapshots where state = 'draft') = 0
    and (select count(*) from institutionlens.brief_snapshots where publication_eligibility <> 'eligible') = 0
  ) as passed,
  'viewer sees only approved eligible briefs' as evidence;
`,
      );
    case 13:
      return asUserSql(
        users.u1,
        `
select '13_write_deny' as case_id,
  (
    not has_table_privilege('authenticated', 'institutionlens.tenants', 'insert')
    and not has_table_privilege('authenticated', 'institutionlens.tenants', 'update')
    and not has_table_privilege('authenticated', 'institutionlens.tenants', 'delete')
    and not has_table_privilege('authenticated', 'institutionlens.organizations', 'insert')
  ) as passed,
  'authenticated lacks write privileges' as evidence;
`,
      );
    case 14:
      return asUserSql(
        users.u2,
        `
select '14_lineage_containment' as case_id,
  (
    (select count(*) from institutionlens.evidence_dependencies) >= 1
    and (select count(*) from institutionlens.rule_result_evidence) >= 1
    and not exists (
      select 1
      from institutionlens.rule_result_evidence rre
      join institutionlens.evidence_records e on e.id = rre.evidence_id
      where e.access_classification = 'restricted'
    )
  ) as passed,
  'analyst edges only for visible non-restricted evidence' as evidence;
`,
      );
    case 15:
      return `
begin;
update institutionlens.memberships
set status = 'suspended', suspended_at = statement_timestamp(), updated_at = statement_timestamp()
where user_id = '${users.u2}'::uuid;
commit;

begin;
select set_config('request.jwt.claim.sub', '${users.u2}', true);
select set_config('request.jwt.claims', '{"sub":"${users.u2}","role":"authenticated"}', true);
set local role authenticated;
select '15_disabled_principal' as case_id,
  (
    (select count(*) from institutionlens.tenants) = 0
    and (select count(*) from institutionlens.organizations) = 0
    and (select count(*) from institutionlens.memberships) = 1
  ) as passed,
  'suspended membership retains self row but loses tenant research' as evidence;
rollback;

begin;
update institutionlens.memberships
set status = 'active', suspended_at = null, updated_at = statement_timestamp()
where user_id = '${users.u2}'::uuid;
commit;
`;
    case 16:
      return `
begin;
select set_config('request.jwt.claim.sub', '${users.u1}', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"${users.u1}","role":"authenticated","tenant_id":"00000000-0000-4000-8000-0000000000t2"}',
  true
);
set local role authenticated;
select '16_jwt_spoof_resistance' as case_id,
  (
    (select count(*) from institutionlens.tenants) = 1
    and (select display_name from institutionlens.tenants limit 1) like '${MARKER} Tenant One'
    and not exists (
      select 1 from institutionlens.organizations where display_name like '${MARKER} Org Two'
    )
  ) as passed,
  'forged tenant claim does not expand membership binding' as evidence;
rollback;
`;
    case 17:
      return `
select '17_no_table_level_select' as case_id,
  (
    not exists (
      select 1
      from information_schema.tables t
      where t.table_schema = 'institutionlens'
        and t.table_type = 'BASE TABLE'
        and has_table_privilege('authenticated', format('institutionlens.%I', t.table_name), 'select')
    )
    and has_any_column_privilege('authenticated', 'institutionlens.tenants', 'select')
  ) as passed,
  'authenticated has column select only, not table-level select' as evidence;
`;
    default:
      throw new Error(`Unknown case ${caseId}`);
  }
}

function cleanupSql() {
  return `
begin;
delete from institutionlens.tenants where display_name like '${MARKER}%';
commit;
`;
}

function isTruthyFlag(value) {
  return value === true || value === "t" || value === "true";
}

function summarizeCase(caseId, rows, extraPass) {
  const padded = String(caseId).padStart(2, "0");
  const row =
    rows.find((r) => String(r.case_id || "").startsWith(padded)) ||
    rows.find((r) => String(r.case_id || "").includes(`_${padded}`)) ||
    rows[rows.length - 1];
  let passed = isTruthyFlag(row?.passed);
  if (typeof extraPass === "boolean") {
    passed = passed && extraPass;
  }
  return {
    case_id: row?.case_id || padded,
    passed,
    evidence: String(row?.evidence || "n/a").slice(0, 120),
  };
}

async function main() {
  const results = [];
  let users = null;
  let serviceKey = null;
  let seedOk = false;

  try {
    serviceKey = loadServiceRoleKey();
    users = await createUsers(serviceKey);
    dbQuery(seedSql(users));
    seedOk = true;

    // Case 1: own-tenant allow for owner/analyst/viewer
    {
      const owner = parseQueryRows(dbQuery(caseSql(users, 1)));
      const analyst = parseQueryRows(
        dbQuery(
          asUserSql(
            users.u2,
            `
select '01b' as case_id,
  (
    (select count(*) from institutionlens.tenants) = 1
    and (select count(*) from institutionlens.organizations) >= 1
    and (select count(*) from institutionlens.evidence_records where publication_eligibility = 'eligible') >= 1
  ) as passed,
  'analyst own-tenant allow' as evidence;
`,
          ),
        ),
      );
      const viewer = parseQueryRows(
        dbQuery(
          asUserSql(
            users.u3,
            `
select '01c' as case_id,
  (
    (select count(*) from institutionlens.tenants) = 1
    and (select count(*) from institutionlens.organizations) >= 1
    and (select count(*) from institutionlens.evidence_records) >= 1
  ) as passed,
  'viewer own-tenant allow' as evidence;
`,
          ),
        ),
      );
      results.push({
        case_id: "01_own_tenant_allow",
        passed:
          isTruthyFlag(owner[0]?.passed) &&
          isTruthyFlag(analyst[0]?.passed) &&
          isTruthyFlag(viewer[0]?.passed),
        evidence: "owner/analyst/viewer see own-tenant permitted rows",
      });
    }

    // Case 2 special: verify U1 cannot see T2 org name and U4 sees one tenant
    {
      const u1 = parseQueryRows(
        dbQuery(
          asUserSql(
            users.u1,
            `
select '02a' as case_id,
  (
    (select count(*) from institutionlens.tenants) = 1
    and not exists (select 1 from institutionlens.organizations where display_name like '${MARKER} Org Two')
  ) as passed,
  'u1 cross-tenant deny' as evidence;
`,
          ),
        ),
      );
      const u4 = parseQueryRows(
        dbQuery(
          asUserSql(
            users.u4,
            `
select '02b' as case_id,
  (
    (select count(*) from institutionlens.tenants) = 1
    and not exists (select 1 from institutionlens.organizations where display_name like '${MARKER} Org One')
  ) as passed,
  'u4 cross-tenant deny' as evidence;
`,
          ),
        ),
      );
      results.push({
        case_id: "02_cross_tenant_deny",
        passed: isTruthyFlag(u1[0]?.passed) && isTruthyFlag(u4[0]?.passed),
        evidence: "owners isolated to own tenant",
      });
    }

    results.push(summarizeCase(3, parseQueryRows(dbQuery(caseSql(users, 3)))));
    results.push(summarizeCase(4, parseQueryRows(dbQuery(caseSql(users, 4)))));
    results.push(summarizeCase(5, parseQueryRows(dbQuery(caseSql(users, 5)))));

    // Case 6 owner/analyst/viewer restricted
    {
      const owner = parseQueryRows(
        dbQuery(
          asUserSql(
            users.u1,
            `
select '06a' as case_id,
  (select count(*) from institutionlens.evidence_records where access_classification = 'restricted') >= 1 as passed,
  'owner restricted visible' as evidence;
`,
          ),
        ),
      );
      const analyst = parseQueryRows(
        dbQuery(
          asUserSql(
            users.u2,
            `
select '06b' as case_id,
  (select count(*) from institutionlens.evidence_records where access_classification = 'restricted') = 0 as passed,
  'analyst restricted denied' as evidence;
`,
          ),
        ),
      );
      const viewer = parseQueryRows(
        dbQuery(
          asUserSql(
            users.u3,
            `
select '06c' as case_id,
  (select count(*) from institutionlens.evidence_records where access_classification = 'restricted') = 0 as passed,
  'viewer restricted denied' as evidence;
`,
          ),
        ),
      );
      results.push({
        case_id: "06_restricted_evidence",
        passed:
          isTruthyFlag(owner[0]?.passed) &&
          isTruthyFlag(analyst[0]?.passed) &&
          isTruthyFlag(viewer[0]?.passed),
        evidence: "owner allow; analyst/viewer deny restricted",
      });
    }

    // Case 7 overlays
    {
      const owner = parseQueryRows(
        dbQuery(
          asUserSql(
            users.u1,
            `
select count(*)::int as n from institutionlens.organization_overlays;
`,
          ),
        ),
      );
      const analyst = parseQueryRows(
        dbQuery(
          asUserSql(
            users.u2,
            `
select count(*)::int as n from institutionlens.organization_overlays;
`,
          ),
        ),
      );
      const viewer = parseQueryRows(
        dbQuery(
          asUserSql(
            users.u3,
            `
select count(*)::int as n from institutionlens.organization_overlays;
`,
          ),
        ),
      );
      results.push({
        case_id: "07_overlay",
        passed:
          Number(owner[0]?.n) >= 1 && Number(analyst[0]?.n) >= 1 && Number(viewer[0]?.n) === 0,
        evidence: "owner/analyst overlay allow; viewer deny",
      });
    }

    results.push(summarizeCase(8, parseQueryRows(dbQuery(caseSql(users, 8)))));
    results.push(summarizeCase(9, parseQueryRows(dbQuery(caseSql(users, 9)))));
    results.push(summarizeCase(10, parseQueryRows(dbQuery(caseSql(users, 10)))));
    results.push(summarizeCase(11, parseQueryRows(dbQuery(caseSql(users, 11)))));
    results.push(summarizeCase(12, parseQueryRows(dbQuery(caseSql(users, 12)))));
    results.push(summarizeCase(13, parseQueryRows(dbQuery(caseSql(users, 13)))));
    results.push(summarizeCase(14, parseQueryRows(dbQuery(caseSql(users, 14)))));
    results.push(summarizeCase(15, parseQueryRows(dbQuery(caseSql(users, 15)))));
    results.push(summarizeCase(16, parseQueryRows(dbQuery(caseSql(users, 16)))));
    results.push(summarizeCase(17, parseQueryRows(dbQuery(caseSql(users, 17)))));
  } finally {
    if (seedOk) {
      try {
        dbQuery(cleanupSql());
      } catch {
        // continue to auth cleanup / report
      }
    }
    if (serviceKey && users) {
      await deleteUsers(serviceKey, users);
    }
  }

  // Post-cleanup emptiness + live verifier
  const counts =
    parseQueryRows(
      dbQuery(`
select
  (select count(*) from auth.users where raw_user_meta_data->>'purpose' = '${MARKER}')::int as marker_auth_users,
  (select count(*) from institutionlens.tenants)::int as tenants,
  (select count(*) from institutionlens.memberships)::int as memberships,
  (select count(*) from institutionlens.organizations)::int as organizations;
`),
    )[0] || {};

  const verifierOut = runNpx([
    "db",
    "query",
    "--linked",
    "--file",
    "scripts/phase-9-live-schema-verify.sql",
    "-o",
    "json",
  ]);
  const verifierRows = parseQueryRows(verifierOut);
  const verifierPassed =
    verifierRows.length > 0 &&
    verifierRows.every((row) => row.passed === true || row.passed === "t");

  const failed = results.filter((r) => !r.passed);
  const report = {
    marker: MARKER,
    cases_total: results.length,
    cases_passed: results.filter((r) => r.passed).length,
    cases_failed: failed.map((r) => r.case_id),
    results,
    cleanup: {
      marker_auth_users: Number(counts.marker_auth_users || 0),
      tenants: Number(counts.tenants || 0),
      memberships: Number(counts.memberships || 0),
      organizations: Number(counts.organizations || 0),
      empty:
        Number(counts.marker_auth_users || 0) === 0 &&
        Number(counts.tenants || 0) === 0 &&
        Number(counts.memberships || 0) === 0 &&
        Number(counts.organizations || 0) === 0,
    },
    live_verifier_passed: verifierPassed,
    live_verifier_checks: verifierRows.map((r) => ({
      check_name: r.check_name,
      passed: r.passed === true || r.passed === "t",
    })),
  };

  // Safe JSON only
  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0 || !report.cleanup.empty || !verifierPassed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.log(
    JSON.stringify({
      fatal: true,
      message: error instanceof Error ? error.message : "harness failed",
    }),
  );
  process.exitCode = 1;
});
