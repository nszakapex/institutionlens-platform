-- Phase 9 Batch 5: remaining authenticated read API/RPC surface.
-- Additive to institutionlens_api; SECURITY INVOKER, parameterized, read-only.
-- Every public RPC requires p_tenant_public_ref and verifies accessible_tenant_ids().
begin;

create or replace function institutionlens_api.derive_tenant_domain_id(p_tenant_public_ref text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
      then 'tenant_' || substring(p_tenant_public_ref from 6)
    else null
  end;
$$;

revoke all on function institutionlens_api.derive_tenant_domain_id(text)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.derive_principal_domain_id(p_membership_public_ref text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when p_membership_public_ref ~ '^mref_[a-f0-9]{20,32}$'
      then 'principal_' || substring(p_membership_public_ref from 6)
    else null
  end;
$$;

revoke all on function institutionlens_api.derive_principal_domain_id(text)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.map_tenant_workspace_status(p_value text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case p_value
    when 'active' then 'active'
    when 'suspended' then 'suspended'
    when 'deletion_pending' then 'suspended'
    else null
  end;
$$;

revoke all on function institutionlens_api.map_tenant_workspace_status(text)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.map_provenance_access_classification(p_value text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case p_value
    when 'synthetic' then 'synthetic'
    when 'internal' then 'internal'
    when 'restricted' then 'restricted'
    when 'public' then 'internal'
    else null
  end;
$$;

revoke all on function institutionlens_api.map_provenance_access_classification(text)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.map_provenance_license_status(p_value text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case p_value
    when 'synthetic_demo' then 'synthetic_demo'
    when 'unknown' then 'unknown'
    when 'permitted_internal' then 'permitted_internal'
    when 'permitted_public' then 'permitted_internal'
    when 'prohibited' then 'unknown'
    else null
  end;
$$;

revoke all on function institutionlens_api.map_provenance_license_status(text)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.map_provenance_source_type(p_value text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case p_value
    when 'synthetic_fixture' then 'synthetic_fixture'
    when 'synthetic_document' then 'synthetic_document'
    when 'synthetic_observation' then 'synthetic_observation'
    else null
  end;
$$;

revoke all on function institutionlens_api.map_provenance_source_type(text)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.pad_org_key(p_org_source_key text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select coalesce(substring(p_org_source_key from '^org_syn_fi_([0-9]{3})$'), '000');
$$;

revoke all on function institutionlens_api.pad_org_key(text)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.capability_short(p_capability_ref text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select left(
    replace(replace(p_capability_ref, 'cap_syn_fi_', ''), '_', ''),
    12
  );
$$;

revoke all on function institutionlens_api.capability_short(text)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.synthesize_capability_assessment_id(
  p_org_source_key text,
  p_capability_ref text
)
returns text
language sql
immutable
parallel safe
set search_path = institutionlens_api, pg_catalog
as $$
  select case
    when p_org_source_key ~ '^org_[a-z0-9_]{1,48}$'
      and p_capability_ref ~ '^[a-z][a-z0-9_]{2,119}$'
      then 'assess_syn_fi_'
        || institutionlens_api.pad_org_key(p_org_source_key)
        || '_'
        || institutionlens_api.capability_short(p_capability_ref)
    else null
  end;
$$;

revoke all on function institutionlens_api.synthesize_capability_assessment_id(text, text)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.synthesize_portfolio_assessment_id(p_org_source_key text)
returns text
language sql
immutable
parallel safe
set search_path = institutionlens_api, pg_catalog
as $$
  select case
    when p_org_source_key ~ '^org_[a-z0-9_]{1,48}$'
      then 'assess_syn_fi_' || institutionlens_api.pad_org_key(p_org_source_key) || '_portfolio'
    else null
  end;
$$;

revoke all on function institutionlens_api.synthesize_portfolio_assessment_id(text)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.project_capability_id(p_capability_ref text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when p_capability_ref ~ '^cap_[a-z0-9_]{1,48}$' then p_capability_ref
    when p_capability_ref ~ '^[a-z][a-z0-9_]{2,119}$' then 'cap_syn_fi_' || p_capability_ref
    else null
  end;
$$;

revoke all on function institutionlens_api.project_capability_id(text)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.project_rule_set_id(p_rule_set_ref text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when p_rule_set_ref ~ '^ruleset_[a-z0-9_]{1,48}$' then p_rule_set_ref
    when p_rule_set_ref ~ '^[a-z][a-z0-9_]{2,119}$' then 'ruleset_syn_fi_' || p_rule_set_ref
    else null
  end;
$$;

revoke all on function institutionlens_api.project_rule_set_id(text)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.project_portfolio_id(p_portfolio_ref text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when p_portfolio_ref ~ '^portfolio_[a-z0-9_]{1,48}$' then p_portfolio_ref
    when p_portfolio_ref ~ '^[a-z][a-z0-9_]{2,119}$' then 'portfolio_' || p_portfolio_ref
    else null
  end;
$$;

revoke all on function institutionlens_api.project_portfolio_id(text)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.project_overlay_id(p_org_source_key text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when p_org_source_key ~ '^org_syn_fi_[0-9]{3}$'
      then 'overlay_syn_fi_' || substring(p_org_source_key from 12)
    else null
  end;
$$;

revoke all on function institutionlens_api.project_overlay_id(text)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.project_ledger_entry_id(p_rule_ref text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when p_rule_ref ~ '^[a-z][a-z0-9_]{2,119}$' then
      'ledger_' || left(
        case when p_rule_ref like 'rule_%' then substring(p_rule_ref from 6) else p_rule_ref end,
        48
      )
    else null
  end;
$$;

revoke all on function institutionlens_api.project_ledger_entry_id(text)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.project_rule_id(p_rule_ref text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when p_rule_ref ~ '^rule_[a-z0-9_]{1,48}$' then p_rule_ref
    else null
  end;
$$;

revoke all on function institutionlens_api.project_rule_id(text)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.build_fit_assessment(
  p_fit_status text,
  p_points_awarded integer,
  p_points_possible integer,
  p_observed_fit_band text
)
returns jsonb
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case p_fit_status
    when 'assessed' then jsonb_build_object(
      'status', 'assessed',
      'pointsAwarded', p_points_awarded,
      'pointsPossible', p_points_possible,
      'band', p_observed_fit_band
    )
    when 'unassessed' then jsonb_build_object('status', 'unassessed')
    when 'insufficient_evidence' then jsonb_build_object('status', 'insufficient_evidence')
    when 'invalid' then jsonb_build_object('status', 'invalid')
    when 'superseded' then jsonb_build_object('status', 'superseded')
    else null
  end;
$$;

revoke all on function institutionlens_api.build_fit_assessment(text, integer, integer, text)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.project_provenance(
  p_provenance institutionlens.provenance_records,
  p_tenant_public_ref text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select case
    when p_provenance.source_key !~ '^prov_[a-z0-9_]{1,48}$'
      or institutionlens_api.map_provenance_source_type(p_provenance.source_type) is null
      or institutionlens_api.map_provenance_access_classification(p_provenance.access_classification) is null
      or institutionlens_api.map_provenance_license_status(p_provenance.license_status) is null
      or institutionlens_api.map_data_classification(p_provenance.data_classification) is null
      then null
    else jsonb_strip_nulls(jsonb_build_object(
      'tenantPublicRef', p_tenant_public_ref,
      'id', p_provenance.source_key,
      'sourceType', institutionlens_api.map_provenance_source_type(p_provenance.source_type),
      'sourceName', p_provenance.source_name,
      'retrievedAt', institutionlens_api.as_utc_iso(p_provenance.retrieved_at),
      'publishedAt', institutionlens_api.as_utc_iso(p_provenance.published_at),
      'reportingPeriod', case
        when p_provenance.reporting_period_start is null and p_provenance.reporting_period_end is null then null
        else jsonb_strip_nulls(jsonb_build_object(
          'start', institutionlens_api.as_utc_iso(p_provenance.reporting_period_start),
          'end', institutionlens_api.as_utc_iso(p_provenance.reporting_period_end)
        ))
      end,
      'checksum', p_provenance.checksum,
      'licenseStatus', institutionlens_api.map_provenance_license_status(p_provenance.license_status),
      'accessClassification',
        institutionlens_api.map_provenance_access_classification(p_provenance.access_classification),
      'validationStatus', p_provenance.validation_status,
      'synthetic', p_provenance.synthetic,
      'dataClassification', institutionlens_api.map_data_classification(p_provenance.data_classification),
      'createdAt', institutionlens_api.as_utc_iso(p_provenance.created_at),
      'domainSchemaVersion', '1.0.0'
    ))
  end;
$$;

revoke all on function institutionlens_api.project_provenance(
  institutionlens.provenance_records,
  text
) from public, anon, authenticated, service_role;

create or replace function institutionlens_api.project_overlay(
  p_overlay institutionlens.organization_overlays,
  p_org_source_key text,
  p_tenant_public_ref text,
  p_tenant_domain_id text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select case
    when p_org_source_key is null
      or p_org_source_key !~ '^org_[a-z0-9_]{1,48}$'
      or institutionlens_api.project_overlay_id(p_org_source_key) is null
      or p_tenant_domain_id !~ '^tenant_[a-z0-9_]{1,48}$'
      then null
    else jsonb_build_object(
      'tenantPublicRef', p_tenant_public_ref,
      'id', institutionlens_api.project_overlay_id(p_org_source_key),
      'tenantId', p_tenant_domain_id,
      'organizationId', p_org_source_key,
      'schemaVersion', '1.0.0',
      'synthetic', (p_overlay.source_classification = 'synthetic_demo'),
      'relationshipStatus', p_overlay.relationship_status,
      'capabilityUsage', p_overlay.capability_usage,
      'matchStatus', p_overlay.match_status,
      'reviewStatus', p_overlay.review_status,
      'sourceClassification', p_overlay.source_classification,
      'effectiveAt', institutionlens_api.as_utc_iso(p_overlay.effective_at),
      'updatedAt', institutionlens_api.as_utc_iso(p_overlay.updated_at)
    )
  end;
$$;

revoke all on function institutionlens_api.project_overlay(
  institutionlens.organization_overlays,
  text,
  text,
  text
) from public, anon, authenticated, service_role;

create or replace function institutionlens_api.project_capability_assessment(
  p_run institutionlens.assessment_runs,
  p_cap institutionlens.capability_results,
  p_org institutionlens.organizations,
  p_tenant_public_ref text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select case
    when p_org.source_key is null
      or p_org.source_key !~ '^org_[a-z0-9_]{1,48}$'
      or institutionlens_api.synthesize_capability_assessment_id(p_org.source_key, p_cap.capability_ref) is null
      or institutionlens_api.project_capability_id(p_cap.capability_ref) is null
      or institutionlens_api.project_rule_set_id(p_cap.rule_set_ref) is null
      or institutionlens_api.project_portfolio_id(p_run.portfolio_ref) is null
      or institutionlens_api.build_fit_assessment(
        p_cap.fit_status,
        p_cap.points_awarded,
        p_cap.points_possible,
        p_cap.observed_fit_band
      ) is null
      then null
    else jsonb_build_object(
      'tenantPublicRef', p_tenant_public_ref,
      'id', institutionlens_api.synthesize_capability_assessment_id(p_org.source_key, p_cap.capability_ref),
      'tenantId', institutionlens_api.derive_tenant_domain_id(p_tenant_public_ref),
      'organizationId', p_org.source_key,
      'portfolioId', institutionlens_api.project_portfolio_id(p_run.portfolio_ref),
      'capabilityId', institutionlens_api.project_capability_id(p_cap.capability_ref),
      'verticalId', p_run.vertical_id,
      'ruleSetId', institutionlens_api.project_rule_set_id(p_cap.rule_set_ref),
      'ruleSetVersion', p_cap.rule_set_version,
      'schemaVersion', '1.0.0',
      'fit', institutionlens_api.build_fit_assessment(
        p_cap.fit_status,
        p_cap.points_awarded,
        p_cap.points_possible,
        p_cap.observed_fit_band
      ),
      'confidence', p_cap.confidence,
      'freshness', p_cap.freshness,
      'completeness', p_cap.completeness,
      'publicationEligibility', p_cap.publication_eligibility,
      'ledger', '[]'::jsonb,
      'assessedAt', institutionlens_api.as_utc_iso(p_cap.assessed_at),
      'engineVersion', p_run.engine_version,
      'synthetic', p_run.synthetic
    )
  end;
$$;

revoke all on function institutionlens_api.project_capability_assessment(
  institutionlens.assessment_runs,
  institutionlens.capability_results,
  institutionlens.organizations,
  text
) from public, anon, authenticated, service_role;

create or replace function institutionlens_api.project_portfolio_assessment(
  p_run institutionlens.assessment_runs,
  p_result institutionlens.assessment_results,
  p_org institutionlens.organizations,
  p_tenant_public_ref text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select case
    when p_org.source_key is null
      or p_org.source_key !~ '^org_[a-z0-9_]{1,48}$'
      or institutionlens_api.synthesize_portfolio_assessment_id(p_org.source_key) is null
      or institutionlens_api.project_portfolio_id(p_run.portfolio_ref) is null
      then null
    else jsonb_build_object(
      'tenantPublicRef', p_tenant_public_ref,
      'id', institutionlens_api.synthesize_portfolio_assessment_id(p_org.source_key),
      'tenantId', institutionlens_api.derive_tenant_domain_id(p_tenant_public_ref),
      'organizationId', p_org.source_key,
      'portfolioId', institutionlens_api.project_portfolio_id(p_run.portfolio_ref),
      'verticalId', p_run.vertical_id,
      'schemaVersion', '1.0.0',
      'status', p_result.fit_status,
      'portfolioPriorityScore', case
        when p_result.fit_status = 'assessed' then jsonb_build_object(
          'pointsAwarded', p_result.points_awarded,
          'pointsPossible', p_result.points_possible,
          'band', p_result.observed_fit_band
        )
        else null
      end,
      'bestObservedCapabilityFit', null,
      'capabilityAssessmentIds', coalesce((
        select jsonb_agg(
          institutionlens_api.synthesize_capability_assessment_id(p_org.source_key, cr.capability_ref)
          order by cr.capability_ref
        )
        from institutionlens.capability_results cr
        where cr.tenant_id = p_run.tenant_id
          and cr.assessment_run_id = p_run.id
          and cr.organization_id = p_org.id
          and institutionlens_api.synthesize_capability_assessment_id(p_org.source_key, cr.capability_ref)
            is not null
      ), '[]'::jsonb),
      'contributions', '[]'::jsonb,
      'coverage', p_result.coverage,
      'confidence', p_result.confidence,
      'freshness', p_result.freshness,
      'completeness', p_result.completeness,
      'publicationEligibility', p_result.publication_eligibility,
      'opportunityContexts', p_result.opportunity_contexts,
      'assessedAt', institutionlens_api.as_utc_iso(p_result.assessed_at),
      'engineVersion', p_run.engine_version,
      'aggregationPolicyVersion', '1.0.0',
      'synthetic', p_run.synthetic
    )
  end;
$$;

revoke all on function institutionlens_api.project_portfolio_assessment(
  institutionlens.assessment_runs,
  institutionlens.assessment_results,
  institutionlens.organizations,
  text
) from public, anon, authenticated, service_role;

create or replace function institutionlens_api.project_ledger_entry(
  p_rule institutionlens.rule_results,
  p_org_source_key text,
  p_capability_ref text,
  p_tenant_public_ref text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select case
    when p_org_source_key is null
      or p_org_source_key !~ '^org_[a-z0-9_]{1,48}$'
      or institutionlens_api.project_ledger_entry_id(p_rule.rule_ref) is null
      or institutionlens_api.project_rule_id(p_rule.rule_ref) is null
      or institutionlens_api.project_capability_id(p_capability_ref) is null
      then null
    else jsonb_strip_nulls(jsonb_build_object(
      'tenantPublicRef', p_tenant_public_ref,
      'id', institutionlens_api.project_ledger_entry_id(p_rule.rule_ref),
      'ruleId', institutionlens_api.project_rule_id(p_rule.rule_ref),
      'ruleSetVersion', p_rule.rule_set_version,
      'capabilityId', institutionlens_api.project_capability_id(p_capability_ref),
      'factorCategory', p_rule.factor_category,
      'outcome', p_rule.outcome,
      'pointsAwarded', p_rule.points_awarded,
      'maximumPoints', p_rule.maximum_points,
      'reason', p_rule.reason,
      'reasonCode', p_rule.reason_code,
      'evidenceIds', coalesce((
        select jsonb_agg(ev.source_key order by ev.source_key)
        from institutionlens.rule_result_evidence rre
        join institutionlens.evidence_records ev
          on ev.tenant_id = rre.tenant_id
         and ev.id = rre.evidence_id
         and ev.organization_id = rre.organization_id
        where rre.tenant_id = p_rule.tenant_id
          and rre.rule_result_id = p_rule.id
          and rre.organization_id = p_rule.organization_id
          and ev.source_key ~ '^ev_[a-z0-9_]{1,48}$'
      ), '[]'::jsonb),
      'provenanceSummaries', coalesce((
        select jsonb_agg(distinct summary.item order by summary.item)
        from (
          select jsonb_build_object(
            'validationStatus', prov.validation_status,
            'licenseStatus', institutionlens_api.map_provenance_license_status(prov.license_status),
            'accessClassification',
              institutionlens_api.map_provenance_access_classification(prov.access_classification)
          ) as item
          from institutionlens.rule_result_evidence rre
          join institutionlens.evidence_records ev
            on ev.tenant_id = rre.tenant_id
           and ev.id = rre.evidence_id
           and ev.organization_id = rre.organization_id
          join institutionlens.provenance_records prov
            on prov.tenant_id = ev.tenant_id
           and prov.id = ev.provenance_id
          where rre.tenant_id = p_rule.tenant_id
            and rre.rule_result_id = p_rule.id
            and rre.organization_id = p_rule.organization_id
            and institutionlens_api.map_provenance_license_status(prov.license_status) is not null
            and institutionlens_api.map_provenance_access_classification(prov.access_classification) is not null
        ) summary
        where summary.item is not null
      ), '[]'::jsonb),
      'epistemicStates', to_jsonb(p_rule.epistemic_states),
      'freshnessStates', to_jsonb(p_rule.freshness_states),
      'publicationEligibility', p_rule.publication_eligibility,
      'evaluatedAt', institutionlens_api.as_utc_iso(p_rule.evaluated_at),
      'engineVersion', p_rule.engine_version,
      'synthetic', p_rule.synthetic
    ))
  end;
$$;

revoke all on function institutionlens_api.project_ledger_entry(
  institutionlens.rule_results,
  text,
  text,
  text
) from public, anon, authenticated, service_role;

create or replace function institutionlens_api.workspace_get(p_tenant_public_ref text)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'tenantPublicRef', t.public_ref,
    'tenantId', institutionlens_api.derive_tenant_domain_id(t.public_ref),
    'principalId', institutionlens_api.derive_principal_domain_id(m.public_ref),
    'displayName', t.display_name,
    'status', institutionlens_api.map_tenant_workspace_status(t.status),
    'role', m.role,
    'allowedVerticalIds', coalesce((
      select jsonb_agg(tv.vertical_id order by tv.vertical_id)
      from institutionlens.tenant_verticals tv
      where tv.tenant_id = t.id
        and tv.status = 'active'
    ), '[]'::jsonb)
  ))
  from institutionlens.tenants t
  join institutionlens.memberships m
    on m.tenant_id = t.id
   and m.status = 'active'
   and m.id in (select institutionlens.own_membership_ids())
  where t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
    and institutionlens_api.derive_tenant_domain_id(t.public_ref) is not null
    and institutionlens_api.derive_principal_domain_id(m.public_ref) is not null
    and institutionlens_api.map_tenant_workspace_status(t.status) is not null
  limit 1;
$$;

create or replace function institutionlens_api.provenance_get_by_domain_id(
  p_tenant_public_ref text,
  p_domain_id text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select institutionlens_api.project_provenance(p, t.public_ref)
  from institutionlens.provenance_records p
  join institutionlens.tenants t on t.id = p.tenant_id
  where p.source_key = p_domain_id
    and p_domain_id ~ '^prov_[a-z0-9_]{1,48}$'
    and t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
  limit 1;
$$;

create or replace function institutionlens_api.capabilities_list(
  p_tenant_public_ref text,
  p_query jsonb
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
declare
  v_page integer := greatest(1, least(coalesce((p_query ->> 'page')::integer, 1), 10000));
  v_page_size integer := greatest(1, least(coalesce((p_query ->> 'pageSize')::integer, 12), 50));
begin
  if p_tenant_public_ref is null
    or p_tenant_public_ref !~ '^tref_[a-f0-9]{20,32}$'
    or not exists (
      select 1
      from institutionlens.tenants t
      where t.public_ref = p_tenant_public_ref
        and t.id in (select institutionlens.accessible_tenant_ids())
    )
  then
    return jsonb_build_object('items', '[]'::jsonb, 'page', v_page, 'pageSize', v_page_size, 'total', 0);
  end if;

  return jsonb_build_object('items', '[]'::jsonb, 'page', v_page, 'pageSize', v_page_size, 'total', 0);
end;
$$;

create or replace function institutionlens_api.assessments_list_portfolios(
  p_tenant_public_ref text,
  p_query jsonb
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
declare
  v_page integer := greatest(1, least(coalesce((p_query ->> 'page')::integer, 1), 10000));
  v_page_size integer := greatest(1, least(coalesce((p_query ->> 'pageSize')::integer, 12), 50));
  v_organization_id text := nullif(p_query ->> 'organizationId', '');
  v_total integer;
  v_items jsonb;
begin
  select count(*)::integer
  into v_total
  from institutionlens.assessment_results ar
  join institutionlens.assessment_runs run
    on run.tenant_id = ar.tenant_id and run.id = ar.assessment_run_id
  join institutionlens.organizations o
    on o.tenant_id = ar.tenant_id and o.id = ar.organization_id
  join institutionlens.tenants t on t.id = ar.tenant_id
  where t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
    and o.source_key ~ '^org_[a-z0-9_]{1,48}$'
    and (v_organization_id is null or o.source_key = v_organization_id);

  select coalesce(jsonb_agg(projected.item order by projected.sort_id), '[]'::jsonb)
  into v_items
  from (
    select
      institutionlens_api.project_portfolio_assessment(run, ar, o, t.public_ref) as item,
      institutionlens_api.synthesize_portfolio_assessment_id(o.source_key) as sort_id
    from institutionlens.assessment_results ar
    join institutionlens.assessment_runs run
      on run.tenant_id = ar.tenant_id and run.id = ar.assessment_run_id
    join institutionlens.organizations o
      on o.tenant_id = ar.tenant_id and o.id = ar.organization_id
    join institutionlens.tenants t on t.id = ar.tenant_id
    where t.public_ref = p_tenant_public_ref
      and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
      and t.id in (select institutionlens.accessible_tenant_ids())
      and o.source_key ~ '^org_[a-z0-9_]{1,48}$'
      and (v_organization_id is null or o.source_key = v_organization_id)
    order by sort_id
    offset (v_page - 1) * v_page_size
    limit v_page_size
  ) projected
  where projected.item is not null;

  return jsonb_build_object(
    'items', coalesce(v_items, '[]'::jsonb),
    'page', v_page,
    'pageSize', v_page_size,
    'total', v_total
  );
end;
$$;

create or replace function institutionlens_api.assessments_get_portfolio_by_domain_id(
  p_tenant_public_ref text,
  p_domain_id text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select institutionlens_api.project_portfolio_assessment(run, ar, o, t.public_ref)
  from institutionlens.assessment_results ar
  join institutionlens.assessment_runs run
    on run.tenant_id = ar.tenant_id and run.id = ar.assessment_run_id
  join institutionlens.organizations o
    on o.tenant_id = ar.tenant_id and o.id = ar.organization_id
  join institutionlens.tenants t on t.id = ar.tenant_id
  where institutionlens_api.synthesize_portfolio_assessment_id(o.source_key) = p_domain_id
    and p_domain_id ~ '^assess_[a-z0-9_]{1,48}$'
    and t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
  limit 1;
$$;

create or replace function institutionlens_api.assessments_list_capabilities(
  p_tenant_public_ref text,
  p_query jsonb
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
declare
  v_page integer := greatest(1, least(coalesce((p_query ->> 'page')::integer, 1), 10000));
  v_page_size integer := greatest(1, least(coalesce((p_query ->> 'pageSize')::integer, 12), 50));
  v_organization_id text := nullif(p_query ->> 'organizationId', '');
  v_capability_id text := nullif(p_query ->> 'capabilityId', '');
  v_total integer;
  v_items jsonb;
begin
  select count(*)::integer
  into v_total
  from institutionlens.capability_results cr
  join institutionlens.assessment_runs run
    on run.tenant_id = cr.tenant_id and run.id = cr.assessment_run_id
  join institutionlens.organizations o
    on o.tenant_id = cr.tenant_id and o.id = cr.organization_id
  join institutionlens.tenants t on t.id = cr.tenant_id
  where t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
    and o.source_key ~ '^org_[a-z0-9_]{1,48}$'
    and (v_organization_id is null or o.source_key = v_organization_id)
    and (
      v_capability_id is null
      or institutionlens_api.project_capability_id(cr.capability_ref) = v_capability_id
    );

  select coalesce(jsonb_agg(projected.item order by projected.sort_id), '[]'::jsonb)
  into v_items
  from (
    select
      institutionlens_api.project_capability_assessment(run, cr, o, t.public_ref) as item,
      institutionlens_api.synthesize_capability_assessment_id(o.source_key, cr.capability_ref) as sort_id
    from institutionlens.capability_results cr
    join institutionlens.assessment_runs run
      on run.tenant_id = cr.tenant_id and run.id = cr.assessment_run_id
    join institutionlens.organizations o
      on o.tenant_id = cr.tenant_id and o.id = cr.organization_id
    join institutionlens.tenants t on t.id = cr.tenant_id
    where t.public_ref = p_tenant_public_ref
      and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
      and t.id in (select institutionlens.accessible_tenant_ids())
      and o.source_key ~ '^org_[a-z0-9_]{1,48}$'
      and (v_organization_id is null or o.source_key = v_organization_id)
      and (
        v_capability_id is null
        or institutionlens_api.project_capability_id(cr.capability_ref) = v_capability_id
      )
    order by sort_id
    offset (v_page - 1) * v_page_size
    limit v_page_size
  ) projected
  where projected.item is not null;

  return jsonb_build_object(
    'items', coalesce(v_items, '[]'::jsonb),
    'page', v_page,
    'pageSize', v_page_size,
    'total', v_total
  );
end;
$$;

create or replace function institutionlens_api.assessments_get_capability_by_domain_id(
  p_tenant_public_ref text,
  p_domain_id text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select institutionlens_api.project_capability_assessment(run, cr, o, t.public_ref)
  from institutionlens.capability_results cr
  join institutionlens.assessment_runs run
    on run.tenant_id = cr.tenant_id and run.id = cr.assessment_run_id
  join institutionlens.organizations o
    on o.tenant_id = cr.tenant_id and o.id = cr.organization_id
  join institutionlens.tenants t on t.id = cr.tenant_id
  where institutionlens_api.synthesize_capability_assessment_id(o.source_key, cr.capability_ref) = p_domain_id
    and p_domain_id ~ '^assess_[a-z0-9_]{1,48}$'
    and t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
  limit 1;
$$;

create or replace function institutionlens_api.assessments_get_ledger(
  p_tenant_public_ref text,
  p_domain_id text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select coalesce(jsonb_agg(projected.item order by projected.sort_id), '[]'::jsonb)
  from (
    select
      institutionlens_api.project_ledger_entry(rr, o.source_key, cr.capability_ref, t.public_ref) as item,
      institutionlens_api.project_ledger_entry_id(rr.rule_ref) as sort_id
    from institutionlens.capability_results cr
    join institutionlens.assessment_runs run
      on run.tenant_id = cr.tenant_id and run.id = cr.assessment_run_id
    join institutionlens.organizations o
      on o.tenant_id = cr.tenant_id and o.id = cr.organization_id
    join institutionlens.tenants t on t.id = cr.tenant_id
    join institutionlens.rule_results rr
      on rr.tenant_id = cr.tenant_id
     and rr.capability_result_id = cr.id
     and rr.assessment_run_id = cr.assessment_run_id
     and rr.organization_id = cr.organization_id
    where institutionlens_api.synthesize_capability_assessment_id(o.source_key, cr.capability_ref) = p_domain_id
      and p_domain_id ~ '^assess_[a-z0-9_]{1,48}$'
      and t.public_ref = p_tenant_public_ref
      and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
      and t.id in (select institutionlens.accessible_tenant_ids())
  ) projected
  where projected.item is not null;
$$;

create or replace function institutionlens_api.assessments_get_manifest(
  p_tenant_public_ref text,
  p_domain_id text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select run.manifest
  from institutionlens.assessment_runs run
  join institutionlens.organizations o
    on o.tenant_id = run.tenant_id and o.id = run.organization_id
  join institutionlens.tenants t on t.id = run.tenant_id
  left join institutionlens.capability_results cr
    on cr.tenant_id = run.tenant_id
   and cr.assessment_run_id = run.id
   and cr.organization_id = run.organization_id
  where t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
    and p_domain_id ~ '^assess_[a-z0-9_]{1,48}$'
    and (
      institutionlens_api.synthesize_portfolio_assessment_id(o.source_key) = p_domain_id
      or institutionlens_api.synthesize_capability_assessment_id(o.source_key, cr.capability_ref) = p_domain_id
    )
  limit 1;
$$;

create or replace function institutionlens_api.assessments_get_opportunity_context(
  p_tenant_public_ref text,
  p_organization_domain_id text,
  p_capability_domain_id text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select ctx.item
  from institutionlens.assessment_results ar
  join institutionlens.assessment_runs run
    on run.tenant_id = ar.tenant_id and run.id = ar.assessment_run_id
  join institutionlens.organizations o
    on o.tenant_id = ar.tenant_id and o.id = ar.organization_id
  join institutionlens.tenants t on t.id = ar.tenant_id
  cross join lateral (
    select elem as item
    from jsonb_array_elements(ar.opportunity_contexts) elem
    where elem ->> 'capabilityId' = p_capability_domain_id
    limit 1
  ) ctx
  where o.source_key = p_organization_domain_id
    and p_organization_domain_id ~ '^org_[a-z0-9_]{1,48}$'
    and p_capability_domain_id ~ '^cap_[a-z0-9_]{1,48}$'
    and t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
  limit 1;
$$;

create or replace function institutionlens_api.portfolios_list(
  p_tenant_public_ref text,
  p_query jsonb
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
declare
  v_page integer := greatest(1, least(coalesce((p_query ->> 'page')::integer, 1), 10000));
  v_page_size integer := greatest(1, least(coalesce((p_query ->> 'pageSize')::integer, 12), 50));
begin
  if p_tenant_public_ref is null
    or p_tenant_public_ref !~ '^tref_[a-f0-9]{20,32}$'
    or not exists (
      select 1
      from institutionlens.tenants t
      where t.public_ref = p_tenant_public_ref
        and t.id in (select institutionlens.accessible_tenant_ids())
    )
  then
    return jsonb_build_object('items', '[]'::jsonb, 'page', v_page, 'pageSize', v_page_size, 'total', 0);
  end if;

  return jsonb_build_object('items', '[]'::jsonb, 'page', v_page, 'pageSize', v_page_size, 'total', 0);
end;
$$;

create or replace function institutionlens_api.portfolios_get_by_domain_id(
  p_tenant_public_ref text,
  p_domain_id text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select null::jsonb
  where p_domain_id ~ '^portfolio_[a-z0-9_]{1,48}$'
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and exists (
      select 1
      from institutionlens.tenants t
      where t.public_ref = p_tenant_public_ref
        and t.id in (select institutionlens.accessible_tenant_ids())
    )
  limit 1;
$$;

create or replace function institutionlens_api.overlays_get_by_organization_domain_id(
  p_tenant_public_ref text,
  p_domain_id text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select institutionlens_api.project_overlay(
    ov,
    o.source_key,
    t.public_ref,
    institutionlens_api.derive_tenant_domain_id(t.public_ref)
  )
  from institutionlens.organization_overlays ov
  join institutionlens.organizations o
    on o.tenant_id = ov.tenant_id and o.id = ov.organization_id
  join institutionlens.tenants t on t.id = ov.tenant_id
  where o.source_key = p_domain_id
    and p_domain_id ~ '^org_[a-z0-9_]{1,48}$'
    and t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
  limit 1;
$$;

create or replace function institutionlens_api.overlays_list(
  p_tenant_public_ref text,
  p_query jsonb
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
declare
  v_page integer := greatest(1, least(coalesce((p_query ->> 'page')::integer, 1), 10000));
  v_page_size integer := greatest(1, least(coalesce((p_query ->> 'pageSize')::integer, 12), 50));
  v_organization_id text := nullif(p_query ->> 'organizationId', '');
  v_total integer;
  v_items jsonb;
begin
  select count(*)::integer
  into v_total
  from institutionlens.organization_overlays ov
  join institutionlens.organizations o
    on o.tenant_id = ov.tenant_id and o.id = ov.organization_id
  join institutionlens.tenants t on t.id = ov.tenant_id
  where t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
    and o.source_key ~ '^org_[a-z0-9_]{1,48}$'
    and (v_organization_id is null or o.source_key = v_organization_id);

  select coalesce(jsonb_agg(projected.item order by projected.sort_id), '[]'::jsonb)
  into v_items
  from (
    select
      institutionlens_api.project_overlay(
        ov,
        o.source_key,
        t.public_ref,
        institutionlens_api.derive_tenant_domain_id(t.public_ref)
      ) as item,
      institutionlens_api.project_overlay_id(o.source_key) as sort_id
    from institutionlens.organization_overlays ov
    join institutionlens.organizations o
      on o.tenant_id = ov.tenant_id and o.id = ov.organization_id
    join institutionlens.tenants t on t.id = ov.tenant_id
    where t.public_ref = p_tenant_public_ref
      and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
      and t.id in (select institutionlens.accessible_tenant_ids())
      and o.source_key ~ '^org_[a-z0-9_]{1,48}$'
      and (v_organization_id is null or o.source_key = v_organization_id)
    order by sort_id
    offset (v_page - 1) * v_page_size
    limit v_page_size
  ) projected
  where projected.item is not null;

  return jsonb_build_object(
    'items', coalesce(v_items, '[]'::jsonb),
    'page', v_page,
    'pageSize', v_page_size,
    'total', v_total
  );
end;
$$;

create or replace function institutionlens_api.overlays_get_by_domain_id(
  p_tenant_public_ref text,
  p_domain_id text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select institutionlens_api.project_overlay(
    ov,
    o.source_key,
    t.public_ref,
    institutionlens_api.derive_tenant_domain_id(t.public_ref)
  )
  from institutionlens.organization_overlays ov
  join institutionlens.organizations o
    on o.tenant_id = ov.tenant_id and o.id = ov.organization_id
  join institutionlens.tenants t on t.id = ov.tenant_id
  where institutionlens_api.project_overlay_id(o.source_key) = p_domain_id
    and p_domain_id ~ '^overlay_[a-z0-9_]{1,48}$'
    and t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
  limit 1;
$$;

-- Sole accessible tenant public ref for the authenticated principal (no client tenant input).
create or replace function institutionlens_api.session_tenant_public_ref()
returns text
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select t.public_ref
  from institutionlens.tenants t
  where t.id in (select institutionlens.accessible_tenant_ids())
    and t.public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.status = 'active'
  order by t.public_ref
  limit 1;
$$;

revoke all on function institutionlens_api.session_tenant_public_ref()
  from public, anon, authenticated, service_role;
grant execute on function institutionlens_api.session_tenant_public_ref() to authenticated;

revoke all on function institutionlens_api.workspace_get(text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.provenance_get_by_domain_id(text, text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.capabilities_list(text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.assessments_list_portfolios(text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.assessments_get_portfolio_by_domain_id(text, text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.assessments_list_capabilities(text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.assessments_get_capability_by_domain_id(text, text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.assessments_get_ledger(text, text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.assessments_get_manifest(text, text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.assessments_get_opportunity_context(text, text, text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.portfolios_list(text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.portfolios_get_by_domain_id(text, text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.overlays_get_by_organization_domain_id(text, text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.overlays_list(text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.overlays_get_by_domain_id(text, text)
  from public, anon, authenticated, service_role;

grant execute on function institutionlens_api.workspace_get(text) to authenticated;
grant execute on function institutionlens_api.provenance_get_by_domain_id(text, text) to authenticated;
grant execute on function institutionlens_api.capabilities_list(text, jsonb) to authenticated;
grant execute on function institutionlens_api.assessments_list_portfolios(text, jsonb) to authenticated;
grant execute on function institutionlens_api.assessments_get_portfolio_by_domain_id(text, text) to authenticated;
grant execute on function institutionlens_api.assessments_list_capabilities(text, jsonb) to authenticated;
grant execute on function institutionlens_api.assessments_get_capability_by_domain_id(text, text) to authenticated;
grant execute on function institutionlens_api.assessments_get_ledger(text, text) to authenticated;
grant execute on function institutionlens_api.assessments_get_manifest(text, text) to authenticated;
grant execute on function institutionlens_api.assessments_get_opportunity_context(text, text, text) to authenticated;
grant execute on function institutionlens_api.portfolios_list(text, jsonb) to authenticated;
grant execute on function institutionlens_api.portfolios_get_by_domain_id(text, text) to authenticated;
grant execute on function institutionlens_api.overlays_get_by_organization_domain_id(text, text) to authenticated;
grant execute on function institutionlens_api.overlays_list(text, jsonb) to authenticated;
grant execute on function institutionlens_api.overlays_get_by_domain_id(text, text) to authenticated;

commit;
