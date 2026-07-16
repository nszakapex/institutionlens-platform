# Phase 9 staging Auth + local RPC validation

**Project:** `qzidcqtaabubvtycstwy`  
**Approved:** Owner approved Auth and local staging validation.

## Auth settings restore (safe labels)

Restored via Management API (not `supabase config push`) to the exact pre-push remote values recorded in the prior config-push diff:

| Setting label | Restored value |
| --- | --- |
| site URL | `http://localhost:3000` |
| additional redirect URLs | empty |
| MFA TOTP enroll | enabled |
| MFA TOTP verify | enabled |
| email confirmations | required (`mailer_autoconfirm=false`) |
| mailer OTP length | 8 |
| SMTP max frequency | 60 seconds |

## Migrations applied (staging only)

1. `20260716230000_phase9_api_helper_core_execute.sql` — move projection helpers into unexposed `institutionlens`, grant exact helper EXECUTE allowlist to `authenticated`, keep public RPCs `SECURITY INVOKER`
2. `20260716231000_phase9_overlay_projection_column_safe.sql` — overlay RPCs project only granted columns (avoid whole-row SELECT of withheld `private_notes`)

PostgREST continues to expose `institutionlens_api` only; core `institutionlens` remains unexposed.

## Smoke results

`node scripts/phase-9-staging-auth-validate.mjs` — **ok: true**

- login (password grant)
- `session_tenant_public_ref`
- `workspace_get`
- organizations / assessments / overlays / evidence
- comparisons / brief snapshots
- wrong-tenant denied/empty
- anon denied/empty
- `.env.local` remains `local-demo`

Disposable fixtures retained (`ilstg_phase9`); credentials in gitignored `.staging-auth.local.json` / `.env.staging.local`.

## Live verifier

`scripts/phase-9-live-schema-verify.sql` — **14/14 passed**, including helper allowlist EXECUTE, helpers absent from `institutionlens_api`, and seven expected migrations.

## Cleanup status

Fixtures and Auth analyst retained for local staging validation. Cleanup when done:

`node scripts/phase-9-staging-auth-validate.mjs --cleanup`

## Not done (still gated)

- Vercel Preview / production env cutover
- Browser login UI / cookie session cutover
- Git push / Production apply
