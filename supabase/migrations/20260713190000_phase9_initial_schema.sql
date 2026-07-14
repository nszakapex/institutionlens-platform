begin;

create schema if not exists institutionlens;

comment on schema institutionlens is
  'InstitutionLens server-side application data. Not exposed through the Data API.';

revoke all on schema institutionlens from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema institutionlens
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema institutionlens
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema institutionlens
  revoke execute on functions from public, anon, authenticated, service_role;

create table institutionlens.tenants (
  id uuid primary key default gen_random_uuid(),
  public_ref text not null unique,
  display_name text not null,
  status text not null default 'active',
  data_classification text not null,
  demo boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  suspended_at timestamptz,
  deletion_requested_at timestamptz,
  constraint tenants_public_ref_format check (public_ref ~ '^tref_[a-f0-9]{20,32}$'),
  constraint tenants_display_name_length check (char_length(display_name) between 1 and 120),
  constraint tenants_status check (status in ('active', 'suspended', 'deletion_pending')),
  constraint tenants_data_classification check (
    data_classification in ('synthetic', 'tenant_private')
  ),
  constraint tenants_timestamps check (updated_at >= created_at),
  constraint tenants_suspension_state check (
    (status = 'suspended' and suspended_at is not null) or status <> 'suspended'
  ),
  constraint tenants_deletion_state check (
    (status = 'deletion_pending' and deletion_requested_at is not null)
    or status <> 'deletion_pending'
  )
);

create table institutionlens.tenant_verticals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references institutionlens.tenants(id) on delete cascade,
  vertical_id text not null,
  adapter_version text not null,
  status text not null default 'active',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint tenant_verticals_tenant_id_id_key unique (tenant_id, id),
  constraint tenant_verticals_tenant_vertical_key unique (tenant_id, vertical_id),
  constraint tenant_verticals_vertical_id_format check (
    vertical_id ~ '^[a-z][a-z0-9_]{2,63}$'
  ),
  constraint tenant_verticals_adapter_version_format check (
    adapter_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  constraint tenant_verticals_status check (status in ('active', 'suspended', 'retired')),
  constraint tenant_verticals_timestamps check (updated_at >= created_at)
);

create table institutionlens.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references institutionlens.tenants(id) on delete cascade,
  public_ref text not null,
  user_id uuid references auth.users(id) on delete set null,
  role text not null,
  status text not null default 'invited',
  invited_by_membership_id uuid,
  invited_at timestamptz not null default statement_timestamp(),
  joined_at timestamptz,
  suspended_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint memberships_tenant_id_id_key unique (tenant_id, id),
  constraint memberships_tenant_public_ref_key unique (tenant_id, public_ref),
  constraint memberships_tenant_user_key unique (tenant_id, user_id),
  constraint memberships_public_ref_format check (public_ref ~ '^mref_[a-f0-9]{20,32}$'),
  constraint memberships_role check (role in ('owner', 'analyst', 'viewer')),
  constraint memberships_status check (status in ('invited', 'active', 'suspended', 'removed')),
  constraint memberships_timestamps check (
    updated_at >= created_at
    and (joined_at is null or joined_at >= invited_at)
  ),
  constraint memberships_inviter_fk foreign key (tenant_id, invited_by_membership_id)
    references institutionlens.memberships(tenant_id, id) on delete restrict
);

