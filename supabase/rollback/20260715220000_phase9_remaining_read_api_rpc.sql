-- Rollback for Phase 9 Batch 5 remaining read API/RPC functions only.
-- Does not drop institutionlens_api schema or Batch 4 functions.
begin;

drop function if exists institutionlens_api.overlays_get_by_domain_id(text, text);
drop function if exists institutionlens_api.overlays_list(text, jsonb);
drop function if exists institutionlens_api.overlays_get_by_organization_domain_id(text, text);
drop function if exists institutionlens_api.portfolios_get_by_domain_id(text, text);
drop function if exists institutionlens_api.portfolios_list(text, jsonb);
drop function if exists institutionlens_api.assessments_get_opportunity_context(text, text, text);
drop function if exists institutionlens_api.assessments_get_manifest(text, text);
drop function if exists institutionlens_api.assessments_get_ledger(text, text);
drop function if exists institutionlens_api.assessments_get_capability_by_domain_id(text, text);
drop function if exists institutionlens_api.assessments_list_capabilities(text, jsonb);
drop function if exists institutionlens_api.assessments_get_portfolio_by_domain_id(text, text);
drop function if exists institutionlens_api.assessments_list_portfolios(text, jsonb);
drop function if exists institutionlens_api.capabilities_list(text, jsonb);
drop function if exists institutionlens_api.provenance_get_by_domain_id(text, text);
drop function if exists institutionlens_api.workspace_get(text);
drop function if exists institutionlens_api.session_tenant_public_ref();

drop function if exists institutionlens_api.project_ledger_entry(
  institutionlens.rule_results,
  text,
  text,
  text
);
drop function if exists institutionlens_api.project_portfolio_assessment(
  institutionlens.assessment_runs,
  institutionlens.assessment_results,
  institutionlens.organizations,
  text
);
drop function if exists institutionlens_api.project_capability_assessment(
  institutionlens.assessment_runs,
  institutionlens.capability_results,
  institutionlens.organizations,
  text
);
drop function if exists institutionlens_api.project_overlay(
  institutionlens.organization_overlays,
  text,
  text,
  text
);
drop function if exists institutionlens_api.project_provenance(
  institutionlens.provenance_records,
  text
);
drop function if exists institutionlens_api.build_fit_assessment(text, integer, integer, text);
drop function if exists institutionlens_api.project_rule_id(text);
drop function if exists institutionlens_api.project_ledger_entry_id(text);
drop function if exists institutionlens_api.project_overlay_id(text);
drop function if exists institutionlens_api.project_portfolio_id(text);
drop function if exists institutionlens_api.project_rule_set_id(text);
drop function if exists institutionlens_api.project_capability_id(text);
drop function if exists institutionlens_api.synthesize_portfolio_assessment_id(text);
drop function if exists institutionlens_api.synthesize_capability_assessment_id(text, text);
drop function if exists institutionlens_api.capability_short(text);
drop function if exists institutionlens_api.pad_org_key(text);
drop function if exists institutionlens_api.map_provenance_source_type(text);
drop function if exists institutionlens_api.map_provenance_license_status(text);
drop function if exists institutionlens_api.map_provenance_access_classification(text);
drop function if exists institutionlens_api.map_tenant_workspace_status(text);
drop function if exists institutionlens_api.derive_principal_domain_id(text);
drop function if exists institutionlens_api.derive_tenant_domain_id(text);

commit;
