# Phase 9 staging Auth + local application validation

**Project:** `qzidcqtaabubvtycstwy`  
**Approved:** Owner approved Auth and local staging validation.

## Auth settings restore (safe labels)

Restored via Management API (not `supabase config push`) to the exact pre-push remote values recorded in the prior config-push diff:

| Setting label            | Restored value                        |
| ------------------------ | ------------------------------------- |
| site URL                 | `http://localhost:3000`               |
| additional redirect URLs | empty                                 |
| MFA TOTP enroll          | enabled                               |
| MFA TOTP verify          | enabled                               |
| email confirmations      | required (`mailer_autoconfirm=false`) |
| mailer OTP length        | 8                                     |
| SMTP max frequency       | 60 seconds                            |

## Migrations applied (staging only)

1. `20260716230000_phase9_api_helper_core_execute.sql` — move projection helpers into unexposed `institutionlens`, grant exact helper EXECUTE allowlist to `authenticated`, keep public RPCs `SECURITY INVOKER`
2. `20260716231000_phase9_overlay_projection_column_safe.sql` — overlay RPCs project only granted columns (avoid whole-row SELECT of withheld `private_notes`)

PostgREST continues to expose `institutionlens_api` only; core `institutionlens` remains unexposed.

## RPC smoke

`node scripts/phase-9-staging-auth-validate.mjs` — **ok: true** (pre-cleanup)

- login (password grant)
- `session_tenant_public_ref`
- `workspace_get`
- organizations / assessments / overlays / evidence
- comparisons / brief snapshots
- wrong-tenant denied/empty
- anon denied/empty

Local credentials were gitignored (`.staging-auth.local.json` / `.env.staging.local`, marker `ilstg_phase9`) and removed by cleanup.

## Local staging application validation

Boot with ignored staging env only (`IL_APP_MODE=staging`, publishable key, no `IL_DEMO_*`), then:

```text
npm run dev -- --port 3010
node scripts/phase-9-staging-app-smoke.mjs http://localhost:3010
```

Results (**ok: true**):

- health: `mode=staging`, `synthetic=false`
- real session sign-in / cookie session / sign-out deny
- Overview, Explorer, organization detail, evidence, methodology, comparison, briefs
- `data-app-mode=staging`, staging footer / live repository banner (no local-demo fallback copy)
- noindex, one H1, skip link, no private/raw leaks
- no horizontal overflow at 390×844 and 1280×800

`npm run verify` — **passed** after restoring `.env.local` to local-demo.

## Live verifier (post-cleanup)

`scripts/phase-9-live-schema-verify.sql` — **14/14 passed**, including helper allowlist EXECUTE, helpers absent from `institutionlens_api`, and seven expected migrations.

## Cleanup status

```text
node scripts/phase-9-staging-auth-validate.mjs --cleanup
```

Confirmed:

- Auth marker users: **0**
- Application marker rows (tenants, memberships, organizations, evidence, assessment runs, briefs, comparisons, audits): **0**

## Rollback rehearsal

Completed — see `docs/PHASE_9_ROLLBACK_REHEARSAL.md` (Batch 5+ helper/overlay reverse rollback, Batch 4 retained, forward restore, live verifier 14/14).

## Not done (still gated)

- Vercel Preview / production env cutover
- Git push / Production apply
