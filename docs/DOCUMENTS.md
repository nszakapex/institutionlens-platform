# Tenant document vault

**Phase:** 12 foundation  
**Routes:** `/documents`, `/api/documents/upload`, `/api/documents/link`, `/api/documents/[documentRef]/download`  
**Status:** Local-demo upload/link/download implemented. Live Postgres write RPCs are not cut over.

## Purpose

Let founding-client research teams upload private materials (research notes, prospect lists, model-interest docs, filing exports) and optionally link them to organizations before outreach. Documents are **tenant-private context**, not public evidence and not investment recommendations.

## Local-demo behavior

- Files persist under `.data/tenant-documents/<tenant>/` (gitignored).
- Metadata index is JSON beside the binary objects.
- One synthetic seed note is created on first access.
- Analysts may upload and link; viewers may read only.

## Allowlist

| Extension | Content type |
| --------- | ------------ |
| `.pdf`    | `application/pdf` |
| `.txt`    | `text/plain` |
| `.csv`    | `text/csv` |
| `.docx`   | OOXML word |
| `.xlsx`   | OOXML sheet |

Max size: 8 MiB.

## Live cutover (remaining)

1. Apply `supabase/migrations/20260811190000_phase12_tenant_documents.sql` on staging.
2. Add authenticated mutation RPCs + RLS policies (owner/analyst write; viewer read).
3. Bind storage (Supabase Storage or Vercel Blob) with tenant-scoped keys.
4. Never expose storage URLs or checksums in public marketing surfaces.

## Non-goals

- OCR / auto-scoring of uploads into Phase 4 fit points
- Public sharing or email delivery of vault files
- Stripe checkout inside the vault UI