create table institutionlens.organizations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references institutionlens.tenants(id) on delete cascade,
  public_ref text not null,
  source_key text,
  vertical_id text not null,
  adapter_version text not null,
  display_name text not null,
  legal_name text,
  organization_type text not null,
  lifecycle_status text not null,
  primary_location jsonb not null,
  summary text not null,
  tags text[] not null default '{}',
  external_references jsonb not null default '[]'::jsonb,
  vertical_payload jsonb not null,
  synthetic boolean not null,
  data_classification text not null,
  domain_schema_version text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  archived_at timestamptz,
  constraint organizations_tenant_id_id_key unique (tenant_id, id),
  constraint organizations_tenant_id_vertical_key unique (tenant_id, id, vertical_id),
  constraint organizations_tenant_public_ref_key unique (tenant_id, public_ref),
  constraint organizations_tenant_source_key unique (tenant_id, source_key),
  constraint organizations_public_ref_format check (public_ref ~ '^oref_[a-f0-9]{16,32}$'),
  constraint organizations_source_key_length check (
    source_key is null or char_length(source_key) between 1 and 160
  ),
  constraint organizations_vertical_id_format check (vertical_id ~ '^[a-z][a-z0-9_]{2,63}$'),
  constraint organizations_adapter_version_format check (
    adapter_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  constraint organizations_display_name_length check (char_length(display_name) between 1 and 160),
  constraint organizations_legal_name_length check (
    legal_name is null or char_length(legal_name) between 1 and 200
  ),
  constraint organizations_type_length check (char_length(organization_type) between 1 and 64),
  constraint organizations_lifecycle_status check (
    lifecycle_status in ('active', 'inactive', 'merged', 'closed', 'unknown')
  ),
  constraint organizations_location_object check (jsonb_typeof(primary_location) = 'object'),
  constraint organizations_summary_length check (char_length(summary) between 1 and 600),
  constraint organizations_tags_bound check (cardinality(tags) <= 20),
  constraint organizations_external_references_array check (
    jsonb_typeof(external_references) = 'array'
    and jsonb_array_length(external_references) <= 8
  ),
  constraint organizations_vertical_payload_object check (jsonb_typeof(vertical_payload) = 'object'),
  constraint organizations_data_classification check (
    data_classification in ('synthetic', 'public_source', 'tenant_private', 'restricted')
  ),
  constraint organizations_domain_schema_version_format check (
    domain_schema_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  constraint organizations_timestamps check (updated_at >= created_at),
  constraint organizations_vertical_fk foreign key (tenant_id, vertical_id)
    references institutionlens.tenant_verticals(tenant_id, vertical_id) on delete restrict
);

create table institutionlens.import_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references institutionlens.tenants(id) on delete cascade,
  public_ref text not null,
  initiated_by_membership_id uuid,
  source_key text not null,
  idempotency_key text not null,
  input_checksum text not null,
  contract_version text not null,
  source_policy_version text not null,
  status text not null default 'queued',
  dry_run boolean not null default true,
  record_counts jsonb not null default '{}'::jsonb,
  safe_error_summary text,
  queued_at timestamptz not null default statement_timestamp(),
  started_at timestamptz,
  finished_at timestamptz,
  cleanup_after timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint import_runs_tenant_id_id_key unique (tenant_id, id),
  constraint import_runs_tenant_public_ref_key unique (tenant_id, public_ref),
  constraint import_runs_tenant_idempotency_key unique (tenant_id, idempotency_key),
  constraint import_runs_public_ref_format check (public_ref ~ '^iref_[a-f0-9]{20,32}$'),
  constraint import_runs_source_key_length check (char_length(source_key) between 1 and 160),
  constraint import_runs_idempotency_key_length check (
    char_length(idempotency_key) between 16 and 160
  ),
  constraint import_runs_input_checksum_format check (input_checksum ~ '^[a-f0-9]{64}$'),
  constraint import_runs_contract_version_format check (
    contract_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  constraint import_runs_source_policy_version_format check (
    source_policy_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  constraint import_runs_status check (
    status in ('queued', 'running', 'succeeded', 'partial', 'failed', 'rolled_back')
  ),
  constraint import_runs_record_counts_object check (jsonb_typeof(record_counts) = 'object'),
  constraint import_runs_error_summary_length check (
    safe_error_summary is null or char_length(safe_error_summary) between 1 and 600
  ),
  constraint import_runs_time_order check (
    (started_at is null or started_at >= queued_at)
    and (finished_at is null or started_at is not null)
    and (finished_at is null or finished_at >= started_at)
  ),
  constraint import_runs_initiator_fk foreign key (tenant_id, initiated_by_membership_id)
    references institutionlens.memberships(tenant_id, id) on delete restrict
);

create table institutionlens.provenance_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references institutionlens.tenants(id) on delete cascade,
  import_run_id uuid,
  source_key text not null,
  source_type text not null,
  source_name text not null,
  source_reference text not null,
  retrieved_at timestamptz,
  published_at timestamptz,
  reporting_period_start timestamptz,
  reporting_period_end timestamptz,
  checksum text,
  license_status text not null,
  access_classification text not null,
  validation_status text not null,
  synthetic boolean not null,
  data_classification text not null,
  private_notes text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint provenance_records_tenant_id_id_key unique (tenant_id, id),
  constraint provenance_records_tenant_source_key unique (tenant_id, source_key),
  constraint provenance_records_source_key_length check (char_length(source_key) between 1 and 160),
  constraint provenance_records_source_type check (
    source_type in (
      'synthetic_fixture',
      'synthetic_document',
      'synthetic_observation',
      'document',
      'website',
      'regulatory_filing',
      'registry',
      'tenant_provided',
      'calculated'
    )
  ),
  constraint provenance_records_source_name_length check (char_length(source_name) between 1 and 160),
  constraint provenance_records_source_reference_length check (
    char_length(source_reference) between 1 and 500
  ),
  constraint provenance_records_reporting_period check (
    reporting_period_end is null
    or reporting_period_start is null
    or reporting_period_end >= reporting_period_start
  ),
  constraint provenance_records_checksum_format check (
    checksum is null or checksum ~ '^[a-f0-9]{64}$'
  ),
  constraint provenance_records_license_status check (
    license_status in (
      'synthetic_demo',
      'permitted_public',
      'permitted_internal',
      'unknown',
      'prohibited'
    )
  ),
  constraint provenance_records_access_classification check (
    access_classification in ('synthetic', 'public', 'internal', 'restricted')
  ),
  constraint provenance_records_validation_status check (
    validation_status in ('validated', 'unvalidated', 'rejected')
  ),
  constraint provenance_records_data_classification check (
    data_classification in ('synthetic', 'public_source', 'tenant_private', 'restricted')
  ),
  constraint provenance_records_private_notes_length check (
    private_notes is null or char_length(private_notes) <= 1000
  ),
  constraint provenance_records_timestamps check (updated_at >= created_at),
  constraint provenance_records_import_run_fk foreign key (tenant_id, import_run_id)
    references institutionlens.import_runs(tenant_id, id) on delete restrict
);

create table institutionlens.evidence_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references institutionlens.tenants(id) on delete cascade,
  organization_id uuid not null,
  provenance_id uuid,
  import_run_id uuid,
  source_key text not null,
  vertical_id text not null,
  adapter_version text not null,
  evidence_type text not null,
  epistemic_status text not null,
  access_classification text not null,
  title text not null,
  summary text not null,
  observation jsonb,
  safe_search_text text not null default '',
  observed_at timestamptz,
  effective_period_start timestamptz,
  effective_period_end timestamptz,
  freshness text not null,
  confidence text not null,
  publication_eligibility text not null,
  calculation_descriptor text,
  rule_set_ref text,
  staleness_reason text,
  synthetic boolean not null,
  data_classification text not null,
  domain_schema_version text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  superseded_at timestamptz,
  constraint evidence_records_tenant_id_id_key unique (tenant_id, id),
  constraint evidence_records_tenant_id_organization_key unique (tenant_id, id, organization_id),
  constraint evidence_records_tenant_source_key unique (tenant_id, source_key),
  constraint evidence_records_source_key_length check (char_length(source_key) between 1 and 160),
  constraint evidence_records_vertical_id_format check (vertical_id ~ '^[a-z][a-z0-9_]{2,63}$'),
  constraint evidence_records_adapter_version_format check (
    adapter_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  constraint evidence_records_evidence_type check (
    evidence_type in (
      'organization_profile',
      'capability_signal',
      'public_change_signal',
      'data_availability',
      'operating_context'
    )
  ),
  constraint evidence_records_epistemic_status check (
    epistemic_status in ('verified', 'calculated', 'rule_based', 'inference', 'missing', 'stale')
  ),
  constraint evidence_records_access_classification check (
    access_classification in ('synthetic', 'public', 'internal', 'restricted')
  ),
  constraint evidence_records_title_length check (char_length(title) between 1 and 160),
  constraint evidence_records_summary_length check (char_length(summary) between 1 and 600),
  constraint evidence_records_safe_search_bound check (char_length(safe_search_text) <= 800),
  constraint evidence_records_restricted_search check (
    access_classification <> 'restricted' or safe_search_text = ''
  ),
  constraint evidence_records_missing_observation check (
    epistemic_status <> 'missing' or observation is null
  ),
  constraint evidence_records_inference_publication check (
    epistemic_status <> 'inference' or publication_eligibility <> 'eligible'
  ),
  constraint evidence_records_effective_period check (
    effective_period_end is null
    or effective_period_start is null
    or effective_period_end >= effective_period_start
  ),
  constraint evidence_records_freshness check (freshness in ('unknown', 'current', 'aging', 'stale')),
  constraint evidence_records_confidence check (confidence in ('unknown', 'low', 'moderate', 'high')),
  constraint evidence_records_publication_eligibility check (
    publication_eligibility in ('restricted', 'internal_only', 'review_required', 'eligible')
  ),
  constraint evidence_records_calculation_descriptor_length check (
    calculation_descriptor is null or char_length(calculation_descriptor) between 1 and 200
  ),
  constraint evidence_records_rule_set_ref_length check (
    rule_set_ref is null or char_length(rule_set_ref) between 1 and 120
  ),
  constraint evidence_records_staleness_reason_length check (
    staleness_reason is null or char_length(staleness_reason) between 1 and 240
  ),
  constraint evidence_records_data_classification check (
    data_classification in ('synthetic', 'public_source', 'tenant_private', 'restricted')
  ),
  constraint evidence_records_domain_schema_version_format check (
    domain_schema_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  constraint evidence_records_timestamps check (updated_at >= created_at),
  constraint evidence_records_organization_fk foreign key (
    tenant_id,
    organization_id,
    vertical_id
  ) references institutionlens.organizations(tenant_id, id, vertical_id) on delete cascade,
  constraint evidence_records_provenance_fk foreign key (tenant_id, provenance_id)
    references institutionlens.provenance_records(tenant_id, id) on delete restrict,
  constraint evidence_records_import_run_fk foreign key (tenant_id, import_run_id)
    references institutionlens.import_runs(tenant_id, id) on delete restrict
);

create table institutionlens.evidence_dependencies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references institutionlens.tenants(id) on delete cascade,
  organization_id uuid not null,
  evidence_id uuid not null,
  input_evidence_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint evidence_dependencies_tenant_id_id_key unique (tenant_id, id),
  constraint evidence_dependencies_edge_key unique (tenant_id, evidence_id, input_evidence_id),
  constraint evidence_dependencies_not_self check (evidence_id <> input_evidence_id),
  constraint evidence_dependencies_evidence_fk foreign key (
    tenant_id,
    evidence_id,
    organization_id
  ) references institutionlens.evidence_records(tenant_id, id, organization_id) on delete cascade,
  constraint evidence_dependencies_input_evidence_fk foreign key (
    tenant_id,
    input_evidence_id,
    organization_id
  ) references institutionlens.evidence_records(tenant_id, id, organization_id) on delete restrict
);

create table institutionlens.assessment_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references institutionlens.tenants(id) on delete cascade,
  public_ref text not null,
  organization_id uuid not null,
  vertical_id text not null,
  adapter_version text not null,
  portfolio_ref text not null,
  portfolio_version text not null,
  methodology_version text not null,
  engine_version text not null,
  domain_schema_version text not null,
  evidence_fingerprint text not null,
  output_fingerprint text,
  manifest jsonb not null,
  status text not null default 'pending',
  publication_eligibility text not null default 'restricted',
  synthetic boolean not null,
  failure_code text,
  requested_at timestamptz not null default statement_timestamp(),
  started_at timestamptz,
  completed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint assessment_runs_tenant_id_id_key unique (tenant_id, id),
  constraint assessment_runs_tenant_id_organization_key unique (tenant_id, id, organization_id),
  constraint assessment_runs_tenant_public_ref_key unique (tenant_id, public_ref),
  constraint assessment_runs_tenant_output_fingerprint_key unique (
    tenant_id,
    organization_id,
    output_fingerprint
  ),
  constraint assessment_runs_public_ref_format check (public_ref ~ '^aref_[a-f0-9]{20,32}$'),
  constraint assessment_runs_vertical_id_format check (vertical_id ~ '^[a-z][a-z0-9_]{2,63}$'),
  constraint assessment_runs_versions check (
    adapter_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
    and portfolio_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
    and methodology_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
    and engine_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
    and domain_schema_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  constraint assessment_runs_portfolio_ref_length check (char_length(portfolio_ref) between 1 and 120),
  constraint assessment_runs_evidence_fingerprint_format check (
    evidence_fingerprint ~ '^[a-f0-9]{64}$'
  ),
  constraint assessment_runs_output_fingerprint_format check (
    output_fingerprint is null or output_fingerprint ~ '^[a-f0-9]{64}$'
  ),
  constraint assessment_runs_manifest_object check (jsonb_typeof(manifest) = 'object'),
  constraint assessment_runs_status check (
    status in ('pending', 'running', 'succeeded', 'failed', 'superseded')
  ),
  constraint assessment_runs_publication_eligibility check (
    publication_eligibility in ('restricted', 'internal_only', 'review_required', 'eligible')
  ),
  constraint assessment_runs_failure_state check (
    (status = 'failed' and failure_code is not null) or status <> 'failed'
  ),
  constraint assessment_runs_failure_code_format check (
    failure_code is null or failure_code ~ '^[a-z][a-z0-9_]{0,79}$'
  ),
  constraint assessment_runs_completion_state check (
    (status in ('succeeded', 'failed', 'superseded') and completed_at is not null)
    or status in ('pending', 'running')
  ),
  constraint assessment_runs_output_state check (
    status <> 'succeeded' or output_fingerprint is not null
  ),
  constraint assessment_runs_time_order check (
    (started_at is null or started_at >= requested_at)
    and (completed_at is null or started_at is not null)
    and (completed_at is null or completed_at >= started_at)
    and (published_at is null or completed_at is not null)
    and (published_at is null or published_at >= completed_at)
  ),
  constraint assessment_runs_organization_fk foreign key (
    tenant_id,
    organization_id,
    vertical_id
  ) references institutionlens.organizations(tenant_id, id, vertical_id) on delete cascade
);

create table institutionlens.assessment_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references institutionlens.tenants(id) on delete cascade,
  assessment_run_id uuid not null,
  organization_id uuid not null,
  fit_status text not null,
  points_awarded integer,
  points_possible integer,
  observed_fit_band text,
  confidence text not null,
  freshness text not null,
  completeness text not null,
  publication_eligibility text not null,
  coverage jsonb not null,
  opportunity_contexts jsonb not null default '[]'::jsonb,
  assessed_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint assessment_results_tenant_id_id_key unique (tenant_id, id),
  constraint assessment_results_tenant_lineage_key unique (
    tenant_id,
    id,
    assessment_run_id,
    organization_id
  ),
  constraint assessment_results_tenant_run_key unique (tenant_id, assessment_run_id),
  constraint assessment_results_fit_status check (
    fit_status in ('unassessed', 'insufficient_evidence', 'invalid', 'superseded', 'assessed')
  ),
  constraint assessment_results_fit_values check (
    (
      fit_status = 'assessed'
      and points_awarded between 0 and 10000
      and points_possible between 1 and 10000
      and points_awarded <= points_possible
      and observed_fit_band is not null
    )
    or (
      fit_status <> 'assessed'
      and points_awarded is null
      and points_possible is null
      and observed_fit_band is null
    )
  ),
  constraint assessment_results_observed_fit_band check (
    observed_fit_band is null
    or observed_fit_band in (
      'limited_observed_alignment',
      'emerging_observed_alignment',
      'meaningful_observed_alignment',
      'strong_observed_alignment'
    )
  ),
  constraint assessment_results_confidence check (confidence in ('unknown', 'low', 'moderate', 'high')),
  constraint assessment_results_freshness check (freshness in ('unknown', 'current', 'aging', 'stale')),
  constraint assessment_results_completeness check (
    completeness in ('unknown', 'insufficient', 'partial', 'sufficient')
  ),
  constraint assessment_results_publication_eligibility check (
    publication_eligibility in ('restricted', 'internal_only', 'review_required', 'eligible')
  ),
  constraint assessment_results_coverage_object check (jsonb_typeof(coverage) = 'object'),
  constraint assessment_results_opportunity_contexts_array check (
    jsonb_typeof(opportunity_contexts) = 'array'
    and jsonb_array_length(opportunity_contexts) <= 20
  ),
  constraint assessment_results_run_fk foreign key (
    tenant_id,
    assessment_run_id,
    organization_id
  ) references institutionlens.assessment_runs(tenant_id, id, organization_id) on delete cascade,
  constraint assessment_results_organization_fk foreign key (tenant_id, organization_id)
    references institutionlens.organizations(tenant_id, id) on delete cascade
);

