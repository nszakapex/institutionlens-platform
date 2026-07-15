-- Phase 9 corrective migration: materialize institutionlens default-privilege lockdown.
-- The initial schema migration revoked API-role privileges, but the function default-ACL
-- row did not persist on hosted Supabase, leaving PostgreSQL's implicit PUBLIC EXECUTE
-- on future functions created by the schema owner. This migration reasserts the deny
-- posture for the live schema owner and fails closed if the function default ACL is not
-- established without PUBLIC / anon / authenticated / service_role EXECUTE.
begin;

do $lockdown$
declare
  owner_name text;
  function_default_acl_missing boolean;
  api_default_privilege_violations integer;
begin
  select role_catalog.rolname
  into owner_name
  from pg_catalog.pg_namespace namespace
  join pg_catalog.pg_roles role_catalog on role_catalog.oid = namespace.nspowner
  where namespace.nspname = 'institutionlens';

  if owner_name is null then
    raise exception
      'phase9_default_function_privileges: institutionlens schema is missing';
  end if;

  -- Reassert deny-default posture for tables and sequences (consistency with Batch 1).
  execute format(
    'alter default privileges for role %I in schema institutionlens
       revoke all on tables from public, anon, authenticated, service_role',
    owner_name
  );
  execute format(
    'alter default privileges for role %I in schema institutionlens
       revoke all on sequences from public, anon, authenticated, service_role',
    owner_name
  );

  -- Primary attempt: revoke implicit PUBLIC EXECUTE from future functions.
  execute format(
    'alter default privileges for role %I in schema institutionlens
       revoke all on functions from public, anon, authenticated, service_role',
    owner_name
  );

  -- Some hosts leave no pg_default_acl row after REVOKE alone. Materialize an owner-only
  -- function default ACL, then immediately revoke every public/API grantee again.
  -- This path never issues GRANT to public, anon, authenticated, or service_role.
  -- Owner EXECUTE in the default ACL matches ordinary ownership posture and is not an API exposure.
  select not exists (
    select 1
    from pg_catalog.pg_default_acl default_acl
    join pg_catalog.pg_roles owner_role on owner_role.oid = default_acl.defaclrole
    join pg_catalog.pg_namespace namespace on namespace.oid = default_acl.defaclnamespace
    where owner_role.rolname = owner_name
      and namespace.nspname = 'institutionlens'
      and default_acl.defaclobjtype = 'f'
  )
  into function_default_acl_missing;

  if function_default_acl_missing then
    execute format(
      'alter default privileges for role %I in schema institutionlens
         grant execute on functions to %I',
      owner_name,
      owner_name
    );
    execute format(
      'alter default privileges for role %I in schema institutionlens
         revoke all on functions from public, anon, authenticated, service_role',
      owner_name
    );
  end if;

  select count(*)::integer
  into api_default_privilege_violations
  from (
    select 'r'::"char" as object_type
    union all
    select 'S'::"char"
    union all
    select 'f'::"char"
  ) expected
  join pg_catalog.pg_roles owner_role on owner_role.rolname = owner_name
  join pg_catalog.pg_namespace namespace on namespace.nspname = 'institutionlens'
  left join pg_catalog.pg_default_acl default_acl
    on default_acl.defaclrole = owner_role.oid
   and default_acl.defaclnamespace = namespace.oid
   and default_acl.defaclobjtype = expected.object_type
  cross join lateral aclexplode(
    coalesce(default_acl.defaclacl, acldefault(expected.object_type, owner_role.oid))
  ) acl
  left join pg_catalog.pg_roles grantee_role on grantee_role.oid = acl.grantee
  where acl.grantee = 0
     or grantee_role.rolname in ('anon', 'authenticated', 'service_role');

  if api_default_privilege_violations <> 0 then
    raise exception
      'phase9_default_function_privileges: default privileges still expose public or API roles (% violations)',
      api_default_privilege_violations;
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_default_acl default_acl
    join pg_catalog.pg_roles owner_role on owner_role.oid = default_acl.defaclrole
    join pg_catalog.pg_namespace namespace on namespace.oid = default_acl.defaclnamespace
    where owner_role.rolname = owner_name
      and namespace.nspname = 'institutionlens'
      and default_acl.defaclobjtype = 'f'
  ) then
    raise exception
      'phase9_default_function_privileges: function default-ACL row was not materialized';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_default_acl default_acl
    join pg_catalog.pg_roles owner_role on owner_role.oid = default_acl.defaclrole
    join pg_catalog.pg_namespace namespace on namespace.oid = default_acl.defaclnamespace
    cross join lateral aclexplode(default_acl.defaclacl) acl
    left join pg_catalog.pg_roles grantee_role on grantee_role.oid = acl.grantee
    where owner_role.rolname = owner_name
      and namespace.nspname = 'institutionlens'
      and default_acl.defaclobjtype = 'f'
      and (
        acl.grantee = 0
        or grantee_role.rolname in ('anon', 'authenticated', 'service_role')
      )
  ) then
    raise exception
      'phase9_default_function_privileges: function default ACL still grants public or API roles';
  end if;
end;
$lockdown$;

commit;
