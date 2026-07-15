# Phase 9 Batch 5 rollback

**Scope:** Remaining read API/RPC migration `20260715220000` and application mode reversal. Batch 4 narrow read RPCs (`20260715210000`) and core RLS remain unless separately rolled back.

**Status:** Rollback SQL is prepared and validated offline. No remote execution is authorized from this document alone.

## When to use

- Batch 5 RPC behavior is incorrect after an approved apply of `20260715220000`.
- Staging rehearsal must return to Batch-4-only API surface while keeping authenticated read RLS.
- Application was switched to live mode prematurely and must return to synthetic demo without dropping database objects.

## Application mode rollback (immediate, no SQL)

1. Set `IL_APP_MODE=local-demo` in the deployment environment (or local `.env.local`).
2. Remove `IL_SUPABASE_URL`, `IL_SUPABASE_PROJECT_REF`, `IL_SUPABASE_PUBLISHABLE_KEY`, and optional repository tuning vars from the runtime.
3. Retain or restore `IL_DEMO_TENANT_ID` and `IL_DEMO_PRINCIPAL_ID` for local-demo operation.
4. Redeploy or restart the application process.
5. Verify health/readiness reports local-demo mode and routes load synthetic data only.
6. Confirm production-like configuration absent: missing Supabase vars must not silently fall back to demo when `IL_APP_MODE` is `development`, `staging`, or `production`.

This path does **not** remove Batch 5 Postgres functions. Live-mode deployments that still point at Supabase will call RPCs that may exist on the database until SQL rollback is executed.

## Database rollback — remaining RPC migration only

**Artifact:** `supabase/rollback/20260715220000_phase9_remaining_read_api_rpc.sql`

**Effect:** Drops Batch 5 public RPCs (including `session_tenant_public_ref()`), projection helpers, and mapping utilities. Preserves `institutionlens_api` schema and all Batch 4 narrow read functions.

### Preconditions

- Owner approval for destructive change on the target database.
- Capture `supabase_migrations.schema_migrations` (expect five rows if Batch 5 was applied; four if not).
- Backup or point-in-time recovery plan per `docs/PRODUCTION_DATA_FOUNDATION.md` and D-023.
- No active live-mode application traffic depending on Batch 5 RPCs (roll back app mode first if needed).

### Steps

1. Stop or drain live-mode application instances using Batch 5 RPCs.
2. Run the rollback script against the target database through approved tooling (Supabase SQL editor, `psql`, or CLI — not from CI without explicit gate).
3. Confirm dropped functions: `session_tenant_public_ref`, `workspace_get`, assessment/portfolio/overlay/provenance/capability RPCs, and listed helper functions.
4. Confirm **retained** functions: Batch 4 organization/evidence/comparison/brief RPCs still exist with authenticated-only EXECUTE.
5. Remove migration version `20260715220000` from `supabase_migrations.schema_migrations` only if your operational playbook requires history alignment (follow D-023 expand/contract posture; prefer forward fix when data exists).
6. Re-run `scripts/phase-9-live-schema-verify.sql` — live verifier currently expects four applied versions until separately updated after a fifth apply/rollback cycle.

### Post-rollback verification

- `npm run validate:database` (offline contracts) passes in the repository.
- Live `api_rpc_privileges` check still passes for Batch 4 functions.
- Application on `local-demo` passes full regression suite.

## Combined rollback (Batch 5 + app)

| Step | Action                                                                |
| ---- | --------------------------------------------------------------------- |
| 1    | Set `IL_APP_MODE=local-demo`; remove live Supabase env vars; redeploy |
| 2    | Execute `20260715220000` rollback SQL on the database                 |
| 3    | Verify Batch 4 RPCs and RLS unchanged                                 |
| 4    | Document migration history and verifier output                        |

## What this rollback does not do

- Does not drop `institutionlens_api` or Batch 4 RPCs (use `20260715210000` rollback separately — destructive to entire API schema).
- Does not revert authenticated read RLS (`20260715200000`).
- Does not delete Auth users or membership rows.
- Does not revert Vercel/hosting configuration.

## Related documents

- Cutover runbook: `docs/PHASE_9_BATCH_5_CUTOVER.md`
- Batch 4 API RPC: `docs/PHASE_9_BATCH_4_API_RPC.md`
- Migration posture: D-023 in `docs/DECISIONS.md`
