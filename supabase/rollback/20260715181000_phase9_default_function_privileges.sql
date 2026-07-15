-- DESTRUCTIVE: security-reverting emergency rollback for approved disposable
-- local/staging databases only. Not a safe production rollback.
-- Reintroduces PostgreSQL's implicit PUBLIC EXECUTE default for future functions
-- created by the institutionlens schema owner. Does not drop tables, rows, or the schema.
-- Never run after customer or non-disposable data is accepted.
-- When wiping a disposable database entirely, prefer
-- supabase/rollback/20260713190000_phase9_initial_schema.sql instead.
begin;

do $rollback$
declare
  owner_name text;
begin
  select role_catalog.rolname
  into owner_name
  from pg_catalog.pg_namespace namespace
  join pg_catalog.pg_roles role_catalog on role_catalog.oid = namespace.nspowner
  where namespace.nspname = 'institutionlens';

  if owner_name is null then
    raise exception
      'phase9_default_function_privileges rollback: institutionlens schema is missing';
  end if;

  execute format(
    'alter default privileges for role %I in schema institutionlens
       grant execute on functions to public',
    owner_name
  );
end;
$rollback$;

commit;