create table institutionlens.capability_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references institutionlens.tenants(id) on delete cascade,
  assessment_run_id uuid not null,
  assessment_result_id uuid not null,
  organization_id uuid not null,
  capability_ref text not null,
  rule_set_ref text not null,
  rule_set_version text not null,
  fit_status text not null,
  points_awarded integer,
  points_possible integer,
  observed_fit_band text,
  confidence text not null,
  freshness text not null,
  completeness text not null,
  publication_eligibility text not null,
  assessed_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint capability_results_tenant_id_id_key unique (tenant_id, id),
  constraint capability_results_tenant_lineage_key unique (
    tenant_id,
    id,
    assessment_run_id,
    organization_id
  ),
  constraint capability_results_tenant_run_capability_key unique (
    tenant_id,
    assessment_run_id,
    capability_ref
  ),
  constraint capability_results_refs check (
    capability_ref ~ '^[a-z][a-z0-9_]{2,119}$'
    and rule_set_ref ~ '^[a-z][a-z0-9_]{2,119}$'
  ),
  constraint capability_results_rule_set_version_format check (
    rule_set_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  constraint capability_results_fit_status check (
    fit_status in ('unassessed', 'insufficient_evidence', 'invalid', 'superseded', 'assessed')
  ),
  constraint capability_results_fit_values check (
    (
      fit_status = 'assessed'
      and points_awarded between 0 and 10000
      and points_possible between 1 and 10000
      and points_awarded <= points_possible
      and observed_fit_band is not null
    )
    or (
      fit_status <> 'assessed'
      and points_awarded is null
      and points_possible is null
      and observed_fit_band is null
    )
  ),
  constraint capability_results_observed_fit_band check (
    observed_fit_band is null
    or observed_fit_band in (
      'limited_observed_alignment',
      'emerging_observed_alignment',
      'meaningful_observed_alignment',
      'strong_observed_alignment'
    )
  ),
  constraint capability_results_confidence check (confidence in ('unknown', 'low', 'moderate', 'high')),
  constraint capability_results_freshness check (freshness in ('unknown', 'current', 'aging', 'stale')),
  constraint capability_results_completeness check (
    completeness in ('unknown', 'insufficient', 'partial', 'sufficient')
  ),
  constraint capability_results_publication_eligibility check (
    publication_eligibility in ('restricted', 'internal_only', 'review_required', 'eligible')
  ),
  constraint capability_results_run_fk foreign key (
    tenant_id,
    assessment_run_id,
    organization_id
  ) references institutionlens.assessment_runs(tenant_id, id, organization_id) on delete cascade,
  constraint capability_results_result_fk foreign key (
    tenant_id,
    assessment_result_id,
    assessment_run_id,
    organization_id
  ) references institutionlens.assessment_results(
    tenant_id,
    id,
    assessment_run_id,
    organization_id
  ) on delete cascade,
  constraint capability_results_organization_fk foreign key (tenant_id, organization_id)
    references institutionlens.organizations(tenant_id, id) on delete cascade
);

