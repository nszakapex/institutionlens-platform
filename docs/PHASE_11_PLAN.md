# Phase 11 — Public website and founding-client access

**Status:** Implemented locally (code-only). No Vercel reconnect, deploy, Auth provisioning, payments, or live-source ingestion.  
**Depends on:** Phases 4–10 (methodology, privacy, RLS/Auth, offline ETL foundation).

## Goal

Package InstitutionLens as one coherent product:

1. A public, professional marketing website for discovery.
2. A truthful invitation-only founding-client access path.
3. An authenticated workspace entry at `/app` that lands in the existing research experience.

## Non-goals

- Self-service signup, payments, billing, email delivery, CRM
- Public sharing, customer provisioning, production deployment
- Live-source ingestion or Phase 10 connector activation
- Reconnecting Vercel or changing Supabase/Auth configuration
- Moving research routes under `/app/**` (kept at existing paths)

## Route map

| Route                                                                   | Audience         | Auth           | Indexing    |
| ----------------------------------------------------------------------- | ---------------- | -------------- | ----------- |
| `/`                                                                     | Public           | None           | Indexable   |
| `/product`                                                              | Public           | None           | Indexable   |
| `/how-it-works`                                                         | Public           | None           | Indexable   |
| `/pricing`                                                              | Public           | None           | Indexable   |
| `/request-access`                                                       | Public           | None           | Indexable   |
| `/login`                                                                | Public (sign-in) | Session create | **noindex** |
| `/app`                                                                  | Founding clients | Required       | **noindex** |
| `/organizations`, `/evidence`, `/compare`, `/briefs`, `/methodology`, … | Founding clients | Required       | **noindex** |

## Architecture decisions

- **Conflict resolved:** Overview moved from `/` to `/app`. Marketing owns `/`. Research routes stay at existing absolute paths to avoid a disruptive migration.
- Marketing uses `(marketing)` layout; research retains `(app)` auth gate + `AppShell`.
- Global `X-Robots-Tag: noindex` is path-split: workspace/login/API remain noindex; marketing routes omit that header and set public metadata robots.
- Optional server-only `IL_FOUNDING_CONTACT_URL` may power an external contact/booking link on `/request-access`. If unset, the page shows an honest non-submitting state (no fake form).
- Login accepts a guarded `returnTo` query; open redirects are rejected.

## Founding offer (public copy only)

- One-time setup: **$200**
- Monthly: **$99**
- Invitation-only; no seat counts, outcome guarantees, customer logos, or invented contract terms.

## Related

- ADR D-030 in `docs/DECISIONS.md`
- Phase 11.1A visual-system addendum: `docs/PHASE_11_1_VISUAL_SYSTEM.md`
- Traceability: `docs/PHASE_11_REQUIREMENTS_TRACEABILITY.md`
- Onboarding checklist: `docs/FOUNDING_CLIENT_ONBOARDING_CHECKLIST.md`
