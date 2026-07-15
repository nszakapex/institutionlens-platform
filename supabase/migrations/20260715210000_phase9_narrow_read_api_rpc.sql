-- Phase 9 Batch 4: narrow authenticated read API/RPC surface.
-- Separate schema so core institutionlens table grants are never the app transport.
-- All functions are SECURITY INVOKER (RLS applies), parameterized, read-only, and
-- authenticated-EXECUTE only. No dynamic SQL, no writes, no PUBLIC/anon/service_role
-- EXECUTE, and no SECURITY DEFINER bypass of RLS.
-- Every public RPC requires p_tenant_public_ref from the server session binding and
-- verifies it against accessible_tenant_ids() so multi-membership callers cannot mix
-- tenants and client-supplied domain IDs alone cannot select a tenant.
begin;

create schema if not exists institutionlens_api;

comment on schema institutionlens_api is
  'InstitutionLens narrow authenticated read RPCs. Opaque projections only; not a Data API table surface.';

revoke all on schema institutionlens_api from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema institutionlens_api
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema institutionlens_api
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema institutionlens_api
  revoke execute on functions from public, anon, authenticated, service_role;

grant usage on schema institutionlens_api to authenticated;

create or replace function institutionlens_api.as_utc_iso(p_value timestamptz)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when p_value is null then null
    else to_char(p_value at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  end;
$$;

revoke all on function institutionlens_api.as_utc_iso(timestamptz)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.map_data_classification(p_value text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case p_value
    when 'synthetic' then 'synthetic'
    when 'public_source' then 'public'
    when 'tenant_private' then 'internal'
    when 'restricted' then 'restricted'
    else null
  end;
$$;

revoke all on function institutionlens_api.map_data_classification(text)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.map_lifecycle_status(p_value text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case p_value
    when 'active' then 'active'
    when 'inactive' then 'inactive'
    when 'merged' then 'archived'
    when 'closed' then 'archived'
    when 'unknown' then 'inactive'
    else null
  end;
$$;

revoke all on function institutionlens_api.map_lifecycle_status(text)
  from public, anon, authenticated, service_role;

create or replace function institutionlens_api.project_organization(
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
      or institutionlens_api.map_lifecycle_status(p_org.lifecycle_status) is null
      or institutionlens_api.map_data_classification(p_org.data_classification) is null
      then null
    else jsonb_build_object(
      'tenantPublicRef', p_tenant_public_ref,
      'id', p_org.source_key,
      'publicRef', p_org.public_ref,
      'verticalId', p_org.vertical_id,
      'adapterVersion', p_org.adapter_version,
      'displayName', p_org.display_name,
      'legalName', p_org.legal_name,
      'organizationType', p_org.organization_type,
      'lifecycleStatus', institutionlens_api.map_lifecycle_status(p_org.lifecycle_status),
      'primaryLocation', p_org.primary_location,
      'summary', p_org.summary,
      'tags', to_jsonb(p_org.tags),
      'externalReferences', p_org.external_references,
      'createdAt', institutionlens_api.as_utc_iso(p_org.created_at),
      'updatedAt', institutionlens_api.as_utc_iso(p_org.updated_at),
      'synthetic', p_org.synthetic,
      'dataClassification', institutionlens_api.map_data_classification(p_org.data_classification),
      'fit', jsonb_build_object('status', 'unassessed'),
      'domainSchemaVersion', p_org.domain_schema_version,
      'verticalPayload', p_org.vertical_payload
    )
  end;
$$;

revoke all on function institutionlens_api.project_organization(
  institutionlens.organizations,
  text
) from public, anon, authenticated, service_role;

create or replace function institutionlens_api.organizations_get_by_public_ref(
  p_tenant_public_ref text,
  p_public_ref text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select institutionlens_api.project_organization(o, t.public_ref)
  from institutionlens.organizations o
  join institutionlens.tenants t on t.id = o.tenant_id
  where o.public_ref = p_public_ref
    and p_public_ref ~ '^oref_[a-f0-9]{16,32}$'
    and t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
  limit 1;
$$;

create or replace function institutionlens_api.organizations_get_by_domain_id(
  p_tenant_public_ref text,
  p_domain_id text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select institutionlens_api.project_organization(o, t.public_ref)
  from institutionlens.organizations o
  join institutionlens.tenants t on t.id = o.tenant_id
  where o.source_key = p_domain_id
    and p_domain_id ~ '^org_[a-z0-9_]{1,48}$'
    and t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
  limit 1;
$$;

create or replace function institutionlens_api.organizations_list(
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
  v_sort_field text := coalesce(p_query ->> 'sortField', 'displayName');
  v_sort_direction text := lower(coalesce(p_query ->> 'sortDirection', 'asc'));
  v_text text := nullif(btrim(coalesce(p_query ->> 'text', '')), '');
  v_organization_type text := nullif(p_query ->> 'organizationType', '');
  v_vertical_id text := nullif(p_query ->> 'verticalId', '');
  v_lifecycle text := nullif(p_query ->> 'lifecycleStatus', '');
  v_synthetic boolean := case
    when jsonb_typeof(p_query -> 'synthetic') = 'boolean' then (p_query ->> 'synthetic')::boolean
    else null
  end;
  v_total integer;
  v_items jsonb;
begin
  if v_sort_field not in ('displayName', 'updatedAt', 'organizationType', 'lifecycleStatus') then
    v_sort_field := 'displayName';
  end if;
  if v_sort_direction not in ('asc', 'desc') then
    v_sort_direction := 'asc';
  end if;

  select count(*)::integer
  into v_total
  from institutionlens.organizations o
  join institutionlens.tenants t on t.id = o.tenant_id
  where t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
    and (v_text is null or o.display_name ilike '%' || v_text || '%' or o.summary ilike '%' || v_text || '%')
    and (v_organization_type is null or o.organization_type = v_organization_type)
    and (v_vertical_id is null or o.vertical_id = v_vertical_id)
    and (
      v_lifecycle is null
      or institutionlens_api.map_lifecycle_status(o.lifecycle_status) = v_lifecycle
    )
    and (v_synthetic is null or o.synthetic = v_synthetic)
    and o.source_key ~ '^org_[a-z0-9_]{1,48}$';

  select coalesce(jsonb_agg(projected.item), '[]'::jsonb)
  into v_items
  from (
    select institutionlens_api.project_organization(o, t.public_ref) as item
    from institutionlens.organizations o
    join institutionlens.tenants t on t.id = o.tenant_id
    where t.public_ref = p_tenant_public_ref
      and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
      and t.id in (select institutionlens.accessible_tenant_ids())
      and (v_text is null or o.display_name ilike '%' || v_text || '%' or o.summary ilike '%' || v_text || '%')
      and (v_organization_type is null or o.organization_type = v_organization_type)
      and (v_vertical_id is null or o.vertical_id = v_vertical_id)
      and (
        v_lifecycle is null
        or institutionlens_api.map_lifecycle_status(o.lifecycle_status) = v_lifecycle
      )
      and (v_synthetic is null or o.synthetic = v_synthetic)
      and o.source_key ~ '^org_[a-z0-9_]{1,48}$'
    order by
      case
        when v_sort_direction = 'asc' and v_sort_field = 'displayName' then o.display_name
      end asc nulls last,
      case
        when v_sort_direction = 'desc' and v_sort_field = 'displayName' then o.display_name
      end desc nulls last,
      case
        when v_sort_direction = 'asc' and v_sort_field = 'organizationType' then o.organization_type
      end asc nulls last,
      case
        when v_sort_direction = 'desc' and v_sort_field = 'organizationType' then o.organization_type
      end desc nulls last,
      case
        when v_sort_direction = 'asc' and v_sort_field = 'lifecycleStatus'
          then institutionlens_api.map_lifecycle_status(o.lifecycle_status)
      end asc nulls last,
      case
        when v_sort_direction = 'desc' and v_sort_field = 'lifecycleStatus'
          then institutionlens_api.map_lifecycle_status(o.lifecycle_status)
      end desc nulls last,
      case
        when v_sort_direction = 'asc' and v_sort_field = 'updatedAt' then o.updated_at
      end asc nulls last,
      case
        when v_sort_direction = 'desc' and v_sort_field = 'updatedAt' then o.updated_at
      end desc nulls last,
      o.source_key asc
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

create or replace function institutionlens_api.organizations_count(
  p_tenant_public_ref text,
  p_query jsonb
)
returns integer
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select (institutionlens_api.organizations_list(p_tenant_public_ref, p_query) ->> 'total')::integer;
$$;

create or replace function institutionlens_api.project_evidence(
  p_evidence institutionlens.evidence_records,
  p_org_source_key text,
  p_provenance_source_key text,
  p_tenant_public_ref text,
  p_input_source_keys text[]
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
      or p_evidence.source_key !~ '^ev_[a-z0-9_]{1,48}$'
      or institutionlens_api.map_data_classification(p_evidence.data_classification) is null
      then null
    else jsonb_strip_nulls(jsonb_build_object(
      'tenantPublicRef', p_tenant_public_ref,
      'id', p_evidence.source_key,
      'organizationId', p_org_source_key,
      'verticalId', p_evidence.vertical_id,
      'adapterVersion', p_evidence.adapter_version,
      'evidenceType', p_evidence.evidence_type,
      'epistemicStatus', p_evidence.epistemic_status,
      'title', p_evidence.title,
      'summary', p_evidence.summary,
      'observation', p_evidence.observation,
      'observedAt', institutionlens_api.as_utc_iso(p_evidence.observed_at),
      'effectivePeriod', case
        when p_evidence.effective_period_start is null and p_evidence.effective_period_end is null then null
        else jsonb_strip_nulls(jsonb_build_object(
          'start', institutionlens_api.as_utc_iso(p_evidence.effective_period_start),
          'end', institutionlens_api.as_utc_iso(p_evidence.effective_period_end)
        ))
      end,
      'freshness', p_evidence.freshness,
      'confidence', p_evidence.confidence,
      'provenanceId', case
        when p_provenance_source_key ~ '^prov_[a-z0-9_]{1,48}$' then p_provenance_source_key
        else null
      end,
      'publicationEligibility', p_evidence.publication_eligibility,
      'synthetic', p_evidence.synthetic,
      'dataClassification', institutionlens_api.map_data_classification(p_evidence.data_classification),
      'calculatedFromEvidenceIds', to_jsonb(coalesce(p_input_source_keys, '{}'::text[])),
      'calculationDescriptor', p_evidence.calculation_descriptor,
      'ruleSetRef', p_evidence.rule_set_ref,
      'stalenessReason', p_evidence.staleness_reason,
      'createdAt', institutionlens_api.as_utc_iso(p_evidence.created_at),
      'updatedAt', institutionlens_api.as_utc_iso(p_evidence.updated_at),
      'domainSchemaVersion', p_evidence.domain_schema_version
    ))
  end;
$$;

revoke all on function institutionlens_api.project_evidence(
  institutionlens.evidence_records,
  text,
  text,
  text,
  text[]
) from public, anon, authenticated, service_role;

create or replace function institutionlens_api.evidence_list_by_organization_domain_id(
  p_tenant_public_ref text,
  p_domain_id text,
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
  v_freshness text := nullif(p_query ->> 'freshness', '');
  v_total integer;
  v_items jsonb;
begin
  if p_domain_id is null or p_domain_id !~ '^org_[a-z0-9_]{1,48}$' then
    return jsonb_build_object('items', '[]'::jsonb, 'page', v_page, 'pageSize', v_page_size, 'total', 0);
  end if;

  select count(*)::integer
  into v_total
  from institutionlens.evidence_records e
  join institutionlens.organizations o
    on o.tenant_id = e.tenant_id and o.id = e.organization_id
  join institutionlens.tenants t on t.id = e.tenant_id
  where o.source_key = p_domain_id
    and e.source_key ~ '^ev_[a-z0-9_]{1,48}$'
    and t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
    and (v_freshness is null or e.freshness = v_freshness);

  select coalesce(jsonb_agg(projected.item order by projected.id), '[]'::jsonb)
  into v_items
  from (
    select
      institutionlens_api.project_evidence(
        e,
        o.source_key,
        p.source_key,
        t.public_ref,
        coalesce((
          select array_agg(input_ev.source_key order by input_ev.source_key)
          from institutionlens.evidence_dependencies d
          join institutionlens.evidence_records input_ev
            on input_ev.tenant_id = d.tenant_id
           and input_ev.id = d.input_evidence_id
          where d.tenant_id = e.tenant_id
            and d.evidence_id = e.id
            and input_ev.source_key ~ '^ev_[a-z0-9_]{1,48}$'
        ), '{}'::text[])
      ) as item,
      e.source_key as id
    from institutionlens.evidence_records e
    join institutionlens.organizations o
      on o.tenant_id = e.tenant_id and o.id = e.organization_id
    join institutionlens.tenants t on t.id = e.tenant_id
    left join institutionlens.provenance_records p
      on p.tenant_id = e.tenant_id and p.id = e.provenance_id
    where o.source_key = p_domain_id
      and e.source_key ~ '^ev_[a-z0-9_]{1,48}$'
      and t.public_ref = p_tenant_public_ref
      and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
      and t.id in (select institutionlens.accessible_tenant_ids())
      and (v_freshness is null or e.freshness = v_freshness)
    order by e.source_key
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

create or replace function institutionlens_api.project_comparison(
  p_comparison institutionlens.saved_comparisons,
  p_tenant_public_ref text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select jsonb_build_object(
    'tenantPublicRef', p_tenant_public_ref,
    'publicRef', p_comparison.public_ref,
    'name', p_comparison.name,
    'status', p_comparison.status,
    'organizationRefs', coalesce((
      select jsonb_agg(o.public_ref order by sco.position)
      from institutionlens.saved_comparison_organizations sco
      join institutionlens.organizations o
        on o.tenant_id = sco.tenant_id and o.id = sco.organization_id
      where sco.tenant_id = p_comparison.tenant_id
        and sco.saved_comparison_id = p_comparison.id
    ), '[]'::jsonb),
    'createdAt', institutionlens_api.as_utc_iso(p_comparison.created_at),
    'updatedAt', institutionlens_api.as_utc_iso(p_comparison.updated_at)
  );
$$;

revoke all on function institutionlens_api.project_comparison(
  institutionlens.saved_comparisons,
  text
) from public, anon, authenticated, service_role;

create or replace function institutionlens_api.comparisons_get_by_public_ref(
  p_tenant_public_ref text,
  p_public_ref text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select institutionlens_api.project_comparison(c, t.public_ref)
  from institutionlens.saved_comparisons c
  join institutionlens.tenants t on t.id = c.tenant_id
  where c.public_ref = p_public_ref
    and p_public_ref ~ '^cref_[a-f0-9]{20,32}$'
    and t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
  limit 1;
$$;

create or replace function institutionlens_api.comparisons_list(
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
  v_status text := nullif(p_query ->> 'status', '');
  v_sort_field text := coalesce(p_query ->> 'sortField', 'updatedAt');
  v_sort_direction text := lower(coalesce(p_query ->> 'sortDirection', 'desc'));
  v_total integer;
  v_items jsonb;
begin
  if v_sort_field not in ('name', 'updatedAt') then
    v_sort_field := 'updatedAt';
  end if;
  if v_sort_direction not in ('asc', 'desc') then
    v_sort_direction := 'desc';
  end if;

  select count(*)::integer
  into v_total
  from institutionlens.saved_comparisons c
  join institutionlens.tenants t on t.id = c.tenant_id
  where t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
    and (v_status is null or c.status = v_status);

  select coalesce(jsonb_agg(projected.item order by projected.sort_key, projected.public_ref), '[]'::jsonb)
  into v_items
  from (
    select
      institutionlens_api.project_comparison(c, t.public_ref) as item,
      c.public_ref,
      case v_sort_field
        when 'name' then c.name
        else institutionlens_api.as_utc_iso(c.updated_at)
      end as sort_key
    from institutionlens.saved_comparisons c
    join institutionlens.tenants t on t.id = c.tenant_id
    where t.public_ref = p_tenant_public_ref
      and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
      and t.id in (select institutionlens.accessible_tenant_ids())
      and (v_status is null or c.status = v_status)
    order by
      case when v_sort_direction = 'asc' then
        case v_sort_field
          when 'name' then c.name
          else institutionlens_api.as_utc_iso(c.updated_at)
        end
      end asc nulls last,
      case when v_sort_direction = 'desc' then
        case v_sort_field
          when 'name' then c.name
          else institutionlens_api.as_utc_iso(c.updated_at)
        end
      end desc nulls last,
      c.public_ref
    offset (v_page - 1) * v_page_size
    limit v_page_size
  ) projected;

  return jsonb_build_object(
    'items', coalesce(v_items, '[]'::jsonb),
    'page', v_page,
    'pageSize', v_page_size,
    'total', v_total
  );
end;
$$;

create or replace function institutionlens_api.project_brief_snapshot(
  p_brief institutionlens.brief_snapshots,
  p_organization_ref text,
  p_tenant_public_ref text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select case
    when p_organization_ref is null or p_organization_ref !~ '^oref_[a-f0-9]{16,32}$' then null
    else jsonb_build_object(
      'tenantPublicRef', p_tenant_public_ref,
      'publicRef', p_brief.public_ref,
      'organizationRef', p_organization_ref,
      'state', p_brief.state,
      'templateVersion', p_brief.template_version,
      'publicationEligibility', p_brief.publication_eligibility,
      'contentFingerprint', p_brief.content_fingerprint,
      'content', p_brief.content,
      'createdAt', institutionlens_api.as_utc_iso(p_brief.created_at),
      'updatedAt', institutionlens_api.as_utc_iso(p_brief.updated_at)
    )
  end;
$$;

revoke all on function institutionlens_api.project_brief_snapshot(
  institutionlens.brief_snapshots,
  text,
  text
) from public, anon, authenticated, service_role;

create or replace function institutionlens_api.brief_snapshots_get_by_public_ref(
  p_tenant_public_ref text,
  p_public_ref text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens_api, institutionlens, pg_catalog
as $$
  select institutionlens_api.project_brief_snapshot(b, o.public_ref, t.public_ref)
  from institutionlens.brief_snapshots b
  join institutionlens.organizations o
    on o.tenant_id = b.tenant_id and o.id = b.organization_id
  join institutionlens.tenants t on t.id = b.tenant_id
  where b.public_ref = p_public_ref
    and p_public_ref ~ '^bsref_[a-f0-9]{20,32}$'
    and t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
  limit 1;
$$;

create or replace function institutionlens_api.brief_snapshots_list(
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
  v_organization_ref text := nullif(p_query ->> 'organizationRef', '');
  v_state text := nullif(p_query ->> 'state', '');
  v_sort_field text := coalesce(p_query ->> 'sortField', 'createdAt');
  v_sort_direction text := lower(coalesce(p_query ->> 'sortDirection', 'desc'));
  v_total integer;
  v_items jsonb;
begin
  if v_sort_field not in ('createdAt', 'updatedAt') then
    v_sort_field := 'createdAt';
  end if;
  if v_sort_direction not in ('asc', 'desc') then
    v_sort_direction := 'desc';
  end if;

  select count(*)::integer
  into v_total
  from institutionlens.brief_snapshots b
  join institutionlens.organizations o
    on o.tenant_id = b.tenant_id and o.id = b.organization_id
  join institutionlens.tenants t on t.id = b.tenant_id
  where t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
    and (v_organization_ref is null or o.public_ref = v_organization_ref)
    and (v_state is null or b.state = v_state);

  select coalesce(jsonb_agg(projected.item order by projected.sort_key, projected.public_ref), '[]'::jsonb)
  into v_items
  from (
    select
      institutionlens_api.project_brief_snapshot(b, o.public_ref, t.public_ref) as item,
      b.public_ref,
      case v_sort_field
        when 'updatedAt' then institutionlens_api.as_utc_iso(b.updated_at)
        else institutionlens_api.as_utc_iso(b.created_at)
      end as sort_key
    from institutionlens.brief_snapshots b
    join institutionlens.organizations o
      on o.tenant_id = b.tenant_id and o.id = b.organization_id
    join institutionlens.tenants t on t.id = b.tenant_id
    where t.public_ref = p_tenant_public_ref
      and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
      and t.id in (select institutionlens.accessible_tenant_ids())
      and (v_organization_ref is null or o.public_ref = v_organization_ref)
      and (v_state is null or b.state = v_state)
    order by
      case when v_sort_direction = 'asc' then
        case v_sort_field
          when 'updatedAt' then institutionlens_api.as_utc_iso(b.updated_at)
          else institutionlens_api.as_utc_iso(b.created_at)
        end
      end asc nulls last,
      case when v_sort_direction = 'desc' then
        case v_sort_field
          when 'updatedAt' then institutionlens_api.as_utc_iso(b.updated_at)
          else institutionlens_api.as_utc_iso(b.created_at)
        end
      end desc nulls last,
      b.public_ref
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

-- Authenticated EXECUTE only on the public RPC surface. Helpers stay non-executable.
revoke all on function institutionlens_api.organizations_get_by_public_ref(text, text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.organizations_get_by_domain_id(text, text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.organizations_list(text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.organizations_count(text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.evidence_list_by_organization_domain_id(text, text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.comparisons_get_by_public_ref(text, text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.comparisons_list(text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.brief_snapshots_get_by_public_ref(text, text)
  from public, anon, authenticated, service_role;
revoke all on function institutionlens_api.brief_snapshots_list(text, jsonb)
  from public, anon, authenticated, service_role;

grant execute on function institutionlens_api.organizations_get_by_public_ref(text, text) to authenticated;
grant execute on function institutionlens_api.organizations_get_by_domain_id(text, text) to authenticated;
grant execute on function institutionlens_api.organizations_list(text, jsonb) to authenticated;
grant execute on function institutionlens_api.organizations_count(text, jsonb) to authenticated;
grant execute on function institutionlens_api.evidence_list_by_organization_domain_id(text, text, jsonb) to authenticated;
grant execute on function institutionlens_api.comparisons_get_by_public_ref(text, text) to authenticated;
grant execute on function institutionlens_api.comparisons_list(text, jsonb) to authenticated;
grant execute on function institutionlens_api.brief_snapshots_get_by_public_ref(text, text) to authenticated;
grant execute on function institutionlens_api.brief_snapshots_list(text, jsonb) to authenticated;

commit;
