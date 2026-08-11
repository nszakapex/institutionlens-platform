-- Phase 12 foundation: tenant document vault metadata.
-- Local-demo uses filesystem storage; live bytes/storage binding is a later cutover.
-- Additive only — does not grant authenticated writes by itself.

begin;

create table institutionlens.tenant_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references institutionlens.tenants(id) on delete cascade,
  domain_document_id text not null,
  title text not null,
  original_filename text not null,
  classification text not null,
  status text not null,
  content_type text not null,
  byte_size integer not null,
  organization_id uuid null,
  storage_key text not null,
  checksum_sha256 text not null,
  uploaded_by_principal_id text not null,
  notes text null,
  synthetic boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint tenant_documents_tenant_id_id_key unique (tenant_id, id),
  constraint tenant_documents_tenant_domain_id_key unique (tenant_id, domain_document_id),
  constraint tenant_documents_domain_document_id_format check (
    domain_document_id ~ '^doc_[a-z0-9_]{1,48}$'
  ),
  constraint tenant_documents_title_length check (char_length(title) between 1 and 160),
  constraint tenant_documents_filename_length check (
    char_length(original_filename) between 1 and 180
  ),
  constraint tenant_documents_classification check (
    classification in (
      'research_note',
      'portfolio_list',
      'model_interest',
      'public_filing_export',
      'internal_brief_source',
      'other'
    )
  ),
  constraint tenant_documents_status check (
    status in ('uploaded', 'under_review', 'linked', 'rejected', 'archived')
  ),
  constraint tenant_documents_byte_size check (byte_size > 0 and byte_size <= 10485760),
  constraint tenant_documents_storage_key_length check (char_length(storage_key) between 1 and 240),
  constraint tenant_documents_checksum_format check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  constraint tenant_documents_notes_length check (notes is null or char_length(notes) <= 240),
  constraint tenant_documents_timestamps check (updated_at >= created_at),
  constraint tenant_documents_organization_tenant_fk foreign key (tenant_id, organization_id)
    references institutionlens.organizations(tenant_id, id)
);

create index tenant_documents_tenant_updated_idx
  on institutionlens.tenant_documents (tenant_id, updated_at desc);

alter table institutionlens.tenant_documents enable row level security;
alter table institutionlens.tenant_documents force row level security;

revoke all on table institutionlens.tenant_documents from public, anon, authenticated, service_role;

comment on table institutionlens.tenant_documents is
  'Tenant research document metadata. Byte storage and mutation RPCs are cut over separately.';

commit;
