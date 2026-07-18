# Phase 11 requirements traceability

**Phase:** Public website and founding-client access  
**Plan:** `docs/PHASE_11_PLAN.md`

| ID     | Requirement                                         | Status      | Artifacts                                                      | Notes                                                           |
| ------ | --------------------------------------------------- | ----------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| P11-01 | Plan + ADR D-030 + traceability                     | Implemented | `PHASE_11_PLAN.md`; D-030; this file                           |                                                                 |
| P11-02 | Public marketing routes                             | Implemented | `src/app/(marketing)/**`                                       | `/`, `/product`, `/how-it-works`, `/pricing`, `/request-access` |
| P11-03 | Authenticated `/app` entry                          | Implemented | `src/app/(app)/app/page.tsx`                                   | Overview relocated from `/`                                     |
| P11-04 | Keep research routes stable                         | Implemented | Existing `(app)` pages                                         | No mass `/app/organizations` rewrite                            |
| P11-05 | Marketing vs workspace layouts                      | Implemented | Marketing shell + `AppShell`                                   | One token system                                                |
| P11-06 | Founding pricing copy                               | Implemented | `/pricing`                                                     | $200 + $99/mo; no invented guarantees                           |
| P11-07 | Truthful request-access                             | Implemented | `/request-access`; `IL_FOUNDING_CONTACT_URL`                   | No fake submit                                                  |
| P11-08 | Login return-path safety                            | Implemented | `src/lib/safe-return-path.ts`; `LoginForm`                     | Open-redirect guarded                                           |
| P11-09 | Signed-out `/app` fail closed                       | Implemented | `(app)/layout.tsx` + error UX                                  | Auth required                                                   |
| P11-10 | Indexing split                                      | Implemented | `headers.ts`; `proxy.ts`; `next.config.ts`; marketing metadata | Workspace remains noindex                                       |
| P11-11 | Privacy: no raw IDs / private notes on public pages | Implemented | Marketing copy + contracts                                     | Synthetic fixture details withheld                              |
| P11-12 | Founding onboarding checklist (docs only)           | Implemented | `FOUNDING_CLIENT_ONBOARDING_CHECKLIST.md`                      | No real users created                                           |
| P11-13 | Focused tests + verify                              | Implemented | marketing/routing/auth/metadata tests                          | See verification section                                        |
| P11-14 | Browser coverage evidence                           | Implemented | Recorded below                                                 | Widths + zoom + auth denial                                     |

## Conflicts and resolution

| Conflict                                 | Resolution                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| `(app)/page.tsx` owned `/`               | Moved overview to `/app`; marketing takes `/`                             |
| Sitewide `noindex` blocked marketing SEO | Path-based robots header + public metadata on marketing routes            |
| README said marketing is out of repo     | Phase 11 absorbs public product pages; research workspace remains private |

No material blocker required stopping the phase.

## Verification record

- `npm run format:check`, `lint`, `typecheck` — passed via `npm run verify`
- Focused Phase 11 suite (`npm run test:phase11`) — 24/24 passed
- Full vitest — passed (pre-browser-fix verify: 400/400; layout fail-soft added after)
- Security/privacy + raw-ID / clean-room / asset scans — passed
- `npm run verify` (includes production `next build`) — passed
- Browser checks (local-demo, Playwright against `localhost:3011`):
  - Routes `/`, `/product`, `/how-it-works`, `/pricing`, `/request-access`, `/login`, `/app`
  - Widths 320, 375, 768, 1024, 1440, 1920 — all HTTP 200; one H1; skip link; `#main`; no page-level overflow; no raw/private-value leaks
  - Actual 200% zoom via CDP `Emulation.setPageScaleFactor` at 320 and 1024 — no page-level overflow
  - Public nav Product link works; malicious `returnTo` not present in anchors/forms
  - Indexing: marketing omits `X-Robots-Tag`; `/app`, `/login`, `/organizations` send `noindex, nofollow, noarchive`; `robots.txt` allow/disallow split correct
  - Signed-out live `/app` denial covered by `(app)/layout` redirect + contract tests (local-demo intentionally loads overview)

## Deferred external decisions (before live launch)

1. Reconnect hosting / DNS (Vercel or other) under a separate owner-approved cutover
2. Provision founding Auth users + memberships on staging/production
3. Set `IL_FOUNDING_CONTACT_URL` to the real booking/contact channel
4. Legal review of public pricing and privacy copy
5. Production env cutover from `local-demo` (still gated)