create table institutionlens.rule_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references institutionlens.tenants(id) on delete cascade,
  organization_id uuid not null,
  assessment_run_id uuid not null,
  capability_result_id uuid not null,
  rule_ref text not null,
  rule_set_version text not null,
  factor_category text not null,
  outcome text not null,
  points_awarded integer not null,
  maximum_points integer not null,
  reason text not null,
  reason_code text not null,
  epistemic_states text[] not null default '{}',
  freshness_states text[] not null default '{}',
  publication_eligibility text not null,
  evaluated_at timestamptz not null,
  engine_version text not null,
  synthetic boolean not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint rule_results_tenant_id_id_key unique (tenant_id, id),
  constraint rule_results_tenant_id_organization_key unique (tenant_id, id, organization_id),
  constraint rule_results_tenant_capability_rule_key unique (
    tenant_id,
    capability_result_id,
    rule_ref
  ),
  constraint rule_results_rule_ref_format check (rule_ref ~ '^[a-z][a-z0-9_]{2,119}$'),
  constraint rule_results_rule_set_version_format check (
    rule_set_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  constraint rule_results_factor_category check (
    factor_category in (
      'organizational_profile_fit',
      'capability_alignment',
      'publicly_evidenced_need',
      'timing_change_signals',
      'operational_compatibility'
    )
  ),
  constraint rule_results_outcome check (
    outcome in (
      'awarded',
      'not_awarded',
      'not_evaluated_missing',
      'not_evaluated_stale',
      'not_evaluated_restricted',
      'blocked_by_gate',
      'rule_disabled',
      'invalid_input'
    )
  ),
  constraint rule_results_points check (
    maximum_points between 1 and 100
    and points_awarded between 0 and maximum_points
    and (
      (outcome = 'awarded' and points_awarded > 0)
      or (outcome <> 'awarded' and points_awarded = 0)
    )
  ),
  constraint rule_results_reason_length check (char_length(reason) between 1 and 400),
  constraint rule_results_reason_code_format check (
    reason_code ~ '^[a-z][a-z0-9_]{0,79}$'
  ),
  constraint rule_results_epistemic_states_bound check (cardinality(epistemic_states) <= 20),
  constraint rule_results_freshness_states_bound check (cardinality(freshness_states) <= 20),
  constraint rule_results_publication_eligibility check (
    publication_eligibility in ('restricted', 'internal_only', 'review_required', 'eligible')
  ),
  constraint rule_results_engine_version_format check (
    engine_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  constraint rule_results_run_fk foreign key (
    tenant_id,
    assessment_run_id,
    organization_id
  ) references institutionlens.assessment_runs(tenant_id, id, organization_id) on delete cascade,
  constraint rule_results_capability_result_fk foreign key (
    tenant_id,
    capability_result_id,
    assessment_run_id,
    organization_id
  ) references institutionlens.capability_results(
    tenant_id,
    id,
    assessment_run_id,
    organization_id
  ) on delete cascade
);

create table institutionlens.rule_result_evidence (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references institutionlens.tenants(id) on delete cascade,
  organization_id uuid not null,
  rule_result_id uuid not null,
  evidence_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint rule_result_evidence_tenant_id_id_key unique (tenant_id, id),
  constraint rule_result_evidence_edge_key unique (tenant_id, rule_result_id, evidence_id),
  constraint rule_result_evidence_rule_result_fk foreign key (
    tenant_id,
    rule_result_id,
    organization_id
  ) references institutionlens.rule_results(tenant_id, id, organization_id) on delete cascade,
  constraint rule_result_evidence_evidence_fk foreign key (
    tenant_id,
    evidence_id,
    organization_id
  ) references institutionlens.evidence_records(tenant_id, id, organization_id) on delete restrict
);

create table institutionlens.organization_overlays (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references institutionlens.tenants(id) on delete cascade,
  organization_id uuid not null,
  schema_version text not null,
  relationship_status text not null,
  capability_usage jsonb not null default '[]'::jsonb,
  match_status text not null,
  review_status text not null,
  source_classification text not null,
  private_notes text,
  effective_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint organization_overlays_tenant_id_id_key unique (tenant_id, id),
  constraint organization_overlays_tenant_organization_key unique (tenant_id, organization_id),
  constraint organization_overlays_schema_version_format check (
    schema_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  constraint organization_overlays_relationship_status check (
    relationship_status in ('unknown', 'prospect', 'active_client', 'former_client', 'excluded')
  ),
  constraint organization_overlays_capability_usage_array check (
    jsonb_typeof(capability_usage) = 'array'
    and jsonb_array_length(capability_usage) <= 20
  ),
  constraint organization_overlays_match_status check (
    match_status in ('unreviewed', 'exact', 'probable', 'ambiguous', 'rejected')
  ),
  constraint organization_overlays_review_status check (
    review_status in ('unreviewed', 'reviewed', 'needs_attention')
  ),
  constraint organization_overlays_source_classification check (
    source_classification in ('tenant_provided', 'synthetic_demo')
  ),
  constraint organization_overlays_private_notes_length check (
    private_notes is null or char_length(private_notes) <= 1000
  ),
  constraint organization_overlays_timestamps check (updated_at >= created_at),
  constraint organization_overlays_organization_fk foreign key (tenant_id, organization_id)
    references institutionlens.organizations(tenant_id, id) on delete cascade
);

create table institutionlens.saved_comparisons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references institutionlens.tenants(id) on delete cascade,
  public_ref text not null,
  created_by_membership_id uuid not null,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  archived_at timestamptz,
  constraint saved_comparisons_tenant_id_id_key unique (tenant_id, id),
  constraint saved_comparisons_tenant_public_ref_key unique (tenant_id, public_ref),
  constraint saved_comparisons_public_ref_format check (public_ref ~ '^cref_[a-f0-9]{20,32}$'),
  constraint saved_comparisons_name_length check (char_length(name) between 1 and 120),
  constraint saved_comparisons_status check (status in ('active', 'archived')),
  constraint saved_comparisons_archive_state check (
    (status = 'archived' and archived_at is not null) or status <> 'archived'
  ),
  constraint saved_comparisons_timestamps check (updated_at >= created_at),
  constraint saved_comparisons_creator_fk foreign key (tenant_id, created_by_membership_id)
    references institutionlens.memberships(tenant_id, id) on delete restrict
);

create table institutionlens.saved_comparison_organizations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references institutionlens.tenants(id) on delete cascade,
  saved_comparison_id uuid not null,
  organization_id uuid not null,
  position smallint not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint saved_comparison_organizations_tenant_id_id_key unique (tenant_id, id),
  constraint saved_comparison_organizations_position_key unique (
    tenant_id,
    saved_comparison_id,
    position
  ),
  constraint saved_comparison_organizations_org_key unique (
    tenant_id,
    saved_comparison_id,
    organization_id
  ),
  constraint saved_comparison_organizations_position check (position between 1 and 3),
  constraint saved_comparison_organizations_comparison_fk foreign key (
    tenant_id,
    saved_comparison_id
  ) references institutionlens.saved_comparisons(tenant_id, id) on delete cascade,
  constraint saved_comparison_organizations_organization_fk foreign key (
    tenant_id,
    organization_id
  ) references institutionlens.organizations(tenant_id, id) on delete cascade
);

