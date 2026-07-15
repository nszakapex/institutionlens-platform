-- Phase 9 staging verification. This file must remain a single SELECT-only statement.
-- It returns catalog-derived booleans and counts only; it never projects application rows.
with
expected_tables(table_name) as (
  values
    ('tenants'),
    ('tenant_verticals'),
    ('memberships'),
    ('organizations'),
    ('import_runs'),
    ('provenance_records'),
    ('evidence_records'),
    ('evidence_dependencies'),
    ('assessment_runs'),
    ('assessment_results'),
    ('capability_results'),
    ('rule_results'),
    ('rule_result_evidence'),
    ('organization_overlays'),
    ('saved_comparisons'),
    ('saved_comparison_organizations'),
    ('brief_snapshots'),
    ('audit_events')
),
expected_indexes(index_name) as (
  values
    ('tenant_verticals_tenant_status_idx'),
    ('memberships_user_status_idx'),
    ('memberships_tenant_role_status_idx'),
    ('organizations_tenant_list_idx'),
    ('organizations_tenant_type_idx'),
    ('organizations_tags_idx'),
    ('import_runs_tenant_status_idx'),
    ('provenance_records_tenant_filters_idx'),
    ('provenance_records_tenant_import_idx'),
    ('evidence_records_tenant_org_idx'),
    ('evidence_records_tenant_filters_idx'),
    ('evidence_records_safe_search_idx'),
    ('evidence_dependencies_input_idx'),
    ('assessment_runs_tenant_org_idx'),
    ('assessment_runs_tenant_status_idx'),
    ('assessment_results_tenant_assessed_idx'),
    ('capability_results_tenant_org_idx'),
    ('rule_results_tenant_run_idx'),
    ('rule_result_evidence_evidence_idx'),
    ('organization_overlays_tenant_review_idx'),
    ('saved_comparisons_tenant_status_idx'),
    ('saved_comparison_organizations_org_idx'),
    ('brief_snapshots_tenant_org_idx'),
    ('brief_snapshots_retention_idx'),
    ('audit_events_tenant_time_idx'),
    ('audit_events_tenant_type_idx'),
    ('audit_events_retention_idx')
),
expected_domain_foreign_keys(constraint_signature) as (
  values
    ('memberships_inviter_fk|memberships|tenant_id,invited_by_membership_id|memberships|tenant_id,id'),
    ('organizations_vertical_fk|organizations|tenant_id,vertical_id|tenant_verticals|tenant_id,vertical_id'),
    ('import_runs_initiator_fk|import_runs|tenant_id,initiated_by_membership_id|memberships|tenant_id,id'),
    ('provenance_records_import_run_fk|provenance_records|tenant_id,import_run_id|import_runs|tenant_id,id'),
    ('evidence_records_organization_fk|evidence_records|tenant_id,organization_id,vertical_id|organizations|tenant_id,id,vertical_id'),
    ('evidence_records_provenance_fk|evidence_records|tenant_id,provenance_id|provenance_records|tenant_id,id'),
    ('evidence_records_import_run_fk|evidence_records|tenant_id,import_run_id|import_runs|tenant_id,id'),
    ('evidence_dependencies_evidence_fk|evidence_dependencies|tenant_id,evidence_id,organization_id|evidence_records|tenant_id,id,organization_id'),
    ('evidence_dependencies_input_evidence_fk|evidence_dependencies|tenant_id,input_evidence_id,organization_id|evidence_records|tenant_id,id,organization_id'),
    ('assessment_runs_organization_fk|assessment_runs|tenant_id,organization_id,vertical_id|organizations|tenant_id,id,vertical_id'),
    ('assessment_results_run_fk|assessment_results|tenant_id,assessment_run_id,organization_id|assessment_runs|tenant_id,id,organization_id'),
    ('assessment_results_organization_fk|assessment_results|tenant_id,organization_id|organizations|tenant_id,id'),
    ('capability_results_run_fk|capability_results|tenant_id,assessment_run_id,organization_id|assessment_runs|tenant_id,id,organization_id'),
    ('capability_results_result_fk|capability_results|tenant_id,assessment_result_id,assessment_run_id,organization_id|assessment_results|tenant_id,id,assessment_run_id,organization_id'),
    ('capability_results_organization_fk|capability_results|tenant_id,organization_id|organizations|tenant_id,id'),
    ('rule_results_run_fk|rule_results|tenant_id,assessment_run_id,organization_id|assessment_runs|tenant_id,id,organization_id'),
    ('rule_results_capability_result_fk|rule_results|tenant_id,capability_result_id,assessment_run_id,organization_id|capability_results|tenant_id,id,assessment_run_id,organization_id'),
    ('rule_result_evidence_rule_result_fk|rule_result_evidence|tenant_id,rule_result_id,organization_id|rule_results|tenant_id,id,organization_id'),
    ('rule_result_evidence_evidence_fk|rule_result_evidence|tenant_id,evidence_id,organization_id|evidence_records|tenant_id,id,organization_id'),
    ('organization_overlays_organization_fk|organization_overlays|tenant_id,organization_id|organizations|tenant_id,id'),
    ('saved_comparisons_creator_fk|saved_comparisons|tenant_id,created_by_membership_id|memberships|tenant_id,id'),
    ('saved_comparison_organizations_comparison_fk|saved_comparison_organizations|tenant_id,saved_comparison_id|saved_comparisons|tenant_id,id'),
    ('saved_comparison_organizations_organization_fk|saved_comparison_organizations|tenant_id,organization_id|organizations|tenant_id,id'),
    ('brief_snapshots_organization_fk|brief_snapshots|tenant_id,organization_id|organizations|tenant_id,id'),
    ('brief_snapshots_assessment_run_fk|brief_snapshots|tenant_id,assessment_run_id,organization_id|assessment_runs|tenant_id,id,organization_id'),
    ('brief_snapshots_creator_fk|brief_snapshots|tenant_id,created_by_membership_id|memberships|tenant_id,id'),
    ('brief_snapshots_approver_fk|brief_snapshots|tenant_id,approved_by_membership_id|memberships|tenant_id,id'),
    ('audit_events_actor_fk|audit_events|tenant_id,actor_membership_ref|memberships|tenant_id,public_ref')
),
expected_lineage_foreign_keys(
  constraint_name,
  source_columns,
  target_table,
  target_columns
) as (
  values
    (
      'evidence_records_organization_fk',
      array['tenant_id', 'organization_id', 'vertical_id']::text[],
      'organizations',
      array['tenant_id', 'id', 'vertical_id']::text[]
    ),
    (
      'assessment_runs_organization_fk',
      array['tenant_id', 'organization_id', 'vertical_id']::text[],
      'organizations',
      array['tenant_id', 'id', 'vertical_id']::text[]
    ),
    (
      'assessment_results_run_fk',
      array['tenant_id', 'assessment_run_id', 'organization_id']::text[],
      'assessment_runs',
      array['tenant_id', 'id', 'organization_id']::text[]
    ),
    (
      'capability_results_run_fk',
      array['tenant_id', 'assessment_run_id', 'organization_id']::text[],
      'assessment_runs',
      array['tenant_id', 'id', 'organization_id']::text[]
    ),
    (
      'rule_results_run_fk',
      array['tenant_id', 'assessment_run_id', 'organization_id']::text[],
      'assessment_runs',
      array['tenant_id', 'id', 'organization_id']::text[]
    ),
    (
      'brief_snapshots_assessment_run_fk',
      array['tenant_id', 'assessment_run_id', 'organization_id']::text[],
      'assessment_runs',
      array['tenant_id', 'id', 'organization_id']::text[]
    ),
    (
      'capability_results_result_fk',
      array['tenant_id', 'assessment_result_id', 'assessment_run_id', 'organization_id']::text[],
      'assessment_results',
      array['tenant_id', 'id', 'assessment_run_id', 'organization_id']::text[]
    ),
    (
      'rule_results_capability_result_fk',
      array['tenant_id', 'capability_result_id', 'assessment_run_id', 'organization_id']::text[],
      'capability_results',
      array['tenant_id', 'id', 'assessment_run_id', 'organization_id']::text[]
    ),
    (
      'evidence_dependencies_evidence_fk',
      array['tenant_id', 'evidence_id', 'organization_id']::text[],
      'evidence_records',
      array['tenant_id', 'id', 'organization_id']::text[]
    ),
    (
      'evidence_dependencies_input_evidence_fk',
      array['tenant_id', 'input_evidence_id', 'organization_id']::text[],
      'evidence_records',
      array['tenant_id', 'id', 'organization_id']::text[]
    ),
    (
      'rule_result_evidence_evidence_fk',
      array['tenant_id', 'evidence_id', 'organization_id']::text[],
      'evidence_records',
      array['tenant_id', 'id', 'organization_id']::text[]
    ),
    (
      'rule_result_evidence_rule_result_fk',
      array['tenant_id', 'rule_result_id', 'organization_id']::text[],
      'rule_results',
      array['tenant_id', 'id', 'organization_id']::text[]
    )
),
expected_api_roles(role_name) as (
  values ('anon'), ('authenticated'), ('service_role')
),
actual_tables as (
  select relation.relname as table_name
  from pg_catalog.pg_class relation
  join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'institutionlens'
    and relation.relkind in ('r', 'p')
),
table_differences as (
  (select table_name from expected_tables except select table_name from actual_tables)
  union all
  (select table_name from actual_tables except select table_name from expected_tables)
),
actual_indexes as (
  select
    index_relation.relname as index_name,
    index_catalog.indisvalid and index_catalog.indisready as is_usable
  from pg_catalog.pg_index index_catalog
  join pg_catalog.pg_class table_relation on table_relation.oid = index_catalog.indrelid
  join pg_catalog.pg_namespace namespace on namespace.oid = table_relation.relnamespace
  join pg_catalog.pg_class index_relation on index_relation.oid = index_catalog.indexrelid
  left join pg_catalog.pg_constraint constraint_catalog
    on constraint_catalog.conindid = index_catalog.indexrelid
  where namespace.nspname = 'institutionlens'
    and constraint_catalog.oid is null
),
index_differences as (
  (select index_name from expected_indexes except select index_name from actual_indexes)
  union all
  (select index_name from actual_indexes except select index_name from expected_indexes)
),
index_validity_violations as (
  select index_name
  from actual_indexes
  where not is_usable
),
foreign_keys as (
  select
    constraint_catalog.conname as constraint_name,
    source_relation.relname as source_table,
    target_namespace.nspname as target_schema,
    target_relation.relname as target_table,
    array_agg(source_attribute.attname order by key_columns.ordinality) as source_columns,
    array_agg(target_attribute.attname order by key_columns.ordinality) as target_columns
  from pg_catalog.pg_constraint constraint_catalog
  join pg_catalog.pg_class source_relation on source_relation.oid = constraint_catalog.conrelid
  join pg_catalog.pg_namespace source_namespace on source_namespace.oid = source_relation.relnamespace
  join pg_catalog.pg_class target_relation on target_relation.oid = constraint_catalog.confrelid
  join pg_catalog.pg_namespace target_namespace on target_namespace.oid = target_relation.relnamespace
  join lateral unnest(constraint_catalog.conkey, constraint_catalog.confkey)
    with ordinality as key_columns(source_attnum, target_attnum, ordinality) on true
  join pg_catalog.pg_attribute source_attribute
    on source_attribute.attrelid = source_relation.oid
   and source_attribute.attnum = key_columns.source_attnum
  join pg_catalog.pg_attribute target_attribute
    on target_attribute.attrelid = target_relation.oid
   and target_attribute.attnum = key_columns.target_attnum
  where constraint_catalog.contype = 'f'
    and source_namespace.nspname = 'institutionlens'
  group by
    constraint_catalog.conname,
    source_relation.relname,
    target_namespace.nspname,
    target_relation.relname
),
actual_domain_foreign_keys as (
  select
    constraint_name || '|' || source_table || '|'
      || array_to_string(source_columns, ',') || '|' || target_table || '|'
      || array_to_string(target_columns, ',') as constraint_signature
  from foreign_keys
  where target_schema = 'institutionlens'
    and target_table <> 'tenants'
),
domain_foreign_key_differences as (
  (
    select constraint_signature from expected_domain_foreign_keys
    except
    select constraint_signature from actual_domain_foreign_keys
  )
  union all
  (
    select constraint_signature from actual_domain_foreign_keys
    except
    select constraint_signature from expected_domain_foreign_keys
  )
),
foreign_key_shape_violations as (
  select constraint_name
  from foreign_keys
  where not (
    (
      target_schema = 'institutionlens'
      and target_table = 'tenants'
      and source_columns = array['tenant_id']::name[]
      and target_columns = array['id']::name[]
    )
    or (
      target_schema = 'auth'
      and target_table = 'users'
      and source_table = 'memberships'
      and source_columns = array['user_id']::name[]
      and target_columns = array['id']::name[]
    )
    or (
      target_schema = 'institutionlens'
      and target_table <> 'tenants'
      and source_columns[1] = 'tenant_id'
      and target_columns[1] = 'tenant_id'
    )
  )
),
lineage_differences as (
  select expected.constraint_name
  from expected_lineage_foreign_keys expected
  left join foreign_keys actual
    on actual.constraint_name = expected.constraint_name
   and actual.source_columns::text[] = expected.source_columns
   and actual.target_table = expected.target_table
   and actual.target_columns::text[] = expected.target_columns
  where actual.constraint_name is null
),
rls_violations as (
  select expected.table_name
  from expected_tables expected
  left join pg_catalog.pg_namespace namespace on namespace.nspname = 'institutionlens'
  left join pg_catalog.pg_class relation
    on relation.relnamespace = namespace.oid
   and relation.relname = expected.table_name
   and relation.relkind in ('r', 'p')
  where relation.oid is null
     or not relation.relrowsecurity
     or not relation.relforcerowsecurity
),
policy_count as (
  select count(*)::bigint as value
  from pg_catalog.pg_policy policy
  join pg_catalog.pg_class relation on relation.oid = policy.polrelid
  join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'institutionlens'
),
missing_api_roles as (
  select expected.role_name
  from expected_api_roles expected
  left join pg_catalog.pg_roles role_catalog on role_catalog.rolname = expected.role_name
  where role_catalog.oid is null
),
schema_acl_violations as (
  select acl.grantee
  from pg_catalog.pg_namespace namespace
  cross join lateral aclexplode(
    coalesce(namespace.nspacl, acldefault('n', namespace.nspowner))
  ) acl
  left join pg_catalog.pg_roles grantee_role on grantee_role.oid = acl.grantee
  where namespace.nspname = 'institutionlens'
    and (acl.grantee = 0 or grantee_role.rolname in (select role_name from expected_api_roles))
),
relation_acl_violations as (
  select relation.relname
  from pg_catalog.pg_class relation
  join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
  cross join lateral aclexplode(
    coalesce(
      relation.relacl,
      acldefault(
        case when relation.relkind = 'S' then 'S'::"char" else 'r'::"char" end,
        relation.relowner
      )
    )
  ) acl
  left join pg_catalog.pg_roles grantee_role on grantee_role.oid = acl.grantee
  where namespace.nspname = 'institutionlens'
    and relation.relkind in ('r', 'p', 'S')
    and (acl.grantee = 0 or grantee_role.rolname in (select role_name from expected_api_roles))
),
function_acl_violations as (
  select procedure.proname
  from pg_catalog.pg_proc procedure
  join pg_catalog.pg_namespace namespace on namespace.oid = procedure.pronamespace
  cross join lateral aclexplode(
    coalesce(procedure.proacl, acldefault('f', procedure.proowner))
  ) acl
  left join pg_catalog.pg_roles grantee_role on grantee_role.oid = acl.grantee
  where namespace.nspname = 'institutionlens'
    and (acl.grantee = 0 or grantee_role.rolname in (select role_name from expected_api_roles))
),
default_acl_types(object_type) as (
  values ('r'::"char"), ('S'::"char"), ('f'::"char")
),
default_acl_state as (
  select
    expected.object_type,
    coalesce(default_acl.defaclacl, acldefault(expected.object_type, owner_role.oid)) as acl_items
  from default_acl_types expected
  join pg_catalog.pg_namespace namespace on namespace.nspname = 'institutionlens'
  join pg_catalog.pg_roles owner_role on owner_role.oid = namespace.nspowner
  left join pg_catalog.pg_default_acl default_acl
    on default_acl.defaclrole = owner_role.oid
   and default_acl.defaclnamespace = namespace.oid
   and default_acl.defaclobjtype = expected.object_type
),
default_acl_violations as (
  select state.object_type
  from default_acl_state state
  cross join lateral aclexplode(state.acl_items) acl
  left join pg_catalog.pg_roles grantee_role on grantee_role.oid = acl.grantee
  where acl.grantee = 0
     or grantee_role.rolname in (select role_name from expected_api_roles)
),
effective_role_privilege_violations as (
  select role_name
  from expected_api_roles
  where has_schema_privilege(role_name, 'institutionlens', 'usage')
     or has_schema_privilege(role_name, 'institutionlens', 'create')
     or exists (
       select 1
       from expected_tables
       cross join (
         values
           ('select'),
           ('insert'),
           ('update'),
           ('delete'),
           ('truncate'),
           ('references'),
           ('trigger')
       ) privileges(privilege_name)
       where has_table_privilege(
         role_name,
         format('institutionlens.%I', table_name),
         privilege_name
       )
     )
),
application_rows_exist as (
  select exists (
    select 1 from institutionlens.tenants
    union all select 1 from institutionlens.tenant_verticals
    union all select 1 from institutionlens.memberships
    union all select 1 from institutionlens.organizations
    union all select 1 from institutionlens.import_runs
    union all select 1 from institutionlens.provenance_records
    union all select 1 from institutionlens.evidence_records
    union all select 1 from institutionlens.evidence_dependencies
    union all select 1 from institutionlens.assessment_runs
    union all select 1 from institutionlens.assessment_results
    union all select 1 from institutionlens.capability_results
    union all select 1 from institutionlens.rule_results
    union all select 1 from institutionlens.rule_result_evidence
    union all select 1 from institutionlens.organization_overlays
    union all select 1 from institutionlens.saved_comparisons
    union all select 1 from institutionlens.saved_comparison_organizations
    union all select 1 from institutionlens.brief_snapshots
    union all select 1 from institutionlens.audit_events
    limit 1
  ) as value
),
expected_migration_versions(version) as (
  values
    ('20260713190000'),
    ('20260715181000')
),
migration_history as (
  select
    count(*)::bigint as total_count,
    count(*) filter (
      where version in (select version from expected_migration_versions)
    )::bigint as expected_count,
    count(*) filter (
      where version not in (select version from expected_migration_versions)
    )::bigint as unexpected_count
  from supabase_migrations.schema_migrations
),
checks(check_name, passed, expected_value, actual_value) as (
  select
    'schema_exists',
    exists (select 1 from pg_catalog.pg_namespace where nspname = 'institutionlens'),
    'true',
    exists (select 1 from pg_catalog.pg_namespace where nspname = 'institutionlens')::text
  union all
  select 'table_set', count(*) = 0, '0 differences', count(*)::text || ' differences'
  from table_differences
  union all
  select
    'index_set',
    count(*) = 0 and (select count(*) from index_validity_violations) = 0,
    '0 differences or unusable indexes',
    count(*)::text || ' differences, '
      || (select count(*) from index_validity_violations)::text || ' unusable'
  from index_differences
  union all
  select
    'domain_foreign_key_set',
    count(*) = 0,
    '0 differences',
    count(*)::text || ' differences'
  from domain_foreign_key_differences
  union all
  select
    'foreign_key_shape',
    count(*) = 0 and (select count(*) from foreign_keys) = 46,
    '46 valid foreign keys',
    (select count(*) from foreign_keys)::text || ' total, ' || count(*)::text || ' invalid'
  from foreign_key_shape_violations
  union all
  select
    'same_organization_lineage',
    count(*) = 0,
    '0 differences',
    count(*)::text || ' differences'
  from lineage_differences
  union all
  select 'rls_enabled_and_forced', count(*) = 0, '0 violations', count(*)::text || ' violations'
  from rls_violations
  union all
  select 'rls_policy_count', value = 0, '0', value::text
  from policy_count
  union all
  select 'api_roles_exist', count(*) = 0, '0 missing', count(*)::text || ' missing'
  from missing_api_roles
  union all
  select
    'api_role_privileges',
    (
      (select count(*) from schema_acl_violations)
      + (select count(*) from relation_acl_violations)
      + (select count(*) from function_acl_violations)
      + (select count(*) from default_acl_violations)
      + (select count(*) from effective_role_privilege_violations)
    ) = 0,
    '0 violations',
    (
      (select count(*) from schema_acl_violations)
      + (select count(*) from relation_acl_violations)
      + (select count(*) from function_acl_violations)
      + (select count(*) from default_acl_violations)
      + (select count(*) from effective_role_privilege_violations)
    )::text || ' violations'
  union all
  select 'application_row_count', not value, '0 rows', case when value then '>0 rows' else '0 rows' end
  from application_rows_exist
  union all
  select
    'migration_history',
    total_count = 2 and expected_count = 2 and unexpected_count = 0,
    'exactly 20260713190000 and 20260715181000',
    total_count::text || ' total, ' || expected_count::text
      || ' expected, ' || unexpected_count::text || ' unexpected'
  from migration_history
)
select check_name, passed, expected_value, actual_value
from checks
order by check_name;
