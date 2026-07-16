-- Overlay RPCs must not pass organization_overlays whole-row composites to
-- helpers: that requires SELECT on private_notes, which is withheld.
-- Keep SECURITY INVOKER; project only granted columns.

begin;

revoke all on function institutionlens.project_overlay(
  institutionlens.organization_overlays, text, text, text
) from public, anon, authenticated, service_role;

drop function if exists institutionlens.project_overlay(
  institutionlens.organization_overlays, text, text, text
);

create or replace function institutionlens.project_overlay(
  p_relationship_status text,
  p_capability_usage jsonb,
  p_match_status text,
  p_review_status text,
  p_source_classification text,
  p_effective_at timestamptz,
  p_updated_at timestamptz,
  p_org_source_key text,
  p_tenant_public_ref text,
  p_tenant_domain_id text
)
returns jsonb
language sql
stable
security invoker
set search_path = institutionlens, pg_catalog
as $$
  select case
    when p_org_source_key is null
      or p_org_source_key !~ '^org_[a-z0-9_]{1,48}$'
      or institutionlens.project_overlay_id(p_org_source_key) is null
      or p_tenant_domain_id !~ '^tenant_[a-z0-9_]{1,48}$'
      then null
    else jsonb_build_object(
      'tenantPublicRef', p_tenant_public_ref,
      'id', institutionlens.project_overlay_id(p_org_source_key),
      'tenantId', p_tenant_domain_id,
      'organizationId', p_org_source_key,
      'schemaVersion', '1.0.0',
      'synthetic', (p_source_classification = 'synthetic_demo'),
      'relationshipStatus', p_relationship_status,
      'capabilityUsage', p_capability_usage,
      'matchStatus', p_match_status,
      'reviewStatus', p_review_status,
      'sourceClassification', p_source_classification,
      'effectiveAt', institutionlens.as_utc_iso(p_effective_at),
      'updatedAt', institutionlens.as_utc_iso(p_updated_at)
    )
  end;
$$;

revoke all on function institutionlens.project_overlay(
  text, jsonb, text, text, text, timestamptz, timestamptz, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function institutionlens.project_overlay(
  text, jsonb, text, text, text, timestamptz, timestamptz, text, text, text
) to authenticated;

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
  select institutionlens.project_overlay(
    ov.relationship_status,
    ov.capability_usage,
    ov.match_status,
    ov.review_status,
    ov.source_classification,
    ov.effective_at,
    ov.updated_at,
    o.source_key,
    t.public_ref,
    institutionlens.derive_tenant_domain_id(t.public_ref)
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
      institutionlens.project_overlay(
        ov.relationship_status,
        ov.capability_usage,
        ov.match_status,
        ov.review_status,
        ov.source_classification,
        ov.effective_at,
        ov.updated_at,
        o.source_key,
        t.public_ref,
        institutionlens.derive_tenant_domain_id(t.public_ref)
      ) as item,
      institutionlens.project_overlay_id(o.source_key) as sort_id
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
  select institutionlens.project_overlay(
    ov.relationship_status,
    ov.capability_usage,
    ov.match_status,
    ov.review_status,
    ov.source_classification,
    ov.effective_at,
    ov.updated_at,
    o.source_key,
    t.public_ref,
    institutionlens.derive_tenant_domain_id(t.public_ref)
  )
  from institutionlens.organization_overlays ov
  join institutionlens.organizations o
    on o.tenant_id = ov.tenant_id and o.id = ov.organization_id
  join institutionlens.tenants t on t.id = ov.tenant_id
  where institutionlens.project_overlay_id(o.source_key) = p_domain_id
    and p_domain_id ~ '^overlay_[a-z0-9_]{1,48}$'
    and t.public_ref = p_tenant_public_ref
    and p_tenant_public_ref ~ '^tref_[a-f0-9]{20,32}$'
    and t.id in (select institutionlens.accessible_tenant_ids())
  limit 1;
$$;

do $assert$
begin
  if exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('institutionlens', 'institutionlens_api')
      and p.proname in (
        'project_overlay',
        'overlays_get_by_organization_domain_id',
        'overlays_list',
        'overlays_get_by_domain_id'
      )
      and p.prosecdef
  ) then
    raise exception 'SECURITY DEFINER forbidden on overlay projection/RPC functions';
  end if;
end;
$assert$;

commit;
