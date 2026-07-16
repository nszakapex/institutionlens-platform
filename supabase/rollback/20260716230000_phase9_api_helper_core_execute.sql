-- Rollback Phase 9 Auth/RPC helper repair.
-- Moves helpers back to institutionlens_api and revokes authenticated EXECUTE.
-- Does not drop public RPCs or core tables.

begin;

-- Move helpers back first so CREATE lines stay schema-correct during rewrite.
do $move_back$
declare
  helper_names text[] := array[
    'as_utc_iso',
    'map_data_classification',
    'map_lifecycle_status',
    'project_organization',
    'project_evidence',
    'project_comparison',
    'project_brief_snapshot',
    'derive_tenant_domain_id',
    'derive_principal_domain_id',
    'map_tenant_workspace_status',
    'map_provenance_access_classification',
    'map_provenance_license_status',
    'map_provenance_source_type',
    'pad_org_key',
    'capability_short',
    'synthesize_capability_assessment_id',
    'synthesize_portfolio_assessment_id',
    'project_capability_id',
    'project_rule_set_id',
    'project_portfolio_id',
    'project_overlay_id',
    'project_ledger_entry_id',
    'project_rule_id',
    'build_fit_assessment',
    'project_provenance',
    'project_overlay',
    'project_capability_assessment',
    'project_portfolio_assessment',
    'project_ledger_entry'
  ];
  r record;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'institutionlens'
      and p.proname = any (helper_names)
  loop
    execute format(
      'alter function institutionlens.%I(%s) set schema institutionlens_api',
      r.proname,
      r.args
    );
  end loop;
end;
$move_back$;

do $rewrite_back$
declare
  helper_names text[] := array[
    'project_capability_assessment',
    'project_portfolio_assessment',
    'synthesize_capability_assessment_id',
    'synthesize_portfolio_assessment_id',
    'map_provenance_access_classification',
    'map_provenance_license_status',
    'map_provenance_source_type',
    'map_tenant_workspace_status',
    'derive_principal_domain_id',
    'derive_tenant_domain_id',
    'project_brief_snapshot',
    'project_ledger_entry_id',
    'project_capability_id',
    'map_data_classification',
    'project_ledger_entry',
    'project_organization',
    'project_rule_set_id',
    'project_portfolio_id',
    'build_fit_assessment',
    'map_lifecycle_status',
    'project_comparison',
    'project_overlay_id',
    'project_provenance',
    'project_evidence',
    'capability_short',
    'project_overlay',
    'project_rule_id',
    'pad_org_key',
    'as_utc_iso'
  ];
  public_names text[] := array[
    'organizations_get_by_public_ref',
    'organizations_get_by_domain_id',
    'organizations_list',
    'organizations_count',
    'evidence_list_by_organization_domain_id',
    'comparisons_get_by_public_ref',
    'comparisons_list',
    'brief_snapshots_get_by_public_ref',
    'brief_snapshots_list',
    'session_tenant_public_ref',
    'workspace_get',
    'provenance_get_by_domain_id',
    'capabilities_list',
    'assessments_list_portfolios',
    'assessments_get_portfolio_by_domain_id',
    'assessments_list_capabilities',
    'assessments_get_capability_by_domain_id',
    'assessments_get_ledger',
    'assessments_get_manifest',
    'assessments_get_opportunity_context',
    'portfolios_list',
    'portfolios_get_by_domain_id',
    'overlays_get_by_organization_domain_id',
    'overlays_list',
    'overlays_get_by_domain_id'
  ];
  r record;
  def text;
  h text;
begin
  for r in
    select p.oid
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'institutionlens_api'
      and (
        p.proname = any (helper_names)
        or p.proname = any (public_names)
      )
  loop
    def := pg_get_functiondef(r.oid);
    foreach h in array helper_names
    loop
      def := replace(def, 'institutionlens.' || h, 'institutionlens_api.' || h);
    end loop;
    execute def;
  end loop;
end;
$rewrite_back$;

revoke all on function institutionlens_api.as_utc_iso(timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.map_data_classification(text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.map_lifecycle_status(text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.project_organization(institutionlens.organizations, text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.project_evidence(
  institutionlens.evidence_records, text, text, text, text[]
) from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.project_comparison(institutionlens.saved_comparisons, text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.project_brief_snapshot(
  institutionlens.brief_snapshots, text, text
) from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.derive_tenant_domain_id(text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.derive_principal_domain_id(text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.map_tenant_workspace_status(text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.map_provenance_access_classification(text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.map_provenance_license_status(text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.map_provenance_source_type(text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.pad_org_key(text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.capability_short(text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.synthesize_capability_assessment_id(text, text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.synthesize_portfolio_assessment_id(text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.project_capability_id(text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.project_rule_set_id(text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.project_portfolio_id(text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.project_overlay_id(text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.project_ledger_entry_id(text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.project_rule_id(text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.build_fit_assessment(text, integer, integer, text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.project_provenance(institutionlens.provenance_records, text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.project_overlay(
  institutionlens.organization_overlays, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.project_capability_assessment(
  institutionlens.assessment_runs,
  institutionlens.capability_results,
  institutionlens.organizations,
  text
) from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.project_portfolio_assessment(
  institutionlens.assessment_runs,
  institutionlens.assessment_results,
  institutionlens.organizations,
  text
) from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.project_ledger_entry(
  institutionlens.rule_results, text, text, text
) from public, anon, authenticated, service_role;

commit;
