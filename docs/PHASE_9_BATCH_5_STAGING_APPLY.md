# Phase 9 Batch 5 staging apply record

**Project:** `qzidcqtaabubvtycstwy` (`institutionlens-platform`)  
**Approved:** Owner approved Phase 9 staging cutover (database Batch 5 RPC apply).  
**Applied:** `20260715220000_phase9_remaining_read_api_rpc.sql` via `npx supabase@2.109.1 db push --linked --yes`

## Migration history (remote = local)

1. `20260713190000`
2. `20260715181000`
3. `20260715200000`
4. `20260715210000`
5. `20260715220000`

## Live verifier (post-apply)

`scripts/phase-9-live-schema-verify.sql` — **13/13 passed**, including:

- `migration_history` — exactly five expected versions
- `api_rpc_privileges` — authenticated-only USAGE/EXECUTE on Batch 4 + Batch 5 RPCs (including `session_tenant_public_ref`)
- `application_row_count` — still **0 rows** (no Auth users or research fixtures left from prior attack cleanup)

## Rollback artifact

`supabase/rollback/20260715220000_phase9_remaining_read_api_rpc.sql` (Batch 5 functions/helpers only; Batch 4 RPCs retained).

## Remaining staging runtime cutover (not executed in this apply)

Application runtime remains **`local-demo`**. Completing live staging traffic still requires:

1. Provision Auth user(s) + active `memberships` (+ tenant/org/assessment fixtures as needed).
2. Set server-only Preview/staging env: `IL_APP_MODE=staging`, `IL_SUPABASE_URL`, `IL_SUPABASE_PROJECT_REF`, `IL_SUPABASE_PUBLISHABLE_KEY` (no demo IDs, no service-role on user path, no `NEXT_PUBLIC_SUPABASE*`).
3. Deploy Preview/staging through the normal release pipeline.
4. Smoke-test: login → `session_tenant_public_ref` / workspace → org/assessment/overlay reads.
5. Confirm fail-closed behavior (no synthetic fallback) under live mode.

See `docs/PHASE_9_BATCH_5_CUTOVER.md` and `docs/PHASE_9_BATCH_5_ROLLBACK.md`.
