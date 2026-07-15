-- DESTRUCTIVE: approved disposable local/staging rollback only.
-- Removes authenticated read RLS policies and grants, restoring the fail-closed
-- Batch 1 posture (RLS forced, zero allow policies, no API-role table access).
-- Does not drop the institutionlens schema or application tables.
-- Never run after customer or non-disposable data depends on authenticated reads.
begin;

drop policy if exists tenants_select_authenticated on institutionlens.tenants;
drop policy if exists tenant_verticals_select_authenticated on institutionlens.tenant_verticals;
drop policy if exists memberships_select_authenticated on institutionlens.memberships;
drop policy if exists organizations_select_authenticated on institutionlens.organizations;
drop policy if exists import_runs_select_authenticated on institutionlens.import_runs;
drop policy if exists provenance_records_select_authenticated on institutionlens.provenance_records;
drop policy if exists evidence_records_select_authenticated on institutionlens.evidence_records;
drop policy if exists evidence_dependencies_select_authenticated on institutionlens.evidence_dependencies;
drop policy if exists assessment_runs_select_authenticated on institutionlens.assessment_runs;
drop policy if exists assessment_results_select_authenticated on institutionlens.assessment_results;
drop policy if exists capability_results_select_authenticated on institutionlens.capability_results;
drop policy if exists rule_results_select_authenticated on institutionlens.rule_results;
drop policy if exists rule_result_evidence_select_authenticated on institutionlens.rule_result_evidence;
drop policy if exists organization_overlays_select_authenticated on institutionlens.organization_overlays;
drop policy if exists saved_comparisons_select_authenticated on institutionlens.saved_comparisons;
drop policy if exists saved_comparison_organizations_select_authenticated
  on institutionlens.saved_comparison_organizations;
drop policy if exists brief_snapshots_select_authenticated on institutionlens.brief_snapshots;
drop policy if exists audit_events_select_authenticated on institutionlens.audit_events;

revoke all on all tables in schema institutionlens from public, anon, authenticated, service_role;
revoke all on all sequences in schema institutionlens from public, anon, authenticated, service_role;
revoke all on all functions in schema institutionlens from public, anon, authenticated, service_role;
revoke all on schema institutionlens from public, anon, authenticated, service_role;

drop function if exists institutionlens.active_member_has_roles(uuid, text[]);
drop function if exists institutionlens.own_membership_ids();
drop function if exists institutionlens.accessible_tenant_ids();

commit;
