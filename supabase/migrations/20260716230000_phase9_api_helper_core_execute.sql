-- Phase 9 Auth/RPC repair:
-- Move internal helper/projection functions into the unexposed core schema and
-- grant EXECUTE on that exact allowlist to authenticated so SECURITY INVOKER
-- public RPCs can compose them. Helpers stay off the PostgREST surface.
-- Never GRANT EXECUTE on all functions in a schema. No SECURITY DEFINER.

begin;

do $move$
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
    where n.nspname = 'institutionlens_api'
      and p.proname = any (helper_names)
    order by p.proname, 2
  loop
    execute format(
      'alter function institutionlens_api.%I(%s) set schema institutionlens',
      r.proname,
      r.args
    );
  end loop;
end;
$move$;

do $rewrite$
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
    select p.oid, n.nspname, p.proname
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where (
        n.nspname = 'institutionlens'
        and p.proname = any (helper_names)
      )
      or (
        n.nspname = 'institutionlens_api'
        and p.proname = any (public_names)
      )
    order by n.nspname, p.proname
  loop
    def := pg_get_functiondef(r.oid);
    foreach h in array helper_names
    loop
      def := replace(def, 'institutionlens_api.' || h, 'institutionlens.' || h);
    end loop;
    if def ~* 'security[[:space:]]+definer' then
      raise exception 'Refusing to rewrite %; SECURITY DEFINER is forbidden', r.proname;
    end if;
    execute def;
  end loop;
end;
$rewrite$;