create table institutionlens.brief_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references institutionlens.tenants(id) on delete cascade,
  public_ref text not null,
  organization_id uuid not null,
  assessment_run_id uuid not null,
  created_by_membership_id uuid not null,
  approved_by_membership_id uuid,
  template_version text not null,
  state text not null default 'draft',
  publication_eligibility text not null,
  content_fingerprint text not null,
  content jsonb not null,
  source_manifest jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  approved_at timestamptz,
  retention_expires_at timestamptz,
  constraint brief_snapshots_tenant_id_id_key unique (tenant_id, id),
  constraint brief_snapshots_tenant_public_ref_key unique (tenant_id, public_ref),
  constraint brief_snapshots_tenant_content_fingerprint_key unique (
    tenant_id,
    organization_id,
    content_fingerprint
  ),
  constraint brief_snapshots_public_ref_format check (public_ref ~ '^bsref_[a-f0-9]{20,32}$'),
  constraint brief_snapshots_template_version_format check (
    template_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  ),
  constraint brief_snapshots_state check (state in ('draft', 'approved', 'archived')),
  constraint brief_snapshots_publication_eligibility check (
    publication_eligibility in ('restricted', 'internal_only', 'review_required', 'eligible')
  ),
  constraint brief_snapshots_content_fingerprint_format check (
    content_fingerprint ~ '^[a-f0-9]{64}$'
  ),
  constraint brief_snapshots_content_object check (jsonb_typeof(content) = 'object'),
  constraint brief_snapshots_source_manifest_object check (jsonb_typeof(source_manifest) = 'object'),
  constraint brief_snapshots_approval_state check (
    state <> 'approved'
    or (approved_by_membership_id is not null and approved_at is not null)
  ),
  constraint brief_snapshots_timestamps check (
    updated_at >= created_at
    and (approved_at is null or approved_at >= created_at)
    and (retention_expires_at is null or retention_expires_at >= created_at)
  ),
  constraint brief_snapshots_organization_fk foreign key (tenant_id, organization_id)
    references institutionlens.organizations(tenant_id, id) on delete cascade,
  constraint brief_snapshots_assessment_run_fk foreign key (
    tenant_id,
    assessment_run_id,
    organization_id
  ) references institutionlens.assessment_runs(tenant_id, id, organization_id) on delete restrict,
  constraint brief_snapshots_creator_fk foreign key (tenant_id, created_by_membership_id)
    references institutionlens.memberships(tenant_id, id) on delete restrict,
  constraint brief_snapshots_approver_fk foreign key (tenant_id, approved_by_membership_id)
    references institutionlens.memberships(tenant_id, id) on delete restrict
);

