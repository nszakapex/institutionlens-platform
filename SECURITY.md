# Security

## Reporting

If you discover a vulnerability in InstitutionLens Platform, email the repository owner directly. Do not file a public issue that includes exploit details, secrets, or tenant data.

Please include:

- Affected component or path
- Reproduction steps (synthetic/demo data only)
- Impact assessment
- Whether the issue is reproducible offline

## Current posture (Phase 0–7 synthetic demo)

This repository is in **synthetic demo foundation** mode through project Phase 7 (read-only organization comparison).

| Control                               | Status                                               |
| ------------------------------------- | ---------------------------------------------------- |
| Strict HTTP security headers          | Implemented for the Next.js app                      |
| Restrictive CSP (self-hosted assets)  | Implemented                                          |
| No third-party fonts/scripts/trackers | Required                                             |
| Secrets in client bundles             | Forbidden; env validation rejects unsafe exposure    |
| Demo tenant context                   | Server-only; fail closed outside `local-demo`        |
| Compare URLs                          | Opaque `oref_` refs only; authz before resolve       |
| Database / RLS                        | Not configured — **not** production tenant isolation |
| Real authentication provider          | Not configured                                       |
| Production deployment                 | **Forbidden** while demo auth is in place            |

## Claims discipline

Do **not** claim encryption-at-rest, SOC 2, HIPAA, or production-grade multi-tenant isolation until those controls exist, are verified, and are documented.

Preferred future path (not configured here): Supabase Auth + PostgreSQL Row Level Security, subject to a separate architecture and security review.

## Safe defaults

- Parameterized data access when a database is introduced
- No `dangerouslySetInnerHTML`
- SVGs served as static assets (not inlined in a way that weakens CSP)
- Minimal `/api/health` response (no secrets, versions of internal deps, filesystem paths, tenant ids, timestamps, or stack traces)
- Health never reports `productionReady: true` while demo authentication is active
- Redacted logging (no evidence payloads or credentials at info level)
- Synthetic-only fixtures for tests; no external network in deterministic tests after dependency install

## Content Security Policy

Phase 0–1 uses a **nonce-based CSP** applied in `src/proxy.ts`:

- `default-src 'self'`
- `script-src 'self' 'nonce-…' 'strict-dynamic'` (no `unsafe-eval`)
- `style-src 'self' 'unsafe-inline'` — **temporary practical allowance**
- `font-src 'self'` / `img-src 'self' data:` / `connect-src 'self'`
- `object-src 'none'` / `frame-ancestors 'none'` / `base-uri 'self'` / `form-action 'self'`

### Why `style-src 'unsafe-inline'` is currently required

Next.js App Router may emit inline style attributes for framework/runtime styling during this scaffold phase. Removing `'unsafe-inline'` from `style-src` without a nonce/hash strategy for every inline style breaks the foundation page. Scripts remain nonce-restricted; we deliberately do **not** allow `unsafe-eval`, wildcard hosts, remote fonts, remote images, or a broad `connect-src`.

A stricter style policy (nonces/hashes or zero inline styles) is deferred until a dedicated hardening pass.

## Data classes

Keep separate: public marketing (other repo), authenticated application, customer/tenant data (future), vertical-specific data, public-source evidence, restricted internal evidence, **synthetic demo data**, and generated outputs.

Synthetic demo data is rebuildable and disposable. It must never be presented as live customer or institutional truth.