-- Exact helper EXECUTE allowlist for authenticated (no schema-wide grants).
revoke all on function institutionlens.as_utc_iso(timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.as_utc_iso(timestamptz) to authenticated;

revoke all on function institutionlens.map_data_classification(text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.map_data_classification(text) to authenticated;

revoke all on function institutionlens.map_lifecycle_status(text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.map_lifecycle_status(text) to authenticated;

revoke all on function institutionlens.project_organization(institutionlens.organizations, text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.project_organization(institutionlens.organizations, text) to authenticated;

revoke all on function institutionlens.project_evidence(
  institutionlens.evidence_records, text, text, text, text[]
) from public, anon, authenticated, service_role;
grant execute on function institutionlens.project_evidence(
  institutionlens.evidence_records, text, text, text, text[]
) to authenticated;

revoke all on function institutionlens.project_comparison(institutionlens.saved_comparisons, text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.project_comparison(institutionlens.saved_comparisons, text) to authenticated;

revoke all on function institutionlens.project_brief_snapshot(
  institutionlens.brief_snapshots, text, text
) from public, anon, authenticated, service_role;
grant execute on function institutionlens.project_brief_snapshot(
  institutionlens.brief_snapshots, text, text
) to authenticated;

revoke all on function institutionlens.derive_tenant_domain_id(text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.derive_tenant_domain_id(text) to authenticated;

revoke all on function institutionlens.derive_principal_domain_id(text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.derive_principal_domain_id(text) to authenticated;

revoke all on function institutionlens.map_tenant_workspace_status(text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.map_tenant_workspace_status(text) to authenticated;

revoke all on function institutionlens.map_provenance_access_classification(text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.map_provenance_access_classification(text) to authenticated;

revoke all on function institutionlens.map_provenance_license_status(text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.map_provenance_license_status(text) to authenticated;

revoke all on function institutionlens.map_provenance_source_type(text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.map_provenance_source_type(text) to authenticated;

revoke all on function institutionlens.pad_org_key(text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.pad_org_key(text) to authenticated;

revoke all on function institutionlens.capability_short(text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.capability_short(text) to authenticated;

revoke all on function institutionlens.synthesize_capability_assessment_id(text, text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.synthesize_capability_assessment_id(text, text) to authenticated;

revoke all on function institutionlens.synthesize_portfolio_assessment_id(text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.synthesize_portfolio_assessment_id(text) to authenticated;

revoke all on function institutionlens.project_capability_id(text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.project_capability_id(text) to authenticated;

revoke all on function institutionlens.project_rule_set_id(text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.project_rule_set_id(text) to authenticated;

revoke all on function institutionlens.project_portfolio_id(text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.project_portfolio_id(text) to authenticated;

revoke all on function institutionlens.project_overlay_id(text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.project_overlay_id(text) to authenticated;

revoke all on function institutionlens.project_ledger_entry_id(text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.project_ledger_entry_id(text) to authenticated;

revoke all on function institutionlens.project_rule_id(text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.project_rule_id(text) to authenticated;

revoke all on function institutionlens.build_fit_assessment(text, integer, integer, text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.build_fit_assessment(text, integer, integer, text) to authenticated;

revoke all on function institutionlens.project_provenance(institutionlens.provenance_records, text)
  from public, anon, authenticated, service_role;
grant execute on function institutionlens.project_provenance(institutionlens.provenance_records, text) to authenticated;

revoke all on function institutionlens.project_overlay(
  institutionlens.organization_overlays, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function institutionlens.project_overlay(
  institutionlens.organization_overlays, text, text, text
) to authenticated;

revoke all on function institutionlens.project_capability_assessment(
  institutionlens.assessment_runs,
  institutionlens.capability_results,
  institutionlens.organizations,
  text
) from public, anon, authenticated, service_role;
grant execute on function institutionlens.project_capability_assessment(
  institutionlens.assessment_runs,
  institutionlens.capability_results,
  institutionlens.organizations,
  text
) to authenticated;

revoke all on function institutionlens.project_portfolio_assessment(
  institutionlens.assessment_runs,
  institutionlens.assessment_results,
  institutionlens.organizations,
  text
) from public, anon, authenticated, service_role;
grant execute on function institutionlens.project_portfolio_assessment(
  institutionlens.assessment_runs,
  institutionlens.assessment_results,
  institutionlens.organizations,
  text
) to authenticated;

revoke all on function institutionlens.project_ledger_entry(
  institutionlens.rule_results, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function institutionlens.project_ledger_entry(
  institutionlens.rule_results, text, text, text
) to authenticated;

-- Fail closed if any helper remained in the exposed API schema or gained DEFINER.
do $assert$
declare
  leftover text;
  definer text;
begin
  select p.proname into leftover
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'institutionlens_api'
    and p.proname in (
      'as_utc_iso', 'map_data_classification', 'map_lifecycle_status', 'project_organization',
      'project_evidence', 'project_comparison', 'project_brief_snapshot', 'derive_tenant_domain_id',
      'derive_principal_domain_id', 'map_tenant_workspace_status', 'map_provenance_access_classification',
      'map_provenance_license_status', 'map_provenance_source_type', 'pad_org_key', 'capability_short',
      'synthesize_capability_assessment_id', 'synthesize_portfolio_assessment_id', 'project_capability_id',
      'project_rule_set_id', 'project_portfolio_id', 'project_overlay_id', 'project_ledger_entry_id',
      'project_rule_id', 'build_fit_assessment', 'project_provenance', 'project_overlay',
      'project_capability_assessment', 'project_portfolio_assessment', 'project_ledger_entry'
    )
  limit 1;
  if leftover is not null then
    raise exception 'Helper % still in institutionlens_api', leftover;
  end if;

  -- Only the moved projection helpers and public API RPCs must stay INVOKER.
  -- Existing RLS predicates (e.g. accessible_tenant_ids) remain SECURITY DEFINER by design.
  select p.proname into definer
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where p.prosecdef
    and (
      (
        n.nspname = 'institutionlens'
        and p.proname in (
          'as_utc_iso', 'map_data_classification', 'map_lifecycle_status', 'project_organization',
          'project_evidence', 'project_comparison', 'project_brief_snapshot', 'derive_tenant_domain_id',
          'derive_principal_domain_id', 'map_tenant_workspace_status', 'map_provenance_access_classification',
          'map_provenance_license_status', 'map_provenance_source_type', 'pad_org_key', 'capability_short',
          'synthesize_capability_assessment_id', 'synthesize_portfolio_assessment_id', 'project_capability_id',
          'project_rule_set_id', 'project_portfolio_id', 'project_overlay_id', 'project_ledger_entry_id',
          'project_rule_id', 'build_fit_assessment', 'project_provenance', 'project_overlay',
          'project_capability_assessment', 'project_portfolio_assessment', 'project_ledger_entry'
        )
      )
      or (
        n.nspname = 'institutionlens_api'
        and p.proname in (
          'organizations_get_by_public_ref', 'organizations_get_by_domain_id', 'organizations_list',
          'organizations_count', 'evidence_list_by_organization_domain_id', 'comparisons_get_by_public_ref',
          'comparisons_list', 'brief_snapshots_get_by_public_ref', 'brief_snapshots_list',
          'session_tenant_public_ref', 'workspace_get', 'provenance_get_by_domain_id', 'capabilities_list',
          'assessments_list_portfolios', 'assessments_get_portfolio_by_domain_id',
          'assessments_list_capabilities', 'assessments_get_capability_by_domain_id',
          'assessments_get_ledger', 'assessments_get_manifest', 'assessments_get_opportunity_context',
          'portfolios_list', 'portfolios_get_by_domain_id', 'overlays_get_by_organization_domain_id',
          'overlays_list', 'overlays_get_by_domain_id'
        )
      )
    )
  limit 1;
  if definer is not null then
    raise exception 'SECURITY DEFINER forbidden on API helper/RPC %', definer;
  end if;
end;
$assert$;

commit;