create table institutionlens.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references institutionlens.tenants(id) on delete cascade,
  event_ref text not null,
  actor_membership_ref text,
  request_id uuid,
  event_type text not null,
  outcome text not null,
  target_type text,
  target_opaque_ref text,
  redacted_metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default statement_timestamp(),
  retention_expires_at timestamptz,
  constraint audit_events_tenant_id_id_key unique (tenant_id, id),
  constraint audit_events_tenant_event_ref_key unique (tenant_id, event_ref),
  constraint audit_events_event_ref_format check (event_ref ~ '^aev_[a-f0-9]{20,32}$'),
  constraint audit_events_actor_ref_format check (
    actor_membership_ref is null or actor_membership_ref ~ '^mref_[a-f0-9]{20,32}$'
  ),
  constraint audit_events_event_type_format check (event_type ~ '^[a-z][a-z0-9_.]{0,119}$'),
  constraint audit_events_outcome check (outcome in ('allowed', 'denied', 'succeeded', 'failed')),
  constraint audit_events_target_type_format check (
    target_type is null or target_type ~ '^[a-z][a-z0-9_]{0,79}$'
  ),
  constraint audit_events_target_ref_format check (
    target_opaque_ref is null
    or target_opaque_ref ~ '^(tref|oref|cref|bsref|iref|aref)_[a-f0-9]{20,32}$'
  ),
  constraint audit_events_target_pair check (
    (target_type is null and target_opaque_ref is null)
    or (target_type is not null and target_opaque_ref is not null)
  ),
  constraint audit_events_metadata_object check (
    jsonb_typeof(redacted_metadata) = 'object'
    and octet_length(redacted_metadata::text) <= 16384
  ),
  constraint audit_events_retention check (
    retention_expires_at is null or retention_expires_at >= occurred_at
  ),
  constraint audit_events_actor_fk foreign key (tenant_id, actor_membership_ref)
    references institutionlens.memberships(tenant_id, public_ref) on delete restrict
);

