# Phase 9 staging rollback rehearsal record

**Project:** `qzidcqtaabubvtycstwy`  
**Approved:** Owner approved Phase 9 rollback rehearsal.  
**Date:** 2026-07-17

## Preconditions (captured)

- Application runtime: `IL_APP_MODE=local-demo` (no live Supabase env on default `.env.local`)
- Marker fixtures (`ilstg_phase9`): **0** tenants / organizations
- Migration history before rehearsal (7 versions):
  1. `20260713190000`
  2. `20260715181000`
  3. `20260715200000`
  4. `20260715210000`
  5. `20260715220000`
  6. `20260716230000`
  7. `20260716231000`

## Database rollback sequence (staging only)

Executed via linked `supabase db query` in reverse dependency order:

1. `supabase/rollback/20260716231000_phase9_overlay_projection_column_safe.sql`
2. `supabase/rollback/20260716230000_phase9_api_helper_core_execute.sql`
3. `supabase/rollback/20260715220000_phase9_remaining_read_api_rpc.sql`

## Mid-rehearsal verification (Batch-4-only API surface)

| Check                                                                                           | Result    |
| ----------------------------------------------------------------------------------------------- | --------- |
| Batch 5 public RPCs remaining (`session_tenant_public_ref`, assessments/portfolios/overlays, …) | **0**     |
| Batch 5 helpers in `institutionlens_api` / `institutionlens`                                    | **0 / 0** |
| Batch 4 public RPCs retained                                                                    | **9**     |
| Batch 4 projection helpers in `institutionlens_api`                                             | **7**     |
| RLS enabled + forced tables                                                                     | **18**    |

Authenticated read RLS and Batch 4 narrow-read RPCs remained intact. Application mode rollback was already satisfied by local-demo (no Vercel/env cutover involved).

## Forward restore

1. Deleted rolled-back versions from `supabase_migrations.schema_migrations` (`20260715220000`, `20260716230000`, `20260716231000`) leaving four Batch 1–4 versions.
2. Re-applied with `npx supabase@2.109.1 db push --linked --yes` (three migrations).

## Post-restore verification

- Live verifier `scripts/phase-9-live-schema-verify.sql`: **14/14 passed**
- Migration count: **7**
- `session_tenant_public_ref` present again
- Helpers in core `institutionlens` (not exposed API schema): confirmed
- Application row counts: **0**
- Offline `npm run validate:database`: **passed**

## What was not done

- No Vercel / Preview / Production env changes
- No Git push
- No production apply
- No Auth fixture re-seed (not required for SQL rollback rehearsal)
- Did not roll back Batch 4 API schema or RLS

## Related

- Runbook: `docs/PHASE_9_BATCH_5_ROLLBACK.md`
- Cutover: `docs/PHASE_9_BATCH_5_CUTOVER.md`
- Auth validation: `docs/PHASE_9_STAGING_AUTH_VALIDATION.md`
