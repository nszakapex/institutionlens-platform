-- Rollback overlay column-safe projection to row-typed helper + callers.

begin;

revoke all on function institutionlens.project_overlay(
  text, jsonb, text, text, text, timestamptz, timestamptz, text, text, text
) from public, anon, authenticated, service_role;

drop function if exists institutionlens.project_overlay(
  text, jsonb, text, text, text, timestamptz, timestamptz, text, text, text
);

create or replace function institutionlens.project_overlay(
  p_overlay institutionlens.organization_overlays,
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
      'synthetic', (p_overlay.source_classification = 'synthetic_demo'),
      'relationshipStatus', p_overlay.relationship_status,
      'capabilityUsage', p_overlay.capability_usage,
      'matchStatus', p_overlay.match_status,
      'reviewStatus', p_overlay.review_status,
      'sourceClassification', p_overlay.source_classification,
      'effectiveAt', institutionlens.as_utc_iso(p_overlay.effective_at),
      'updatedAt', institutionlens.as_utc_iso(p_overlay.updated_at)
    )
  end;
$$;

revoke all on function institutionlens.project_overlay(
  institutionlens.organization_overlays, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function institutionlens.project_overlay(
  institutionlens.organization_overlays, text, text, text
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
    ov,
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
        ov,
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
    ov,
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

commit;