create index tenant_verticals_tenant_status_idx
  on institutionlens.tenant_verticals (tenant_id, status, vertical_id);
create index memberships_user_status_idx
  on institutionlens.memberships (user_id, status, tenant_id)
  where user_id is not null;
create index memberships_tenant_role_status_idx
  on institutionlens.memberships (tenant_id, role, status);
create index organizations_tenant_list_idx
  on institutionlens.organizations (tenant_id, lifecycle_status, display_name, id);
create index organizations_tenant_type_idx
  on institutionlens.organizations (tenant_id, organization_type, id);
create index organizations_tags_idx
  on institutionlens.organizations using gin (tags);
create index import_runs_tenant_status_idx
  on institutionlens.import_runs (tenant_id, status, queued_at desc, id);
create index provenance_records_tenant_filters_idx
  on institutionlens.provenance_records (
    tenant_id,
    access_classification,
    validation_status,
    license_status,
    id
  );
create index provenance_records_tenant_import_idx
  on institutionlens.provenance_records (tenant_id, import_run_id, id)
  where import_run_id is not null;
create index evidence_records_tenant_org_idx
  on institutionlens.evidence_records (
    tenant_id,
    organization_id,
    publication_eligibility,
    observed_at desc,
    id
  );
create index evidence_records_tenant_filters_idx
  on institutionlens.evidence_records (
    tenant_id,
    evidence_type,
    epistemic_status,
    freshness,
    confidence,
    id
  );
