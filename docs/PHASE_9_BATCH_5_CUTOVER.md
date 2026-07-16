# Phase 9 Batch 5 controlled cutover runbook

**Status:** Staging database Batch 5 RPC **applied** on `qzidcqtaabubvtycstwy` (see `docs/PHASE_9_BATCH_5_STAGING_APPLY.md`). Application runtime remains `local-demo` until Auth fixtures + live Preview env are provisioned.

**Depends on:** Applied migrations `20260713190000` … `20260715220000` on the target Supabase project; Auth users and memberships managed outside this repository.

**Does not include:** deployment from this runbook alone, Vercel promotion, production customer data, billing, or silent fallback to synthetic fixtures.

## Modes

| `IL_APP_MODE` | Data source                          | Auth / tenant binding                                                                 | Fallback                                               |
| ------------- | ------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `local-demo`  | Synthetic repository bundle only     | Explicit server-only demo tenant/principal env vars                                   | None to live data                                      |
| `development` | Supabase Postgres via server gateway | Supabase Auth session → `session_tenant_public_ref()` → `p_tenant_public_ref` on RPCs | **Forbidden** — missing config or gateway fails closed |
| `staging`     | Same as development                  | Same as development                                                                   | **Forbidden**                                          |
| `production`  | Same as development                  | Same as development                                                                   | **Forbidden**                                          |

Production-like modes require a complete, validated server-only configuration. They must never import synthetic loaders, never accept client tenant selection, and never use privileged Supabase credentials on the user request path.

## Required environment (publishable only)

Set these **server-only** variables for live modes. Names and descriptions only — never commit values.

| Variable                           | Purpose                                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| `IL_APP_MODE`                      | `development`, `staging`, or `production` for live cutover; `local-demo` to stay on synthetic data |
| `IL_SUPABASE_URL`                  | HTTPS project origin (`https://<project-ref>.supabase.co`)                                         |
| `IL_SUPABASE_PROJECT_REF`          | 20-character lowercase project reference                                                           |
| `IL_SUPABASE_PUBLISHABLE_KEY`      | Server-only publishable (anon-class) key for authenticated user gateway                            |
| `IL_REPOSITORY_REQUEST_TIMEOUT_MS` | Optional bounded request timeout (default 5000)                                                    |
| `IL_REPOSITORY_MAX_PAGE_SIZE`      | Optional page-size cap (≤ 50)                                                                      |

### Forbidden configuration

- `NEXT_PUBLIC_SUPABASE*` or any browser-exposed Supabase credential
- `IL_SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, anon keys on the user path, or direct database URLs
- Mixed demo + production variables (`IL_DEMO_*` together with `IL_SUPABASE_*`)
- `IL_APP_MODE=local-demo` with `NODE_ENV=production`
- Client-supplied tenant IDs, tenant public refs in query strings, or service-role impersonation for end-user reads

Configuration validation is fail-closed: invalid or partial settings deny data access with stable issue codes only (no secret values in errors).

## External prerequisites (not performed by this runbook)

1. **Supabase Auth users and memberships** — create invite/signup flows, disable inactive users, and insert `memberships` rows through approved operational tooling. The application does not seed production identities.
2. **Apply remaining RPC migration** — **done on staging** after owner approval (`20260715220000` via linked `db push`).
3. **Live verifier** — re-run `scripts/phase-9-live-schema-verify.sql` on the target database. Staging post-apply: **13/13** with five migration versions.
4. **Repository regression** — replay repository contract and security tests against staging with disposable Auth fixtures before any production cutover.

## Cutover sequence (staging rehearsal)

1. Confirm staging history contains the four applied Batch 1–4 migrations and **does not** yet include `20260715220000` unless that push was separately approved.
2. Apply `20260715220000` externally; verify rollback artifact exists at `supabase/rollback/20260715220000_phase9_remaining_read_api_rpc.sql`.
3. Provision disposable Auth user + membership; confirm `session_tenant_public_ref()` returns exactly one active tenant ref.
4. Set staging env to live mode with publishable-only keys; deploy application build through the normal release pipeline (**not** from this doc alone).
5. Smoke-test: login → workspace context → one organization, assessment, portfolio, and overlay read via gateway RPCs.
6. Confirm no synthetic fallback: temporarily remove gateway injection in a throwaway branch must fail closed, not load fixtures.
7. Record verifier output, test counts, and migration version list.

## Application rollback (fast)

Set `IL_APP_MODE=local-demo`, remove live Supabase variables from the runtime environment, redeploy or restart, and confirm health checks report synthetic demo mode. This does **not** revert database RPCs.

## Database RPC rollback

If Batch 5 RPC must be removed while keeping Batch 4 narrow reads, execute the rollback SQL externally:

`supabase/rollback/20260715220000_phase9_remaining_read_api_rpc.sql`

This drops Batch 5 functions and helpers only; it does not drop the `institutionlens_api` schema or Batch 4 functions. See `docs/PHASE_9_BATCH_5_ROLLBACK.md`.

## Stop gates

Stop for owner approval before:

- applying `20260715220000` to **production** (staging apply already approved and recorded);
- promoting live mode to production traffic;
- switching Vercel Preview/Production from `local-demo` to `staging`/`production` without Auth fixtures;
- storing real customer data;
- reconnecting Vercel or changing DNS;
- using service-role credentials on user-facing request paths.

## Related artifacts

- Offline remaining RPC contract: `scripts/phase-9-remaining-api-rpc-contract.ts`
- Auth session binding: `src/authorization/session-context.ts`
- Gateway transport: `src/repositories/supabase-postgres/gateway.ts`
- Rollback steps: `docs/PHASE_9_BATCH_5_ROLLBACK.md`
- Traceability: `docs/PHASE_9_REQUIREMENTS_TRACEABILITY.md`
