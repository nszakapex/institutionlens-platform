-- Phase 9 Batch 4 preparation: authenticated read-only RLS enablement.
-- Principal binding: auth.uid() -> institutionlens.memberships.user_id (status = active).
-- Tenant identity comes only from that membership row, never from client input or JWT claims.
-- All authenticated table access uses explicit column grants (never table-level SELECT) so
-- withheld columns cannot be reached. anon, PUBLIC, and service_role remain denied.
-- No INSERT/UPDATE/DELETE policies or grants.
begin;

-- Narrow helpers: return only the caller's own membership facts.
-- SECURITY DEFINER avoids membership RLS recursion; search_path is pinned; execute is
-- authenticated-only. These are not broad bypass helpers and use no dynamic SQL.
create or replace function institutionlens.accessible_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = institutionlens, pg_catalog
as $$
  select memberships.tenant_id
  from institutionlens.memberships
  where memberships.user_id = (select auth.uid())
    and memberships.status = 'active';
$$;

create or replace function institutionlens.own_membership_ids()
returns setof uuid
language sql
stable
security definer
set search_path = institutionlens, pg_catalog
as $$
  select memberships.id
  from institutionlens.memberships
  where memberships.user_id = (select auth.uid());
$$;

create or replace function institutionlens.active_member_has_roles(
  p_tenant_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = institutionlens, pg_catalog
as $$
  select exists (
    select 1
    from institutionlens.memberships
    where memberships.tenant_id = p_tenant_id
      and memberships.user_id = (select auth.uid())
      and memberships.status = 'active'
      and memberships.role = any (p_roles)
  );
$$;

revoke all on function institutionlens.accessible_tenant_ids() from public, anon, authenticated, service_role;
revoke all on function institutionlens.own_membership_ids() from public, anon, authenticated, service_role;
revoke all on function institutionlens.active_member_has_roles(uuid, text[]) from public, anon, authenticated, service_role;
grant execute on function institutionlens.accessible_tenant_ids() to authenticated;
grant execute on function institutionlens.own_membership_ids() to authenticated;
grant execute on function institutionlens.active_member_has_roles(uuid, text[]) to authenticated;

grant usage on schema institutionlens to authenticated;

-- Explicit column grants only. Never GRANT SELECT ON TABLE for InstitutionLens relations:
-- a table-level SELECT would expose every column, including withheld ones.
grant select (
  id,
  public_ref,
  display_name,
  status,
  data_classification,
  demo,
  created_at,
  updated_at,
  suspended_at,
  deletion_requested_at
) on table institutionlens.tenants to authenticated;

grant select (
  id,
  tenant_id,
  vertical_id,
  adapter_version,
  status,
  created_at,
  updated_at
) on table institutionlens.tenant_verticals to authenticated;

-- Self-only rows via RLS. Omit auth.users user_id so coworkers cannot read Auth UUIDs.
grant select (
  id,
  tenant_id,
  public_ref,
  role,
  status,
  invited_by_membership_id,
  invited_at,
  joined_at,
  suspended_at,
  removed_at,
  created_at,
  updated_at
) on table institutionlens.memberships to authenticated;

grant select (
  id,
  tenant_id,
  public_ref,
  source_key,
  vertical_id,
  adapter_version,
  display_name,
  legal_name,
  organization_type,
  lifecycle_status,
  primary_location,
  summary,
  tags,
  external_references,
  vertical_payload,
  synthetic,
  data_classification,
  domain_schema_version,
  created_at,
  updated_at,
  archived_at
) on table institutionlens.organizations to authenticated;

grant select (
  id,
  tenant_id,
  public_ref,
  initiated_by_membership_id,
  source_key,
  idempotency_key,
  input_checksum,
  contract_version,
  source_policy_version,
  status,
  dry_run,
  record_counts,
  safe_error_summary,
  queued_at,
  started_at,
  finished_at,
  cleanup_after,
  created_at
) on table institutionlens.import_runs to authenticated;

-- Omit private_notes and source_reference (never client-reachable).
grant select (
  id,
  tenant_id,
  import_run_id,
  source_key,
  source_type,
  source_name,
  retrieved_at,
  published_at,
  reporting_period_start,
  reporting_period_end,
  checksum,
  license_status,
  access_classification,
  validation_status,
  synthetic,
  data_classification,
  created_at,
  updated_at
) on table institutionlens.provenance_records to authenticated;

grant select (
  id,
  tenant_id,
  organization_id,
  provenance_id,
  import_run_id,
  source_key,
  vertical_id,
  adapter_version,
  evidence_type,
  epistemic_status,
  access_classification,
  title,
  summary,
  observation,
  safe_search_text,
  observed_at,
  effective_period_start,
  effective_period_end,
  freshness,
  confidence,
  publication_eligibility,
  calculation_descriptor,
  rule_set_ref,
  staleness_reason,
  synthetic,
  data_classification,
  domain_schema_version,
  created_at,
  updated_at,
  superseded_at
) on table institutionlens.evidence_records to authenticated;

grant select (
  id,
  tenant_id,
  organization_id,
  evidence_id,
  input_evidence_id,
  created_at
) on table institutionlens.evidence_dependencies to authenticated;

grant select (
  id,
  tenant_id,
  public_ref,
  organization_id,
  vertical_id,
  adapter_version,
  portfolio_ref,
  portfolio_version,
  methodology_version,
  engine_version,
  domain_schema_version,
  evidence_fingerprint,
  output_fingerprint,
  manifest,
  status,
  publication_eligibility,
  synthetic,
  failure_code,
  requested_at,
  started_at,
  completed_at,
  published_at,
  created_at
) on table institutionlens.assessment_runs to authenticated;

grant select (
  id,
  tenant_id,
  assessment_run_id,
  organization_id,
  fit_status,
  points_awarded,
  points_possible,
  observed_fit_band,
  confidence,
  freshness,
  completeness,
  publication_eligibility,
  coverage,
  opportunity_contexts,
  assessed_at,
  created_at
) on table institutionlens.assessment_results to authenticated;

grant select (
  id,
  tenant_id,
  assessment_run_id,
  assessment_result_id,
  organization_id,
  capability_ref,
  rule_set_ref,
  rule_set_version,
  fit_status,
  points_awarded,
  points_possible,
  observed_fit_band,
  confidence,
  freshness,
  completeness,
  publication_eligibility,
  assessed_at,
  created_at
) on table institutionlens.capability_results to authenticated;

grant select (
  id,
  tenant_id,
  organization_id,
  assessment_run_id,
  capability_result_id,
  rule_ref,
  rule_set_version,
  factor_category,
  outcome,
  points_awarded,
  maximum_points,
  reason,
  reason_code,
  epistemic_states,
  freshness_states,
  publication_eligibility,
  evaluated_at,
  engine_version,
  synthetic,
  created_at
) on table institutionlens.rule_results to authenticated;

grant select (
  id,
  tenant_id,
  organization_id,
  rule_result_id,
  evidence_id,
  created_at
) on table institutionlens.rule_result_evidence to authenticated;

-- Omit private_notes.
grant select (
  id,
  tenant_id,
  organization_id,
  schema_version,
  relationship_status,
  capability_usage,
  match_status,
  review_status,
  source_classification,
  effective_at,
  created_at,
  updated_at
) on table institutionlens.organization_overlays to authenticated;

grant select (
  id,
  tenant_id,
  public_ref,
  created_by_membership_id,
  name,
  status,
  created_at,
  updated_at,
  archived_at
) on table institutionlens.saved_comparisons to authenticated;

grant select (
  id,
  tenant_id,
  saved_comparison_id,
  organization_id,
  position,
  created_at
) on table institutionlens.saved_comparison_organizations to authenticated;

grant select (
  id,
  tenant_id,
  public_ref,
  organization_id,
  assessment_run_id,
  created_by_membership_id,
  approved_by_membership_id,
  template_version,
  state,
  publication_eligibility,
  content_fingerprint,
  content,
  source_manifest,
  created_at,
  updated_at,
  approved_at,
  retention_expires_at
) on table institutionlens.brief_snapshots to authenticated;

grant select (
  id,
  tenant_id,
  event_ref,
  actor_membership_ref,
  request_id,
  event_type,
  outcome,
  target_type,
  target_opaque_ref,
  redacted_metadata,
  occurred_at,
  retention_expires_at
) on table institutionlens.audit_events to authenticated;

-- Belt-and-suspenders: withhold sensitive columns even if a future table grant appears.
revoke select (private_notes) on table institutionlens.provenance_records from authenticated;
revoke select (source_reference) on table institutionlens.provenance_records from authenticated;
revoke select (private_notes) on table institutionlens.organization_overlays from authenticated;
revoke select (user_id) on table institutionlens.memberships from authenticated;

revoke insert, update, delete, truncate, references, trigger
  on all tables in schema institutionlens
  from authenticated;

revoke all on all tables in schema institutionlens from public, anon, service_role;
revoke all on all sequences in schema institutionlens from public, anon, authenticated, service_role;
revoke all on schema institutionlens from public, anon, service_role;

-- SELECT policies: authenticated only. No FOR ALL / write policies.
create policy tenants_select_authenticated
  on institutionlens.tenants
  for select
  to authenticated
  using (id in (select institutionlens.accessible_tenant_ids()));

create policy tenant_verticals_select_authenticated
  on institutionlens.tenant_verticals
  for select
  to authenticated
  using (tenant_id in (select institutionlens.accessible_tenant_ids()));

-- Self-only: never enumerate coworker memberships or auth.users references.
create policy memberships_select_authenticated
  on institutionlens.memberships
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy organizations_select_authenticated
  on institutionlens.organizations
  for select
  to authenticated
  using (tenant_id in (select institutionlens.accessible_tenant_ids()));

create policy import_runs_select_authenticated
  on institutionlens.import_runs
  for select
  to authenticated
  using (
    tenant_id in (select institutionlens.accessible_tenant_ids())
    and institutionlens.active_member_has_roles(tenant_id, array['owner', 'analyst']::text[])
  );

-- Provenance is research/internal: owner/analyst only; restricted rows owner-only.
-- Viewers receive no provenance rows (publication-safe UI must not require them).
create policy provenance_records_select_authenticated
  on institutionlens.provenance_records
  for select
  to authenticated
  using (
    tenant_id in (select institutionlens.accessible_tenant_ids())
    and institutionlens.active_member_has_roles(tenant_id, array['owner', 'analyst']::text[])
    and (
      access_classification <> 'restricted'
      or institutionlens.active_member_has_roles(tenant_id, array['owner']::text[])
    )
  );

create policy evidence_records_select_authenticated
  on institutionlens.evidence_records
  for select
  to authenticated
  using (
    tenant_id in (select institutionlens.accessible_tenant_ids())
    and (
      access_classification <> 'restricted'
      or institutionlens.active_member_has_roles(tenant_id, array['owner']::text[])
    )
    and (
      institutionlens.active_member_has_roles(tenant_id, array['owner', 'analyst']::text[])
      or (
        institutionlens.active_member_has_roles(tenant_id, array['viewer']::text[])
        and publication_eligibility = 'eligible'
      )
    )
  );

create policy evidence_dependencies_select_authenticated
  on institutionlens.evidence_dependencies
  for select
  to authenticated
  using (
    tenant_id in (select institutionlens.accessible_tenant_ids())
    and exists (
      select 1
      from institutionlens.evidence_records evidence
      where evidence.tenant_id = evidence_dependencies.tenant_id
        and evidence.id = evidence_dependencies.evidence_id
        and evidence.organization_id = evidence_dependencies.organization_id
    )
    and exists (
      select 1
      from institutionlens.evidence_records input_evidence
      where input_evidence.tenant_id = evidence_dependencies.tenant_id
        and input_evidence.id = evidence_dependencies.input_evidence_id
        and input_evidence.organization_id = evidence_dependencies.organization_id
    )
  );

create policy assessment_runs_select_authenticated
  on institutionlens.assessment_runs
  for select
  to authenticated
  using (
    tenant_id in (select institutionlens.accessible_tenant_ids())
    and (
      institutionlens.active_member_has_roles(tenant_id, array['owner', 'analyst']::text[])
      or (
        institutionlens.active_member_has_roles(tenant_id, array['viewer']::text[])
        and publication_eligibility = 'eligible'
      )
    )
  );

create policy assessment_results_select_authenticated
  on institutionlens.assessment_results
  for select
  to authenticated
  using (
    tenant_id in (select institutionlens.accessible_tenant_ids())
    and (
      institutionlens.active_member_has_roles(tenant_id, array['owner', 'analyst']::text[])
      or (
        institutionlens.active_member_has_roles(tenant_id, array['viewer']::text[])
        and publication_eligibility = 'eligible'
      )
    )
  );

create policy capability_results_select_authenticated
  on institutionlens.capability_results
  for select
  to authenticated
  using (
    tenant_id in (select institutionlens.accessible_tenant_ids())
    and (
      institutionlens.active_member_has_roles(tenant_id, array['owner', 'analyst']::text[])
      or (
        institutionlens.active_member_has_roles(tenant_id, array['viewer']::text[])
        and publication_eligibility = 'eligible'
      )
    )
  );

create policy rule_results_select_authenticated
  on institutionlens.rule_results
  for select
  to authenticated
  using (
    tenant_id in (select institutionlens.accessible_tenant_ids())
    and (
      institutionlens.active_member_has_roles(tenant_id, array['owner', 'analyst']::text[])
      or (
        institutionlens.active_member_has_roles(tenant_id, array['viewer']::text[])
        and publication_eligibility = 'eligible'
      )
    )
  );

create policy rule_result_evidence_select_authenticated
  on institutionlens.rule_result_evidence
  for select
  to authenticated
  using (
    tenant_id in (select institutionlens.accessible_tenant_ids())
    and exists (
      select 1
      from institutionlens.evidence_records evidence
      where evidence.tenant_id = rule_result_evidence.tenant_id
        and evidence.id = rule_result_evidence.evidence_id
        and evidence.organization_id = rule_result_evidence.organization_id
    )
    and exists (
      select 1
      from institutionlens.rule_results rule_result
      where rule_result.tenant_id = rule_result_evidence.tenant_id
        and rule_result.id = rule_result_evidence.rule_result_id
        and rule_result.organization_id = rule_result_evidence.organization_id
    )
  );

create policy organization_overlays_select_authenticated
  on institutionlens.organization_overlays
  for select
  to authenticated
  using (
    tenant_id in (select institutionlens.accessible_tenant_ids())
    and institutionlens.active_member_has_roles(tenant_id, array['owner', 'analyst']::text[])
  );

-- Self-only: callers cannot enumerate other members' saved comparisons.
create policy saved_comparisons_select_authenticated
  on institutionlens.saved_comparisons
  for select
  to authenticated
  using (
    tenant_id in (select institutionlens.accessible_tenant_ids())
    and created_by_membership_id in (select institutionlens.own_membership_ids())
  );

create policy saved_comparison_organizations_select_authenticated
  on institutionlens.saved_comparison_organizations
  for select
  to authenticated
  using (
    tenant_id in (select institutionlens.accessible_tenant_ids())
    and exists (
      select 1
      from institutionlens.saved_comparisons comparison
      where comparison.tenant_id = saved_comparison_organizations.tenant_id
        and comparison.id = saved_comparison_organizations.saved_comparison_id
    )
  );

-- Owner/analyst may read own drafts. Viewers never read drafts or non-eligible
-- briefs: role-wide column grants include content, so viewer rows must be
-- publication-eligible only.
create policy brief_snapshots_select_authenticated
  on institutionlens.brief_snapshots
  for select
  to authenticated
  using (
    tenant_id in (select institutionlens.accessible_tenant_ids())
    and (
      (
        created_by_membership_id in (select institutionlens.own_membership_ids())
        and institutionlens.active_member_has_roles(tenant_id, array['owner', 'analyst']::text[])
      )
      or (
        state = 'approved'
        and (
          institutionlens.active_member_has_roles(tenant_id, array['owner']::text[])
          or (
            institutionlens.active_member_has_roles(tenant_id, array['analyst']::text[])
            and publication_eligibility <> 'restricted'
          )
          or (
            institutionlens.active_member_has_roles(tenant_id, array['viewer']::text[])
            and publication_eligibility = 'eligible'
          )
        )
      )
    )
  );

create policy audit_events_select_authenticated
  on institutionlens.audit_events
  for select
  to authenticated
  using (
    tenant_id in (select institutionlens.accessible_tenant_ids())
    and institutionlens.active_member_has_roles(tenant_id, array['owner']::text[])
  );

commit;