create index evidence_records_safe_search_idx
  on institutionlens.evidence_records using gin (
    to_tsvector('simple'::regconfig, safe_search_text)
  )
  where safe_search_text <> '' and access_classification <> 'restricted';
create index evidence_dependencies_input_idx
  on institutionlens.evidence_dependencies (tenant_id, input_evidence_id, evidence_id);
create index assessment_runs_tenant_org_idx
  on institutionlens.assessment_runs (tenant_id, organization_id, completed_at desc, id);
create index assessment_runs_tenant_status_idx
  on institutionlens.assessment_runs (tenant_id, status, requested_at desc, id);
create index assessment_results_tenant_assessed_idx
  on institutionlens.assessment_results (tenant_id, assessed_at desc, organization_id, id);
create index capability_results_tenant_org_idx
  on institutionlens.capability_results (tenant_id, organization_id, capability_ref, assessed_at desc);
create index rule_results_tenant_run_idx
  on institutionlens.rule_results (tenant_id, assessment_run_id, capability_result_id, id);
create index rule_result_evidence_evidence_idx
  on institutionlens.rule_result_evidence (tenant_id, evidence_id, rule_result_id);
create index organization_overlays_tenant_review_idx
  on institutionlens.organization_overlays (tenant_id, review_status, match_status, organization_id);
create index saved_comparisons_tenant_status_idx
  on institutionlens.saved_comparisons (tenant_id, status, updated_at desc, id);
create index saved_comparison_organizations_org_idx
  on institutionlens.saved_comparison_organizations (tenant_id, organization_id, saved_comparison_id);
create index brief_snapshots_tenant_org_idx
  on institutionlens.brief_snapshots (tenant_id, organization_id, state, created_at desc, id);
create index brief_snapshots_retention_idx
  on institutionlens.brief_snapshots (tenant_id, retention_expires_at, id)
  where retention_expires_at is not null;
create index audit_events_tenant_time_idx
  on institutionlens.audit_events (tenant_id, occurred_at desc, id);
create index audit_events_tenant_type_idx
  on institutionlens.audit_events (tenant_id, event_type, occurred_at desc, id);
create index audit_events_retention_idx
  on institutionlens.audit_events (tenant_id, retention_expires_at, id)
  where retention_expires_at is not null;

alter table institutionlens.tenants enable row level security;
alter table institutionlens.tenants force row level security;
alter table institutionlens.tenant_verticals enable row level security;
alter table institutionlens.tenant_verticals force row level security;
alter table institutionlens.memberships enable row level security;
alter table institutionlens.memberships force row level security;
alter table institutionlens.organizations enable row level security;
alter table institutionlens.organizations force row level security;
alter table institutionlens.import_runs enable row level security;
alter table institutionlens.import_runs force row level security;
alter table institutionlens.provenance_records enable row level security;
alter table institutionlens.provenance_records force row level security;
alter table institutionlens.evidence_records enable row level security;
alter table institutionlens.evidence_records force row level security;
alter table institutionlens.evidence_dependencies enable row level security;
alter table institutionlens.evidence_dependencies force row level security;
alter table institutionlens.assessment_runs enable row level security;
alter table institutionlens.assessment_runs force row level security;
alter table institutionlens.assessment_results enable row level security;
alter table institutionlens.assessment_results force row level security;
alter table institutionlens.capability_results enable row level security;
alter table institutionlens.capability_results force row level security;
alter table institutionlens.rule_results enable row level security;
alter table institutionlens.rule_results force row level security;
alter table institutionlens.rule_result_evidence enable row level security;
alter table institutionlens.rule_result_evidence force row level security;
alter table institutionlens.organization_overlays enable row level security;
alter table institutionlens.organization_overlays force row level security;
alter table institutionlens.saved_comparisons enable row level security;
alter table institutionlens.saved_comparisons force row level security;
alter table institutionlens.saved_comparison_organizations enable row level security;
alter table institutionlens.saved_comparison_organizations force row level security;
alter table institutionlens.brief_snapshots enable row level security;
alter table institutionlens.brief_snapshots force row level security;
alter table institutionlens.audit_events enable row level security;
alter table institutionlens.audit_events force row level security;

revoke all on all tables in schema institutionlens from public, anon, authenticated, service_role;
revoke all on all sequences in schema institutionlens from public, anon, authenticated, service_role;
revoke execute on all functions in schema institutionlens from public, anon, authenticated, service_role;

commit;
