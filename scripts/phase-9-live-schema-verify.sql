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
denied_api_roles(role_name) as (
  values ('anon'), ('service_role')
),
allowed_helper_functions(function_name) as (
  values
    ('accessible_tenant_ids'),
    ('own_membership_ids'),
    ('active_member_has_roles')
),
-- BEGIN_AUTHENTICATED_COLUMN_GRANT_MATRIX
expected_column_grants(table_name, column_name) as (
  values
    ('assessment_results', 'assessed_at'),
    ('assessment_results', 'assessment_run_id'),
    ('assessment_results', 'completeness'),
    ('assessment_results', 'confidence'),
    ('assessment_results', 'coverage'),
    ('assessment_results', 'created_at'),
    ('assessment_results', 'fit_status'),
    ('assessment_results', 'freshness'),
    ('assessment_results', 'id'),
    ('assessment_results', 'observed_fit_band'),
    ('assessment_results', 'opportunity_contexts'),
    ('assessment_results', 'organization_id'),
    ('assessment_results', 'points_awarded'),
    ('assessment_results', 'points_possible'),
    ('assessment_results', 'publication_eligibility'),
    ('assessment_results', 'tenant_id'),
    ('assessment_runs', 'adapter_version'),
    ('assessment_runs', 'completed_at'),
    ('assessment_runs', 'created_at'),
    ('assessment_runs', 'domain_schema_version'),
    ('assessment_runs', 'engine_version'),
    ('assessment_runs', 'evidence_fingerprint'),
    ('assessment_runs', 'failure_code'),
    ('assessment_runs', 'id'),
    ('assessment_runs', 'manifest'),
    ('assessment_runs', 'methodology_version'),
    ('assessment_runs', 'organization_id'),
    ('assessment_runs', 'output_fingerprint'),
    ('assessment_runs', 'portfolio_ref'),
    ('assessment_runs', 'portfolio_version'),
    ('assessment_runs', 'public_ref'),
    ('assessment_runs', 'publication_eligibility'),
    ('assessment_runs', 'published_at'),
    ('assessment_runs', 'requested_at'),
    ('assessment_runs', 'started_at'),
    ('assessment_runs', 'status'),
    ('assessment_runs', 'synthetic'),
    ('assessment_runs', 'tenant_id'),
    ('assessment_runs', 'vertical_id'),
    ('audit_events', 'actor_membership_ref'),
    ('audit_events', 'event_ref'),
    ('audit_events', 'event_type'),
    ('audit_events', 'id'),
    ('audit_events', 'occurred_at'),
    ('audit_events', 'outcome'),
    ('audit_events', 'redacted_metadata'),
    ('audit_events', 'request_id'),
    ('audit_events', 'retention_expires_at'),
    ('audit_events', 'target_opaque_ref'),
    ('audit_events', 'target_type'),
    ('audit_events', 'tenant_id'),
    ('brief_snapshots', 'approved_at'),
    ('brief_snapshots', 'approved_by_membership_id'),
    ('brief_snapshots', 'assessment_run_id'),
    ('brief_snapshots', 'content'),
    ('brief_snapshots', 'content_fingerprint'),
    ('brief_snapshots', 'created_at'),
    ('brief_snapshots', 'created_by_membership_id'),
    ('brief_snapshots', 'id'),
    ('brief_snapshots', 'organization_id'),
    ('brief_snapshots', 'public_ref'),
    ('brief_snapshots', 'publication_eligibility'),
    ('brief_snapshots', 'retention_expires_at'),
    ('brief_snapshots', 'source_manifest'),
    ('brief_snapshots', 'state'),
    ('brief_snapshots', 'template_version'),
    ('brief_snapshots', 'tenant_id'),
    ('brief_snapshots', 'updated_at'),
    ('capability_results', 'assessed_at'),
    ('capability_results', 'assessment_result_id'),
    ('capability_results', 'assessment_run_id'),
    ('capability_results', 'capability_ref'),
    ('capability_results', 'completeness'),
    ('capability_results', 'confidence'),
    ('capability_results', 'created_at'),
    ('capability_results', 'fit_status'),
    ('capability_results', 'freshness'),
    ('capability_results', 'id'),
    ('capability_results', 'observed_fit_band'),
    ('capability_results', 'organization_id'),
    ('capability_results', 'points_awarded'),
    ('capability_results', 'points_possible'),
    ('capability_results', 'publication_eligibility'),
    ('capability_results', 'rule_set_ref'),
    ('capability_results', 'rule_set_version'),
    ('capability_results', 'tenant_id'),
    ('evidence_dependencies', 'created_at'),
    ('evidence_dependencies', 'evidence_id'),
    ('evidence_dependencies', 'id'),
    ('evidence_dependencies', 'input_evidence_id'),
    ('evidence_dependencies', 'organization_id'),
    ('evidence_dependencies', 'tenant_id'),
    ('evidence_records', 'access_classification'),
    ('evidence_records', 'adapter_version'),
    ('evidence_records', 'calculation_descriptor'),
    ('evidence_records', 'confidence'),
    ('evidence_records', 'created_at'),
    ('evidence_records', 'data_classification'),
    ('evidence_records', 'domain_schema_version'),
    ('evidence_records', 'effective_period_end'),
    ('evidence_records', 'effective_period_start'),
    ('evidence_records', 'epistemic_status'),
    ('evidence_records', 'evidence_type'),
    ('evidence_records', 'freshness'),
    ('evidence_records', 'id'),
    ('evidence_records', 'import_run_id'),
    ('evidence_records', 'observation'),
    ('evidence_records', 'observed_at'),
    ('evidence_records', 'organization_id'),
    ('evidence_records', 'provenance_id'),
    ('evidence_records', 'publication_eligibility'),
    ('evidence_records', 'rule_set_ref'),
    ('evidence_records', 'safe_search_text'),
    ('evidence_records', 'source_key'),
    ('evidence_records', 'staleness_reason'),
    ('evidence_records', 'summary'),
    ('evidence_records', 'superseded_at'),
    ('evidence_records', 'synthetic'),
    ('evidence_records', 'tenant_id'),
    ('evidence_records', 'title'),
    ('evidence_records', 'updated_at'),
    ('evidence_records', 'vertical_id'),
    ('import_runs', 'cleanup_after'),
    ('import_runs', 'contract_version'),
    ('import_runs', 'created_at'),
    ('import_runs', 'dry_run'),
    ('import_runs', 'finished_at'),
    ('import_runs', 'id'),
    ('import_runs', 'idempotency_key'),
    ('import_runs', 'initiated_by_membership_id'),
    ('import_runs', 'input_checksum'),
    ('import_runs', 'public_ref'),
    ('import_runs', 'queued_at'),
    ('import_runs', 'record_counts'),
    ('import_runs', 'safe_error_summary'),
    ('import_runs', 'source_key'),
    ('import_runs', 'source_policy_version'),
    ('import_runs', 'started_at'),
    ('import_runs', 'status'),
    ('import_runs', 'tenant_id'),
    ('memberships', 'created_at'),
    ('memberships', 'id'),
    ('memberships', 'invited_at'),
    ('memberships', 'invited_by_membership_id'),
    ('memberships', 'joined_at'),
    ('memberships', 'public_ref'),
    ('memberships', 'removed_at'),
    ('memberships', 'role'),
    ('memberships', 'status'),
    ('memberships', 'suspended_at'),
    ('memberships', 'tenant_id'),
    ('memberships', 'updated_at'),
    ('organization_overlays', 'capability_usage'),
    ('organization_overlays', 'created_at'),
    ('organization_overlays', 'effective_at'),
    ('organization_overlays', 'id'),
    ('organization_overlays', 'match_status'),
    ('organization_overlays', 'organization_id'),
    ('organization_overlays', 'relationship_status'),
    ('organization_overlays', 'review_status'),
    ('organization_overlays', 'schema_version'),
    ('organization_overlays', 'source_classification'),
    ('organization_overlays', 'tenant_id'),
    ('organization_overlays', 'updated_at'),
    ('organizations', 'adapter_version'),
    ('organizations', 'archived_at'),
    ('organizations', 'created_at'),
    ('organizations', 'data_classification'),
    ('organizations', 'display_name'),
    ('organizations', 'domain_schema_version'),
    ('organizations', 'external_references'),
    ('organizations', 'id'),
    ('organizations', 'legal_name'),
    ('organizations', 'lifecycle_status'),
    ('organizations', 'organization_type'),
    ('organizations', 'primary_location'),
    ('organizations', 'public_ref'),
    ('organizations', 'source_key'),
    ('organizations', 'summary'),
    ('organizations', 'synthetic'),
    ('organizations', 'tags'),
    ('organizations', 'tenant_id'),
    ('organizations', 'updated_at'),
    ('organizations', 'vertical_id'),
    ('organizations', 'vertical_payload'),
    ('provenance_records', 'access_classification'),
    ('provenance_records', 'checksum'),
    ('provenance_records', 'created_at'),
    ('provenance_records', 'data_classification'),
    ('provenance_records', 'id'),
    ('provenance_records', 'import_run_id'),
    ('provenance_records', 'license_status'),
    ('provenance_records', 'published_at'),
    ('provenance_records', 'reporting_period_end'),
    ('provenance_records', 'reporting_period_start'),
    ('provenance_records', 'retrieved_at'),
    ('provenance_records', 'source_key'),
    ('provenance_records', 'source_name'),
    ('provenance_records', 'source_type'),
    ('provenance_records', 'synthetic'),
    ('provenance_records', 'tenant_id'),
    ('provenance_records', 'updated_at'),
    ('provenance_records', 'validation_status'),
    ('rule_result_evidence', 'created_at'),
    ('rule_result_evidence', 'evidence_id'),
    ('rule_result_evidence', 'id'),
    ('rule_result_evidence', 'organization_id'),
    ('rule_result_evidence', 'rule_result_id'),
    ('rule_result_evidence', 'tenant_id'),
    ('rule_results', 'assessment_run_id'),
    ('rule_results', 'capability_result_id'),
    ('rule_results', 'created_at'),
    ('rule_results', 'engine_version'),
    ('rule_results', 'epistemic_states'),
    ('rule_results', 'evaluated_at'),
    ('rule_results', 'factor_category'),
    ('rule_results', 'freshness_states'),
    ('rule_results', 'id'),
    ('rule_results', 'maximum_points'),
    ('rule_results', 'organization_id'),
    ('rule_results', 'outcome'),
    ('rule_results', 'points_awarded'),
    ('rule_results', 'publication_eligibility'),
    ('rule_results', 'reason'),
    ('rule_results', 'reason_code'),
    ('rule_results', 'rule_ref'),
    ('rule_results', 'rule_set_version'),
    ('rule_results', 'synthetic'),
    ('rule_results', 'tenant_id'),
    ('saved_comparison_organizations', 'created_at'),
    ('saved_comparison_organizations', 'id'),
    ('saved_comparison_organizations', 'organization_id'),
    ('saved_comparison_organizations', 'position'),
    ('saved_comparison_organizations', 'saved_comparison_id'),
    ('saved_comparison_organizations', 'tenant_id'),
    ('saved_comparisons', 'archived_at'),
    ('saved_comparisons', 'created_at'),
    ('saved_comparisons', 'created_by_membership_id'),
    ('saved_comparisons', 'id'),
    ('saved_comparisons', 'name'),
    ('saved_comparisons', 'public_ref'),
    ('saved_comparisons', 'status'),
    ('saved_comparisons', 'tenant_id'),
    ('saved_comparisons', 'updated_at'),
    ('tenant_verticals', 'adapter_version'),
    ('tenant_verticals', 'created_at'),
    ('tenant_verticals', 'id'),
    ('tenant_verticals', 'status'),
    ('tenant_verticals', 'tenant_id'),
    ('tenant_verticals', 'updated_at'),
    ('tenant_verticals', 'vertical_id'),
    ('tenants', 'created_at'),
    ('tenants', 'data_classification'),
    ('tenants', 'deletion_requested_at'),
    ('tenants', 'demo'),
    ('tenants', 'display_name'),
    ('tenants', 'id'),
    ('tenants', 'public_ref'),
    ('tenants', 'status'),
    ('tenants', 'suspended_at'),
    ('tenants', 'updated_at')
),
live_column_grants as (
  select
    column_privileges.table_name::text as table_name,
    column_privileges.column_name::text as column_name
  from information_schema.column_privileges
  where column_privileges.grantee = 'authenticated'
    and column_privileges.table_schema = 'institutionlens'
    and column_privileges.privilege_type = 'SELECT'
),
column_grant_matrix_violations as (
  select expected.table_name || '.' || expected.column_name as grant_ref
  from expected_column_grants expected
  left join live_column_grants live
    on live.table_name = expected.table_name
   and live.column_name = expected.column_name
  where live.column_name is null
  union all
  select live.table_name || '.' || live.column_name as grant_ref
  from live_column_grants live
  left join expected_column_grants expected
    on expected.table_name = live.table_name
   and expected.column_name = live.column_name
  where expected.column_name is null
),
table_level_select_violations as (
  select expected.table_name
  from expected_tables expected
  where has_table_privilege(
    'authenticated',
    format('institutionlens.%I', expected.table_name),
    'select'
  )
),
required_helper_execute_violations as (
  select helper.function_name
  from (
    values
      ('accessible_tenant_ids', 'institutionlens.accessible_tenant_ids()'),
      ('own_membership_ids', 'institutionlens.own_membership_ids()'),
      ('active_member_has_roles', 'institutionlens.active_member_has_roles(uuid,text[])')
  ) helper(function_name, signature)
  where not has_function_privilege('authenticated', helper.signature, 'execute')
),
-- END_AUTHENTICATED_COLUMN_GRANT_MATRIX
withheld_columns(table_name, column_name) as (
  values
    ('provenance_records', 'private_notes'),
    ('provenance_records', 'source_reference'),
    ('organization_overlays', 'private_notes'),
    ('memberships', 'user_id')
),
schema_acl_violations as (
  select acl.grantee
  from pg_catalog.pg_namespace namespace
  cross join lateral aclexplode(
    coalesce(namespace.nspacl, acldefault('n', namespace.nspowner))
  ) acl
  left join pg_catalog.pg_roles grantee_role on grantee_role.oid = acl.grantee
  where namespace.nspname = 'institutionlens'
    and (
      acl.grantee = 0
      or grantee_role.rolname in (select role_name from denied_api_roles)
      or (
        grantee_role.rolname = 'authenticated'
        and acl.privilege_type <> 'USAGE'
      )
    )
),
relation_acl_violations as (
  -- Table-level ACLs for authenticated are forbidden: SELECT must be column-only
  -- (attacl) so withheld columns cannot be overridden by GRANT SELECT ON TABLE.
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
    and (
      acl.grantee = 0
      or grantee_role.rolname in (select role_name from denied_api_roles)
      or grantee_role.rolname = 'authenticated'
    )
),
withheld_column_privilege_violations as (
  select withheld.table_name || '.' || withheld.column_name as column_ref
  from withheld_columns withheld
  where has_column_privilege(
    'authenticated',
    format('institutionlens.%I', withheld.table_name),
    withheld.column_name,
    'select'
  )
  or has_column_privilege(
    'anon',
    format('institutionlens.%I', withheld.table_name),
    withheld.column_name,
    'select'
  )
  or has_column_privilege(
    'service_role',
    format('institutionlens.%I', withheld.table_name),
    withheld.column_name,
    'select'
  )
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
    and (
      acl.grantee = 0
      or grantee_role.rolname in (select role_name from denied_api_roles)
      or (
        grantee_role.rolname = 'authenticated'
        and (
          acl.privilege_type <> 'EXECUTE'
          or procedure.proname not in (select function_name from allowed_helper_functions)
        )
      )
    )
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
  -- Denied roles must have neither table-level nor column-level access.
  -- Authenticated SELECT is intentionally column-only, so effective read
  -- presence is proven with has_any_column_privilege rather than table SELECT.
  select role_name
  from denied_api_roles
  where has_schema_privilege(role_name, 'institutionlens', 'usage')
     or has_schema_privilege(role_name, 'institutionlens', 'create')
     or exists (
       select 1
       from expected_tables
       where has_any_column_privilege(
         role_name,
         format('institutionlens.%I', table_name),
         'select'
       )
     )
     or exists (
       select 1
       from expected_tables
       cross join (
         values
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
  union all
  select role_name
  from (values ('authenticated')) authenticated_role(role_name)
  where has_schema_privilege(role_name, 'institutionlens', 'create')
     or exists (
       select 1
       from expected_tables
       cross join (
         values
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
     or not has_schema_privilege(role_name, 'institutionlens', 'usage')
     or exists (
       select 1
       from expected_tables
       where not has_any_column_privilege(
         role_name,
         format('institutionlens.%I', table_name),
         'select'
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
    ('20260715181000'),
    ('20260715200000'),
    ('20260715210000')
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
expected_api_rpc_functions(function_name, arg_types) as (
  values
    ('organizations_get_by_public_ref', 'text, text'),
    ('organizations_get_by_domain_id', 'text, text'),
    ('organizations_list', 'text, jsonb'),
    ('organizations_count', 'text, jsonb'),
    ('evidence_list_by_organization_domain_id', 'text, text, jsonb'),
    ('comparisons_get_by_public_ref', 'text, text'),
    ('comparisons_list', 'text, jsonb'),
    ('brief_snapshots_get_by_public_ref', 'text, text'),
    ('brief_snapshots_list', 'text, jsonb')
),
api_rpc_privilege_violations as (
  select probe.violation
  from (values ('schema_missing')) as probe(violation)
  where not exists (
    select 1 from pg_catalog.pg_namespace where nspname = 'institutionlens_api'
  )
  union all
  select concat('schema_usage_', expected.role_name) as violation
  from (
    values
      ('authenticated', true),
      ('anon', false),
      ('service_role', false)
  ) as expected(role_name, should_have_usage)
  where has_schema_privilege(expected.role_name, 'institutionlens_api', 'usage')
    is distinct from expected.should_have_usage
  union all
  select concat('execute_', expected.function_name, '_', role_probe.role_name) as violation
  from expected_api_rpc_functions expected
  cross join (
    values
      ('authenticated', true),
      ('anon', false),
      ('service_role', false)
  ) as role_probe(role_name, should_execute)
  where has_function_privilege(
    role_probe.role_name,
    format(
      'institutionlens_api.%I(%s)',
      expected.function_name,
      expected.arg_types
    ),
    'execute'
  ) is distinct from role_probe.should_execute
),
expected_select_policies(policy_name) as (
  values
    ('tenants_select_authenticated'),
    ('tenant_verticals_select_authenticated'),
    ('memberships_select_authenticated'),
    ('organizations_select_authenticated'),
    ('import_runs_select_authenticated'),
    ('provenance_records_select_authenticated'),
    ('evidence_records_select_authenticated'),
    ('evidence_dependencies_select_authenticated'),
    ('assessment_runs_select_authenticated'),
    ('assessment_results_select_authenticated'),
    ('capability_results_select_authenticated'),
    ('rule_results_select_authenticated'),
    ('rule_result_evidence_select_authenticated'),
    ('organization_overlays_select_authenticated'),
    ('saved_comparisons_select_authenticated'),
    ('saved_comparison_organizations_select_authenticated'),
    ('brief_snapshots_select_authenticated'),
    ('audit_events_select_authenticated')
),
policy_differences as (
  select expected.policy_name
  from expected_select_policies expected
  left join (
    select policy.polname as policy_name
    from pg_catalog.pg_policy policy
    join pg_catalog.pg_class relation on relation.oid = policy.polrelid
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'institutionlens'
  ) actual on actual.policy_name = expected.policy_name
  where actual.policy_name is null
  union
  select actual.policy_name
  from (
    select policy.polname as policy_name
    from pg_catalog.pg_policy policy
    join pg_catalog.pg_class relation on relation.oid = policy.polrelid
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'institutionlens'
  ) actual
  left join expected_select_policies expected on expected.policy_name = actual.policy_name
  where expected.policy_name is null
),
policy_shape_violations as (
  select policy.polname as policy_name
  from pg_catalog.pg_policy policy
  join pg_catalog.pg_class relation on relation.oid = policy.polrelid
  join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'institutionlens'
    and (
      policy.polcmd <> 'r'
      or policy.polpermissive is distinct from true
      or not exists (
        select 1
        from unnest(policy.polroles) role_oid
        join pg_catalog.pg_roles role_catalog on role_catalog.oid = role_oid
        where role_catalog.rolname = 'authenticated'
      )
    )
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
  select
    'rls_policy_count',
    value = 18
      and (select count(*) from policy_differences) = 0
      and (select count(*) from policy_shape_violations) = 0,
    '18 authenticated SELECT policies',
    value::text || ' total, '
      || (select count(*) from policy_differences)::text || ' set diffs, '
      || (select count(*) from policy_shape_violations)::text || ' shape violations'
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
      + (select count(*) from withheld_column_privilege_violations)
      + (select count(*) from column_grant_matrix_violations)
      + (select count(*) from table_level_select_violations)
      + (select count(*) from required_helper_execute_violations)
      + (select count(*) from function_acl_violations)
      + (select count(*) from default_acl_violations)
      + (select count(*) from effective_role_privilege_violations)
    ) = 0,
    '0 violations',
    (
      (select count(*) from schema_acl_violations)
      + (select count(*) from relation_acl_violations)
      + (select count(*) from withheld_column_privilege_violations)
      + (select count(*) from column_grant_matrix_violations)
      + (select count(*) from table_level_select_violations)
      + (select count(*) from required_helper_execute_violations)
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
    total_count = 4 and expected_count = 4 and unexpected_count = 0,
    'exactly 20260713190000, 20260715181000, 20260715200000, 20260715210000',
    total_count::text || ' total, ' || expected_count::text
      || ' expected, ' || unexpected_count::text || ' unexpected'
  from migration_history
  union all
  select
    'api_rpc_privileges',
    count(*) = 0,
    'authenticated-only USAGE/EXECUTE on institutionlens_api RPCs',
    count(*)::text || ' violations'
  from api_rpc_privilege_violations
)
select check_name, passed, expected_value, actual_value
from checks
order by check_name;
